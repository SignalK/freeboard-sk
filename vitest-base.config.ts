// Learn more about Vitest configuration options at https://vitest.dev/config/

import { defineConfig } from 'vitest/config';

// The armv7 (Cerbo GX) CI job runs the suite under QEMU emulation, which is
// ~10-20x slower than native and pushes the AppComponent bootstrap test past
// the 5s default. Only 32-bit ARM (process.arch === 'arm') gets the larger
// budget; native platforms keep the strict default so real hangs still surface.
const EMULATED_ARM = process.arch === 'arm';
const TEST_TIMEOUT_MS = EMULATED_ARM ? 20_000 : 5_000;
// Hooks need the same emulation allowance: a `beforeEach` that mounts a
// component is as slow under QEMU as the test body it sets up. Native keeps
// vitest's 10s default rather than inheriting the stricter 5s test budget.
const HOOK_TIMEOUT_MS = EMULATED_ARM ? 20_000 : 10_000;

export default defineConfig({
  test: {
    // Give every spec file its own module registry. Angular's vitest runner
    // defaults to `isolate: false` (one shared registry for the whole run, "to
    // align with Karma"), which makes the suite sensitive to the order files
    // happen to load in: the app has a large web of barrel (`index.ts`) import
    // cycles, so whichever spec first enters a cycle decides whether a
    // transitively-imported component resolves or is still `undefined`. An
    // `undefined` then gets baked into a component's static `ɵcmp.imports` for
    // the rest of the process, and app.component.spec — the only spec that
    // compiles the full app graph — dies walking it with "Cannot read
    // properties of undefined (reading 'ɵcmp')". Production is unaffected; it
    // bundles in a stable order. Isolation costs a few seconds and makes the
    // failure mode impossible.
    isolate: true,
    testTimeout: TEST_TIMEOUT_MS,
    hookTimeout: HOOK_TIMEOUT_MS,
    setupFiles: [
      'vitest-setup.js',
      '@vitest/web-worker'
    ]
  },
});
