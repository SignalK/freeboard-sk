/**
 * Feature corpus: parsing and compilation.
 *
 * The build step (`scripts/build-features.mjs`) bundles the hand-authored
 * `features/<id>.md` docs and the `features/changelog.json` ledger into a single
 * `features-corpus.json` payload without interpreting them. This module is the
 * single place that interprets that payload — parsing each doc's frontmatter and
 * joining it with the ledger to produce the list the Feature Browser renders.
 *
 * Kept free of Angular/DOM dependencies so it is unit-tested directly.
 */

/** One doc as bundled by the build step: its id (filename stem) and raw text. */
export interface RawFeatureDoc {
  id: string;
  raw: string;
}

export type FeatureChangeKind = 'new' | 'enhanced' | 'skip';

/** One append-only change event from `features/changelog.json`. */
export interface FeatureLedgerRow {
  feature: string | null;
  pr: number;
  kind: FeatureChangeKind;
  since?: string | null;
  /** ISO date (e.g. "2026-05-08") the change landed. */
  date?: string | null;
  /** The originating PR title (may include a `type(scope):` prefix). */
  title?: string;
  reason?: string;
}

/** A category and its chip hue, from `features/categories.json`. */
export interface CategoryDef {
  name: string;
  hue: number;
}

/** The bundled payload the app fetches at runtime. */
export interface FeatureCorpusPayload {
  docs: RawFeatureDoc[];
  ledger: FeatureLedgerRow[];
  categories?: CategoryDef[];
}

/** One PR that changed a feature — a row in the details pane's history table. */
export interface FeatureEvent {
  pr: number;
  date: string | null;
  /** PR title with any `type(scope):` prefix stripped. */
  title: string;
}

/** An image embedded in a feature body (for the details pane + image viewer). */
export interface FeatureImage {
  url: string;
  alt: string;
}

/** A feature ready for display in the browser. */
export interface CompiledFeature {
  id: string;
  title: string;
  category: string;
  /** Markdown body (rendered client-side via ngx-remark). May embed images. */
  body: string;
  /** Release the feature most recently changed in, or null if unreleased. */
  since: string | null;
  /** 'new' or 'enhanced' from the most recent non-skip event, or null. */
  latestKind: Exclude<FeatureChangeKind, 'skip'> | null;
  /** PRs that changed this feature, most recent first. */
  events: FeatureEvent[];
  /** Images embedded in the body, in order; `images[0]` is the lead figure. */
  images: FeatureImage[];
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/**
 * Split a doc into its frontmatter (flat `key: value` scalars) and markdown body.
 * The frontmatter is intentionally simple — no nested YAML — so no parser
 * dependency is needed.
 */
export function parseFeatureDoc(raw: string): {
  frontmatter: Record<string, string>;
  body: string;
} {
  const m = FRONTMATTER_RE.exec(raw);
  if (!m) {
    return { frontmatter: {}, body: raw.trim() };
  }
  const frontmatter: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf(':');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed
      .slice(idx + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
    if (key) frontmatter[key] = value;
  }
  return { frontmatter, body: m[2].trim() };
}

const IMAGE_RE = /!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g;

/**
 * Collect a body's embedded images (in order) and return the body with the
 * FIRST image removed — that one renders separately as the lead figure (flush
 * with the title); the rest stay inline where the author placed them.
 */
export function extractImages(body: string): {
  images: FeatureImage[];
  body: string;
} {
  const images: FeatureImage[] = [];
  IMAGE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = IMAGE_RE.exec(body))) images.push({ alt: m[1], url: m[2] });
  if (images.length === 0) return { images, body };
  let removed = false;
  const rest = body
    .replace(IMAGE_RE, (match) => {
      if (removed) return match;
      removed = true;
      return '';
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { images, body: rest };
}

/** Compare two `vX.Y.Z` strings; unreleased (null/blank) sorts oldest. */
export function compareSince(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  const parse = (v: string) =>
    v
      .replace(/^v/i, '')
      .split(/[.-]/)
      .map((p) => (/^\d+$/.test(p) ? Number(p) : p));
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i];
    const y = pb[i];
    // Running out of components: older when the extra part is a number
    // (2.1 < 2.1.1), but a plain release outranks its pre-release
    // (3.0.0 > 3.0.0-beta.1, where the extra part is a string).
    if (x === undefined) return typeof y === 'string' ? 1 : -1;
    if (y === undefined) return typeof x === 'string' ? -1 : 1;
    if (x === y) continue;
    if (typeof x === 'number' && typeof y === 'number') return x < y ? -1 : 1;
    return String(x) < String(y) ? -1 : 1;
  }
  return 0;
}

