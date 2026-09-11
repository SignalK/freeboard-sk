import { defineConfig } from 'vitest/config';

// Standalone config for the helper plugin (the server-side code compiled by
// `build:helper` into plugin/). It is plain Node, not part of the Angular app,
// so `ng test` never sees it. Run via `npm run test:helper`.
export default defineConfig({
  test: {
    root: __dirname,
    include: ['**/*.spec.ts'],
    environment: 'node'
  }
});
