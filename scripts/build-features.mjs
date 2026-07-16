// Feature-corpus bundler.
//
// Collects the hand-authored feature docs (`features/<id>.md`) and the change
// ledger (`features/changelog.json`) into a single JSON payload the webapp
// fetches at runtime, and copies feature screenshots alongside it. Emitted into
// `src/assets/` so `ng build` carries it into `public/` and `ng serve` serves it.
//
// This step performs NO parsing of the doc frontmatter/body — it only bundles
// raw strings. All parsing/compilation lives in
// `src/app/modules/features/feature-corpus.ts` (unit-tested under `test:ci`),
// so the app and its tests share one implementation.
//
// Wired as `prebuild:web` and `prestart` so the corpus is always current before
// the app is built or served.

import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  rmSync,
  existsSync
} from 'node:fs';
import { join, basename } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'features');
const OUT_DIR = join(ROOT, 'src', 'assets', 'features');
const OUT_JSON = join(ROOT, 'src', 'assets', 'features-corpus.json');
const LEDGER = join(SRC, 'changelog.json');
const CATEGORIES = join(SRC, 'categories.json');
const ASSETS = join(SRC, 'assets');

const log = (msg) => console.log(`[build-features] ${msg}`);

// Ensure the output directory exists on every path (both branches write here).
mkdirSync(join(ROOT, 'src', 'assets'), { recursive: true });

if (!existsSync(SRC)) {
  // No corpus yet — emit an empty payload so the app still loads.
  writeFileSync(
    OUT_JSON,
    JSON.stringify({ docs: [], ledger: [], categories: [] })
  );
  log(`no features/ directory — wrote empty corpus to ${OUT_JSON}`);
  process.exit(0);
}

// Docs: every features/<id>.md becomes { id, raw }. The id is the filename stem.
const docs = readdirSync(SRC)
  .filter((f) => f.endsWith('.md'))
  .sort()
  .map((f) => ({
    id: basename(f, '.md'),
    raw: readFileSync(join(SRC, f), 'utf8')
  }));

// Ledger: parsed here only to fail the build early on invalid JSON.
let ledger = [];
if (existsSync(LEDGER)) {
  try {
    ledger = JSON.parse(readFileSync(LEDGER, 'utf8'));
  } catch (err) {
    console.error(`[build-features] invalid ${LEDGER}: ${err.message}`);
    process.exit(1);
  }
  if (!Array.isArray(ledger)) {
    console.error(`[build-features] ${LEDGER} must be a JSON array`);
    process.exit(1);
  }
}

// Categories: the canonical, ordered list every doc must use.
let categories = [];
if (existsSync(CATEGORIES)) {
  try {
    categories = JSON.parse(readFileSync(CATEGORIES, 'utf8'));
  } catch (err) {
    console.error(`[build-features] invalid ${CATEGORIES}: ${err.message}`);
    process.exit(1);
  }
}
const categoryNames = new Set(categories.map((c) => c.name));

// Validate every doc's frontmatter `category` against that list.
const errors = [];
for (const doc of docs) {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(doc.raw);
  const match = fm && /^\s*category:\s*(.+?)\s*$/m.exec(fm[1]);
  const name = match && match[1].replace(/^["']|["']$/g, '').trim();
  if (!name) {
    errors.push(`${doc.id}.md: missing "category" in frontmatter`);
  } else if (categoryNames.size && !categoryNames.has(name)) {
    errors.push(`${doc.id}.md: unknown category "${name}"`);
  }
}
if (errors.length) {
  console.error(
    `[build-features] category validation failed:\n  ${errors.join('\n  ')}\n` +
      `Valid categories are defined in features/categories.json.`
  );
  process.exit(1);
}

writeFileSync(OUT_JSON, JSON.stringify({ docs, ledger, categories }));
log(
  `wrote ${docs.length} doc(s), ${ledger.length} ledger row(s), ` +
    `${categories.length} categories to ${OUT_JSON}`
);

// Screenshots: copy features/assets/* → src/assets/features/*
rmSync(OUT_DIR, { recursive: true, force: true });
if (existsSync(ASSETS)) {
  mkdirSync(OUT_DIR, { recursive: true });
  let n = 0;
  for (const f of readdirSync(ASSETS)) {
    copyFileSync(join(ASSETS, f), join(OUT_DIR, f));
    n++;
  }
  log(`copied ${n} screenshot(s) to ${OUT_DIR}`);
}
