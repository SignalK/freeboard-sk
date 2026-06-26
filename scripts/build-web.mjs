// Production build wrapper.
//
// Works around an Angular `@angular/build:application` (esbuild) behaviour
// where, for some dependency graphs, `ng build` finishes a SUCCESSFUL build
// — it prints "Application bundle generation complete" and writes the output
// — but the process then fails to terminate (a lingering esbuild service
// keeps the event loop alive). In CI that hangs the build step until the job
// timeout and reports a false failure, even though the bundle is correct.
//
// This wrapper runs the exact same `ng build` and:
//   - if ng exits on its own, it forwards ng's exit code unchanged;
//   - if ng reports failure, it exits non-zero;
//   - if ng reports success but then does not exit within a short grace
//     window, it VERIFIES the output exists and exits 0 (it never declares
//     success on a timeout alone, so a genuinely stalled/broken build still
//     fails).
//
// Used by `npm run build:web`. Behaviour is identical for a normally-exiting
// build; it only changes the non-exit case.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const ngBin = require.resolve('@angular/cli/bin/ng.js');
const NG_ARGS = ['build', '-c', 'production', '--output-hashing', 'all'];

const OUTPUT_INDEX = join(process.cwd(), 'public', 'index.html');
const COMPLETE = 'Application bundle generation complete';
const FAILED = 'Application bundle generation failed';
const GRACE_MS = 10_000; // let ng exit on its own before we force it
const HARD_TIMEOUT_MS = 10 * 60 * 1000; // backstop if "complete" never prints

const child = spawn(process.execPath, [ngBin, ...NG_ARGS], {
  stdio: ['inherit', 'pipe', 'pipe']
});

let settled = false;
let graceTimer = null;
let hardTimer = null;
let failTimer = null;

const finish = (code, reason) => {
  if (settled) return;
  settled = true;
  clearTimeout(graceTimer);
  clearTimeout(hardTimer);
  clearTimeout(failTimer);
  if (reason) console.log(`\n[build-web] ${reason}`);
  child.kill('SIGTERM');
  // Give the kill a moment to propagate, then exit deterministically.
  setTimeout(() => process.exit(code), 500);
};

const scan = (text) => {
  if (settled) return;
  if (text.includes(FAILED)) {
    // ng build prints its detailed errors AFTER this summary line and then
    // hangs. Wait briefly so those errors flush to the console before exiting,
    // otherwise the developer only sees "failed" with no cause.
    if (!failTimer) {
      failTimer = setTimeout(
        () =>
          finish(
            1,
            'ng build failed — see the errors above. A "Could not resolve" / ' +
              '"Cannot find module" usually means a missing dependency (try `npm install`).'
          ),
        3000
      );
    }
  } else if (text.includes(COMPLETE)) {
    graceTimer = setTimeout(() => {
      if (existsSync(OUTPUT_INDEX)) {
        finish(
          0,
          `Build complete and output verified (${OUTPUT_INDEX}); ng build did not exit, forcing success.`
        );
      } else {
        finish(
          1,
          `Build reported complete but output is missing (${OUTPUT_INDEX}).`
        );
      }
    }, GRACE_MS);
  }
};

child.stdout.on('data', (b) => {
  process.stdout.write(b);
  scan(b.toString());
});
child.stderr.on('data', (b) => {
  process.stderr.write(b);
  scan(b.toString());
});

// ng exited by itself — forward its result verbatim.
child.on('exit', (code, signal) => {
  if (settled) return;
  if (signal) finish(1, `ng build terminated by signal ${signal}.`);
  else finish(code ?? 1, `ng build exited with code ${code}.`);
});
child.on('error', (err) =>
  finish(1, `Failed to start ng build: ${err.message}`)
);

hardTimer = setTimeout(
  () =>
    finish(
      1,
      `Hard timeout (${HARD_TIMEOUT_MS / 1000}s) — build never completed.`
    ),
  HARD_TIMEOUT_MS
);
