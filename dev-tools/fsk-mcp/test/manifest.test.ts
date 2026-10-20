// Manifest shape — pure, no servers started.

import { test } from 'node:test';
import assert from 'node:assert';

import { buildManifest } from '../src/manifest.ts';

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

test('contributes no visible UI of its own (headless bridge only)', () => {
  const m = buildManifest();
  assert.ok(!('widgets' in m));
  assert.ok(!('buttons' in m));
});

test('offers one panel, the window probe, for agents to open in windows', () => {
  const m = buildManifest();
  assert.strictEqual(m.panels.length, 1);
  const probe = m.panels[0];
  assert.strictEqual(probe.id, 'window-probe');
  assert.strictEqual(probe.type, 'iframe');
  assert.ok(probe.url.startsWith('/plotterext/fsk-mcp/'));
  assert.ok(m.optional.includes('windows'));
});

test('lists the driveable host capabilities as optional, not required', () => {
  const m = buildManifest();
  for (const cap of ['map', 'routes', 'resources', 'resources.filter']) {
    assert.ok(m.optional.includes(cap), `expected optional capability ${cap}`);
    assert.ok(!m.requires.includes(cap), `${cap} must not be required`);
  }
});

test('offers one data overlay, the scratch layer, for the overlay tools to drive', () => {
  const m = buildManifest();
  assert.ok(m.optional.includes('overlays.data'));
  assert.ok(!m.requires.includes('overlays.data'));
  assert.strictEqual(m.overlays.length, 1);
  const scratch = m.overlays[0];
  assert.strictEqual(scratch.id, 'scratch');
  assert.strictEqual(scratch.type, 'data');
  // hidden until drawn on, so it never takes a slot of the overlay budget
  assert.strictEqual(scratch.visible, false);
  assert.strictEqual(scratch.style.version, 8);
  assert.strictEqual(scratch.style.sources.scratch.type, 'geojson');
  for (const layer of scratch.style.layers) {
    assert.strictEqual(layer.source, 'scratch');
  }
});

test('offers one action, the probe, hidden until an agent shows it', () => {
  const m = buildManifest();
  assert.ok(m.optional.includes('actions'));
  assert.ok(!m.requires.includes('actions'));
  assert.strictEqual(m.actions.length, 1);
  const probe = m.actions[0];
  assert.strictEqual(probe.id, 'probe');
  assert.strictEqual(probe.visible, false);
  assert.ok(probe.targets.includes('position'));
  assert.strictEqual(probe.action.type, 'publish');
});

test('offers map.pick, so an agent can start a pick and read its answer', () => {
  const m = buildManifest();
  assert.ok(m.optional.includes('map.pick'));
  assert.ok(!m.requires.includes('map.pick'));
});
