// The Signal K server loads the bundle that package.json `main` names, not the
// sources the other tests import. Load it the way the server does: require()
// on the package directory (Node loads an ES module through require).

import { test } from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'node:module';
import type { Plugin } from '@signalk/server-api';
import type { PluginApp } from '../src/index.ts';

const nodeRequire = createRequire(import.meta.url);

test('the built plugin loads and starts as the Signal K server runs it', async (t) => {
  const mod = nodeRequire('..') as { default?: unknown };
  assert.strictEqual(
    typeof mod.default,
    'function',
    'default export is the plugin constructor (run npm run build first)'
  );
  const construct = mod.default as (app: PluginApp) => Plugin;

  let resolveReady: (err?: Error) => void = () => {};
  const ready = new Promise<Error | undefined>((r) => (resolveReady = r));
  const plugin = construct({
    debug: Object.assign(() => {}, { enabled: false }),
    error: () => {},
    setPluginStatus: () => resolveReady(),
    setPluginError: (m) => resolveReady(new Error(m)),
    registerResourceProvider: () => {}
  });
  t.after(() => plugin.stop());
  assert.strictEqual(plugin.id, 'fsk-mcp');

  plugin.start({ port: 3095, host: '127.0.0.1' }, () => {});
  const err = await ready;
  assert.ok(!(err instanceof Error), `bundle started: ${err?.message}`);
});
