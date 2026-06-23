// Learn more about Vitest configuration options at https://vitest.dev/config/

import { defineConfig } from 'vitest/config';

// The armv7 (Cerbo GX) CI job runs the suite under QEMU emulation, which is
// ~10-20x slower than native and pushes the AppComponent bootstrap test past
// the 5s default. Only 32-bit ARM (process.arch === 'arm') gets the larger
// budget; native platforms keep the strict default so real hangs still surface.
const TEST_TIMEOUT_MS = process.arch === 'arm' ? 20_000 : 5_000;

export default defineConfig({
  test: {
    testTimeout: TEST_TIMEOUT_MS,
    setupFiles: [
      'vitest-setup.js',
      '@vitest/web-worker'
    ]
  },
});
