// CI unit-test wrapper.
//
// Same Angular `@angular/build` (esbuild) non-exit issue as
// scripts/build-web.mjs, but for `ng test`: the test bundle builds, vitest
// runs and prints its summary, but the process then fails to terminate (a
// lingering esbuild service keeps the event loop alive). In CI that hangs the
// test step until the job timeout even though every test passed.
//
// This wrapper runs `ng test` and:
//   - forwards ng's exit code if it exits on its own;
//   - reads vitest's final "Test Files" summary — any "failed" -> exit 1;
//   - on an all-passed summary that does not terminate within a grace window,
//     force-exits 0.
// It only exits 0 after seeing a passing summary, so a crash with no summary
// still fails (via the hard timeout). Used by `npm run test:ci`; plain
// `npm test` is left as the normal (watch) command for local development.

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ngBin = require.resolve('@angular/cli/bin/ng.js');
const NG_ARGS = ['test'];

// Matches vitest's final summary line, e.g. "Test Files  3 passed (3)" or
// "Test Files  1 failed | 2 passed (3)".
const SUMMARY = /Test Files\s+\d+\s+(?:failed|passed)/;
const GRACE_MS = 10_000; // let ng exit on its own before we force it
const HARD_TIMEOUT_MS = 15 * 60 * 1000; // backstop if no summary ever prints

const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

const child = spawn(process.execPath, [ngBin, ...NG_ARGS], {
  stdio: ['inherit', 'pipe', 'pipe']
});

let settled = false;
let graceTimer = null;
let hardTimer = null;

const finish = (code, reason) => {
  if (settled) return;
  settled = true;
  clearTimeout(graceTimer);
  clearTimeout(hardTimer);
  if (reason) console.log(`\n[test-ci] ${reason}`);
  child.kill('SIGTERM');
  setTimeout(() => process.exit(code), 500);
};

const scan = (chunk) => {
  if (settled) return;
  for (const line of stripAnsi(chunk.toString()).split('\n')) {
    if (!SUMMARY.test(line)) continue;
    if (/failed/.test(line)) {
      finish(1, 'Tests failed.');
    } else {
      graceTimer = setTimeout(
        () => finish(0, 'Tests passed; ng test did not exit, forcing success.'),
        GRACE_MS
      );
    }
    return;
  }
};

child.stdout.on('data', (b) => {
  process.stdout.write(b);
  scan(b);
});
child.stderr.on('data', (b) => {
  process.stderr.write(b);
  scan(b);
});

child.on('exit', (code, signal) => {
  if (settled) return;
  if (signal) finish(1, `ng test terminated by signal ${signal}.`);
  else finish(code ?? 1, `ng test exited with code ${code}.`);
});
child.on('error', (err) =>
  finish(1, `Failed to start ng test: ${err.message}`)
);

hardTimer = setTimeout(
  () =>
    finish(
      1,
      `Hard timeout (${HARD_TIMEOUT_MS / 1000}s) — tests never completed.`
    ),
  HARD_TIMEOUT_MS
);
