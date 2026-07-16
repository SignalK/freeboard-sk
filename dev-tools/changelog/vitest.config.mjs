import { defineConfig } from 'vitest/config';

// Standalone config for the dev-tools release-notes generator — plain Node,
// no Angular setup. Run via `npm run test:tools`.
export default defineConfig({
  test: {
    include: ['**/*.spec.mjs']
  }
});