/**
 * Join the raw docs with the ledger into displayable features. Each feature's
 * non-skip rows become its `events` (most recent first, by date then PR); the
 * most recent row also drives `since`/`latestKind`. `skip` rows and rows for
 * unknown docs are ignored.
 */
export function compileCorpus(
  payload: FeatureCorpusPayload
): CompiledFeature[] {
  const docs = payload?.docs ?? [];
  const ledger = payload?.ledger ?? [];

  const rowsByFeature = new Map<string, FeatureLedgerRow[]>();
  for (const row of ledger) {
    if (!row || row.kind === 'skip' || !row.feature) continue;
    const rows = rowsByFeature.get(row.feature);
    if (rows) rows.push(row);
    else rowsByFeature.set(row.feature, [row]);
  }

  return docs.map((doc) => {
    const { frontmatter, body } = parseFeatureDoc(doc.raw);
    const { images, body: bodyRest } = extractImages(body);
    // Most recent change first (by date, then PR number).
    const rows = (rowsByFeature.get(doc.id) ?? [])
      .slice()
      .sort((a, b) => -compareEvent(a, b));
    // since/status reflect the most recent RELEASED change. An unreleased latest
    // event (no `since` — merged but not yet tagged) still shows in `events`, but
    // must not blank out a feature that already shipped in an earlier release.
    const latest = rows.find((r) => r.since) ?? rows[0];
    return {
      id: doc.id,
      title: frontmatter.title || doc.id,
      category: frontmatter.category || 'General',
      body: bodyRest,
      since: latest?.since ?? null,
      latestKind:
        latest && (latest.kind === 'new' || latest.kind === 'enhanced')
          ? latest.kind
          : null,
      events: rows.map((r) => ({
        pr: r.pr,
        date: r.date ?? null,
        title: stripTypePrefix(r.title ?? '')
      })),
      images
    };
  });
}

/** Chronological order of two rows: older first (by date, then PR number). */
function compareEvent(a: FeatureLedgerRow, b: FeatureLedgerRow): number {
  const da = a.date ?? '';
  const db = b.date ?? '';
  if (da !== db) return da < db ? -1 : 1;
  return a.pr - b.pr;
}

const TYPE_PREFIX_RE =
  /^\s*(feat|fix|perf|refactor|docs|test|chore|ci|build|style|revert)(\([^)]*\))?!?:\s*/i;

/** Strip a conventional-commit `type(scope):` prefix from a PR title. */
export function stripTypePrefix(title: string): string {
  return title.replace(TYPE_PREFIX_RE, '').trim();
}

export type FeatureSortColumn = 'category' | 'title' | 'since';
export type SortDirection = 'asc' | 'desc';

/** Sort a copy of the features by a column. `since` defaults to newest-first. */
export function sortFeatures(
  features: CompiledFeature[],
  column: FeatureSortColumn,
  direction: SortDirection
): CompiledFeature[] {
  const sign = direction === 'asc' ? 1 : -1;
  return [...features].sort((a, b) => {
    let cmp: number;
    if (column === 'since') {
      cmp = compareSince(a.since, b.since);
    } else {
      cmp = a[column].localeCompare(b[column], undefined, {
        sensitivity: 'base'
      });
    }
    if (cmp === 0) {
      // Title tie-break stays ascending regardless of the primary direction.
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    }
    return cmp * sign;
  });
}

/**
 * Next row index for keyboard navigation, clamped to the list bounds.
 * Returns -1 for an empty list; never wraps around.
 */
export function nextRowIndex(
  current: number,
  key: 'ArrowUp' | 'ArrowDown',
  length: number
): number {
  if (length === 0) return -1;
  const delta = key === 'ArrowDown' ? 1 : -1;
  return Math.min(Math.max(current + delta, 0), length - 1);
}

/**
 * The chip hue (0–359) for a category — the deliberate hue from
 * `categories.json` when known, else a stable hash so an unexpected category
 * still renders a consistent colour.
 */
export function categoryHue(categories: CategoryDef[], name: string): number {
  const def = categories.find((c) => c.name === name);
  if (def) return def.hue;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}

/** Case-insensitive filter over title, category, and body. */
export function filterFeatures(
  features: CompiledFeature[],
  query: string
): CompiledFeature[] {
  const q = query.trim().toLowerCase();
  if (!q) return features;
  return features.filter(
    (f) =>
      f.title.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q) ||
      f.body.toLowerCase().includes(q)
  );
}
