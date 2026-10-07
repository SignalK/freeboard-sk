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
