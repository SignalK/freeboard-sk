#!/usr/bin/env node
//
// Release-notes generator CLI. Two commands:
//
//   stamp [version]     Fill blank `since` in features/changelog.json (and, for a
//                       stable version, graduate its pre-release rows to it).
//                       Version defaults to the package.json version — the intended
//                       use is a `version` npm lifecycle hook, which re-stages the
//                       stamped ledger into the version-bump commit.
//
//   render <tag>        Print the GitHub Release body for <tag> to stdout (or to
//     [--out <file>]    --out <file>). Pure text — never touches GitHub — so
//                       `render <tag> > preview.md` is a safe dry run.
//
// All interpretation lives in lib.mjs (unit-tested); this file is only I/O.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, basename } from 'node:path';
import { createRequire } from 'node:module';
import {
  stampLedger,
  serializeLedger,
  renderNotes,
  parseCommitSubject,
  docSummary,
  previousBoundary
} from './lib.mjs';

const ROOT = process.cwd();
const LEDGER = join(ROOT, 'features', 'changelog.json');
const FEATURES = join(ROOT, 'features');

const readLedger = () =>
  existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : [];

// Let git failures surface — a broken `git log` must fail the release, not
// silently produce empty notes. (A legitimate empty result — no tags, no
// commits in range — exits 0 and returns '' without throwing.)
const git = (args) =>
  execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });

/** Read each feature doc → { title, summary } for the release-notes headings. */
function readFeatures() {
  const map = {};
  if (!existsSync(FEATURES)) return map;
  for (const f of readdirSync(FEATURES).filter((n) => n.endsWith('.md'))) {
    const raw = readFileSync(join(FEATURES, f), 'utf8');
    const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
    const fm = {};
    if (m) {
      for (const line of m[1].split(/\r?\n/)) {
        const i = line.indexOf(':');
        if (i > 0)
          fm[line.slice(0, i).trim()] = line
            .slice(i + 1)
            .trim()
            .replace(/^["']|["']$/g, '');
      }
    }
    const id = basename(f, '.md');
    map[id] = { title: fm.title || id, summary: docSummary(m ? m[2] : raw) };
  }
  return map;
}

function stampCmd(version) {
  const rows = readLedger();
  const stamped = stampLedger(rows, version);
  writeFileSync(LEDGER, serializeLedger(stamped));
  const changed = stamped.filter(
    (r, i) => (r.since ?? null) !== (rows[i]?.since ?? null)
  ).length;
  process.stderr.write(`[changelog] stamped ${changed} row(s) → ${version}\n`);
}

function renderCmd(tag, outFile) {
  const ledger = readLedger();
  const features = readFeatures();
  const tags = git(['tag', '-l', 'v*'])
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const prev = previousBoundary(tags, tag);
  const upper = tags.includes(tag) ? tag : 'HEAD';
  const range = prev ? `${prev}..${upper}` : upper;
  const commits = git(['log', range, '--no-merges', '--format=%s'])
    .split('\n')
    .filter(Boolean)
    .map(parseCommitSubject)
    .filter(Boolean);
  const body = renderNotes({ ledger, features, commits, tag });
  if (outFile) {
    writeFileSync(outFile, body);
    process.stderr.write(`[changelog] wrote release notes → ${outFile}\n`);
  } else {
    process.stdout.write(body);
  }
}

const withV = (v) => (v.startsWith('v') ? v : `v${v}`);
// Only the prerelease forms release.yml recognizes (-beta.N / -rc.N).
const VERSION_RE = /^v\d+\.\d+\.\d+(?:-(?:beta|rc)\.\d+)?$/;
const requireVersion = (v) => {
  if (!VERSION_RE.test(v)) {
    console.error(
      `[changelog] invalid version "${v}" (expected vX.Y.Z, vX.Y.Z-beta.N or vX.Y.Z-rc.N)`
    );
    process.exit(1);
  }
  return v;
};

const [cmd, arg, ...rest] = process.argv.slice(2);

if (cmd === 'stamp') {
  const require = createRequire(import.meta.url);
  const version = withV(arg || require(join(ROOT, 'package.json')).version);
  stampCmd(requireVersion(version));
} else if (cmd === 'render') {
  if (!arg) {
    console.error('usage: changelog render <tag> [--out <file>]');
    process.exit(1);
  }
  const outIdx = rest.indexOf('--out');
  if (outIdx >= 0 && !rest[outIdx + 1]) {
    console.error('usage: changelog render <tag> [--out <file>]');
    process.exit(1);
  }
  renderCmd(requireVersion(withV(arg)), outIdx >= 0 ? rest[outIdx + 1] : null);
} else {
  console.error(
    'usage: changelog <stamp [version] | render <tag> [--out <file>]>'
  );
  process.exit(1);
}
