// Curated tool → host-API parameter mapping — pure, no servers started.

const { test } = require('node:test');
const assert = require('node:assert');

const { TOOLS } = require('../src/tools');

function run(name, args) {
  const calls = [];
  const hub = { call: (...a) => calls.push(a) };
  TOOLS.find((t) => t.name === name).run(hub, args);
  return calls;
}

// For tools that make more than one call, each awaiting the last.
async function runAsync(name, args) {
  const calls = [];
  const hub = { call: async (...a) => calls.push(a) };
  await TOOLS.find((t) => t.name === name).run(hub, args);
  return calls;
}

test('fsk_publish relays only the fields it was given', () => {
  assert.deepStrictEqual(run('fsk_publish', { topic: 'x.y' }), [
    ['events.publish', { topic: 'x.y' }, { session: undefined }]
  ]);
});

test('fsk_publish passes params, scope and session through', () => {
  assert.deepStrictEqual(
    run('fsk_publish', {
      topic: 'x.y',
      params: { n: 0 },
      scope: 'extension',
      session: 's1'
    }),
    [
      [
        'events.publish',
        { topic: 'x.y', params: { n: 0 }, scope: 'extension' },
        { session: 's1' }
      ]
    ]
  );
});

test('fsk_publish keeps a falsy params payload', () => {
  assert.deepStrictEqual(
    run('fsk_publish', { topic: 'x.y', params: 0 })[0][1],
    {
      topic: 'x.y',
      params: 0
    }
  );
});

test('the overlay tools default to the scratch layer', () => {
  assert.deepStrictEqual(run('fsk_list_overlays', {}), [
    ['overlay.list', {}, { session: undefined }]
  ]);
  assert.deepStrictEqual(
    run('fsk_set_overlay_state', { values: { color: 'red' }, session: 's1' }),
    [['overlay.setState', { overlayId: 'scratch', values: { color: 'red' } }, { session: 's1' }]]
  );
});

test('fsk_set_overlay_data draws on the scratch layer and shows it', async () => {
  assert.deepStrictEqual(
    await runAsync('fsk_set_overlay_data', {
      data: { type: 'FeatureCollection', features: [] }
    }),
    [
      [
        'overlay.setData',
        {
          overlayId: 'scratch',
          source: 'scratch',
          data: { type: 'FeatureCollection', features: [] }
        },
        { session: undefined }
      ],
      [
        'overlay.setVisibility',
        { ids: ['scratch'], visible: true },
        { session: undefined }
      ]
    ]
  );
});

test('fsk_set_overlay_data leaves another overlay as it is, and omits what was not given', async () => {
  assert.deepStrictEqual(
    await runAsync('fsk_set_overlay_data', { overlayId: 'x', source: 'y', remove: [1] }),
    [['overlay.setData', { overlayId: 'x', source: 'y', remove: [1] }, { session: undefined }]]
  );
});

test('fsk_set_overlay_layer passes filter null through and omits what was not given', () => {
  assert.deepStrictEqual(
    run('fsk_set_overlay_layer', { layer: 'points', filter: null }),
    [
      [
        'overlay.setLayer',
        { overlayId: 'scratch', layer: 'points', filter: null },
        { session: undefined }
      ]
    ]
  );
});
