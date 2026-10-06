#!/usr/bin/env node
//
// Feature-ledger CLI. One command:
//
//   stamp [version]     Fill blank `since` in features/changelog.json (and, for a
//                       stable version, graduate its pre-release rows to it).
//                       Version defaults to the package.json version — the intended
//                       use is a `version` npm lifecycle hook, which re-stages the
//                       stamped ledger into the version-bump commit.
//
// All interpretation lives in lib.mjs (unit-tested); this file is only I/O.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { stampLedger, serializeLedger } from './lib.mjs';

const ROOT = process.cwd();
const LEDGER = join(ROOT, 'features', 'changelog.json');

const readLedger = () =>
  existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : [];

function stampCmd(version) {
  const rows = readLedger();
  const stamped = stampLedger(rows, version);
  writeFileSync(LEDGER, serializeLedger(stamped));
  const changed = stamped.filter(
    (r, i) => (r.since ?? null) !== (rows[i]?.since ?? null)
  ).length;
  process.stderr.write(`[changelog] stamped ${changed} row(s) → ${version}\n`);
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

const [cmd, arg] = process.argv.slice(2);

if (cmd === 'stamp') {
  const require = createRequire(import.meta.url);
  const version = withV(arg || require(join(ROOT, 'package.json')).version);
  stampCmd(requireVersion(version));
} else {
  console.error('usage: changelog stamp [version]');
  process.exit(1);
}
