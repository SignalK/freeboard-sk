// Release-notes generator — pure, deterministic core.
//
// No I/O here: every function takes plain data and returns plain data/strings,
// so it is fully unit-testable. The CLI (index.mjs) does the file/git reads and
// hands the results to these functions. See docs/freeboard/release-notes.md.

/** A version string carries a pre-release tag when it contains a hyphen. */
export function isPrerelease(version) {
  return typeof version === 'string' && version.includes('-');
}

/** Compare `vX.Y.Z[-pre]` strings; a release outranks its pre-releases. */
export function compareVersions(a, b) {
  if (a === b) return 0;
  const parse = (v) =>
    String(v)
      .replace(/^v/i, '')
      .split(/[.-]/)
      .map((p) => (/^\d+$/.test(p) ? Number(p) : p));
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i];
    const y = pb[i];
    if (x === undefined) return typeof y === 'string' ? 1 : -1;
    if (y === undefined) return typeof x === 'string' ? -1 : 1;
    if (x === y) continue;
    if (typeof x === 'number' && typeof y === 'number') return x < y ? -1 : 1;
    return String(x) < String(y) ? -1 : 1;
  }
  return 0;
}

/**
 * The tag that bounds the lower end of a release's range: for a STABLE tag the
 * previous *stable* tag (so the range spans all its pre-releases); for a
 * pre-release the previous tag of any kind. Null if there's no earlier tag.
 */
export function previousBoundary(tags, tag) {
  const stableTarget = !isPrerelease(tag);
  const candidates = tags
    .filter((t) => t !== tag && compareVersions(t, tag) < 0)
    .filter((t) => (stableTarget ? !isPrerelease(t) : true))
    .sort(compareVersions);
  return candidates.length ? candidates[candidates.length - 1] : null;
}

/**
 * Stamp the ledger for a release:
 *  - fill blank `since` rows with `version`;
 *  - for a STABLE release, graduate every pre-release of that version
 *    (`v3.0.0-beta.*` / `-rc.*`) to the stable `version`, so the stable notes
 *    (and the Feature Browser's "Since") absorb everything from its betas.
 * `skip` rows are untouched. Returns a new array; unchanged rows are reused.
 */
export function stampLedger(rows, version) {
  const stable = !isPrerelease(version);
  const preOfThis = `${version}-`; // e.g. "v3.0.0-" → matches v3.0.0-beta.1
  return rows.map((r) => {
    if (r.kind === 'skip') return r;
    const current = r.since ?? null;
    let next = current;
    if (!current) next = version;
    else if (stable && current.startsWith(preOfThis)) next = version;
    return next === current ? r : { ...r, since: next };
  });
}

const FIELD_ORDER = [
  'feature',
  'pr',
  'kind',
  'since',
  'date',
  'title',
  'reason',
  'note'
];

/** Serialize the ledger back to the canonical one-row-per-line JSON format,
 *  so `stamp` produces a minimal, hand-authored-looking diff. Fields outside
 *  the canonical order are preserved (appended), never dropped. */
export function serializeLedger(rows) {
  const lines = rows.map((r) => {
    const keys = [
      ...FIELD_ORDER.filter((k) => k in r),
      ...Object.keys(r).filter((k) => !FIELD_ORDER.includes(k))
    ];
    const parts = keys.map(
      (k) => `${JSON.stringify(k)}: ${JSON.stringify(r[k])}`
    );
    return `  { ${parts.join(', ')} }`;
  });
  return `[\n${lines.join(',\n')}\n]\n`;
}

const TYPE_PREFIX_RE =
  /^(feat|fix|perf|refactor|docs|test|chore|ci|build|style|revert)(\([^)]*\))?!?:\s*/i;

/** Strip a conventional-commit `type(scope):` prefix from a title. */
export function stripTypePrefix(title) {
  return String(title || '')
    .replace(TYPE_PREFIX_RE, '')
    .trim();
}

const SUBJECT_RE = /^([a-z]+)(?:\([^)]*\))?!?:\s*(.*?)(?:\s*\(#(\d+)\))?$/i;

/** Parse a squash-merge commit subject: "feat(map): title (#123)". */
export function parseCommitSubject(subject) {
  const m = SUBJECT_RE.exec(String(subject || '').trim());
  if (!m) return null;
  return {
    type: m[1].toLowerCase(),
    title: m[2].trim(),
    pr: m[3] ? Number(m[3]) : null
  };
}

/** One-line summary of a feature doc body: first sentence, images/markup stripped. */
export function docSummary(body) {
  const firstPara =
    String(body || '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // drop images
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)[0] || '';
  const oneLine = firstPara.replace(/\s+/g, ' ');
  const sentence = oneLine.match(/^(.+?[.!?])(\s|$)/);
  return (sentence ? sentence[1] : oneLine).replace(/[*_`]/g, '').trim();
}

const TYPE_HEADINGS = { fix: '🐛 Bug Fixes' };

/**
 * Render the full GitHub Release body for `tag` from the (already-stamped)
 * ledger, the feature docs, and the merged-PR commits in the tag range.
 *
 * - New Features: features with a `new` row in this release (doc title + summary).
 * - Improvements: features enhanced (only) in this release (per enhancement).
 * - Bug Fixes / Other Changes: merged PRs in range NOT present in the ledger,
 *   grouped by conventional-commit type.
 */
export function renderNotes({ ledger, features, commits, tag }) {
  const rows = ledger.filter(
    (r) => r.kind !== 'skip' && r.feature && r.since === tag
  );

  const byFeature = new Map();
  for (const r of rows) {
    const list = byFeature.get(r.feature);
    if (list) list.push(r);
    else byFeature.set(r.feature, [r]);
  }

  const newFeatures = [];
  const improvements = [];
  for (const [id, frows] of byFeature) {
    const doc = features[id] || { title: id, summary: '' };
    if (frows.some((r) => r.kind === 'new')) {
      newFeatures.push({ title: doc.title, desc: doc.summary });
    } else {
      for (const r of frows) {
        improvements.push({ title: doc.title, desc: stripTypePrefix(r.title) });
      }
    }
  }

  const ledgerPRs = new Set(ledger.map((r) => r.pr));
  const byType = new Map();
  for (const c of commits) {
    if (c.pr == null || ledgerPRs.has(c.pr)) continue;
    const key = c.type === 'fix' ? 'fix' : 'other';
    const bucket = byType.get(key);
    if (bucket) bucket.push(c);
    else byType.set(key, [c]);
  }

  const sections = [];
  if (newFeatures.length) {
    sections.push(
      '## 🚀 New Features\n\n' +
        newFeatures
          .map((n) => `- **${n.title}**${n.desc ? ` — ${n.desc}` : ''}`)
          .join('\n')
    );
  }
  if (improvements.length) {
    sections.push(
      '## ✨ Improvements\n\n' +
        improvements.map((i) => `- **${i.title}** — ${i.desc}`).join('\n')
    );
  }
  const fixList = (key, heading) => {
    const items = byType.get(key);
    if (!items || !items.length) return;
    sections.push(
      `## ${heading}\n\n` +
        items.map((c) => `- ${c.title} (#${c.pr})`).join('\n')
    );
  };
  fixList('fix', TYPE_HEADINGS.fix);
  fixList('other', '🔧 Other Changes');

  return sections.length ? `${sections.join('\n\n')}\n` : '';
}
