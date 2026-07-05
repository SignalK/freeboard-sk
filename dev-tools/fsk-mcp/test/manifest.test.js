// Manifest shape — pure, no servers started.

const { test } = require('node:test');
const assert = require('node:assert');

const { buildManifest } = require('../src/manifest');

test('declares a version-1 background-runtime extension', () => {
  const m = buildManifest();
  assert.strictEqual(m.apiVersion, '1');
  assert.deepStrictEqual(m.requires, ['background.iframe']);
  assert.strictEqual(m.background.length, 1);

  const runtime = m.background[0];
  assert.strictEqual(runtime.type, 'iframe');
  assert.ok(runtime.url.startsWith('/plotterext/fsk-mcp/'));
  assert.ok(runtime.url.endsWith('.html'));
});

test('contributes no visible UI (headless bridge only)', () => {
  const m = buildManifest();
  assert.strictEqual(m.widgets, undefined);
  assert.strictEqual(m.panels, undefined);
  assert.strictEqual(m.buttons, undefined);
});

test('lists the driveable host capabilities as optional, not required', () => {
  const m = buildManifest();
  for (const cap of ['map', 'routes', 'resources', 'resources.filter']) {
    assert.ok(m.optional.includes(cap), `expected optional capability ${cap}`);
    assert.ok(!m.requires.includes(cap), `${cap} must not be required`);
  }
});
