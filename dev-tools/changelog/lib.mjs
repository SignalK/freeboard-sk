// Feature-ledger stamper — pure, deterministic core.
//
// No I/O here: every function takes plain data and returns plain data/strings,
// so it is fully unit-testable. The CLI (index.mjs) does the file reads and
// writes. See docs/dev-tools/release-notes.md.

/** A version string carries a pre-release tag when it contains a hyphen. */
export function isPrerelease(version) {
  return typeof version === 'string' && version.includes('-');
}

/**
 * Stamp the ledger for a release:
 *  - fill blank `since` rows with `version`;
 *  - for a STABLE release, graduate every pre-release of that version
 *    (`v3.0.0-beta.*` / `-rc.*`) to the stable `version`, so the Feature
 *    Browser's "Since" absorbs everything from its betas.
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
