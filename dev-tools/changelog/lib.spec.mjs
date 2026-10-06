import { describe, it, expect } from 'vitest';
import { isPrerelease, stampLedger, serializeLedger } from './lib.mjs';

describe('isPrerelease', () => {
  it('detects a pre-release tag', () => {
    expect(isPrerelease('v3.0.0-beta.1')).toBe(true);
    expect(isPrerelease('v3.0.0')).toBe(false);
  });
});

describe('stampLedger', () => {
  const rows = [
    { feature: 'a', pr: 1, kind: 'new', since: 'v3.0.0-beta.1', title: 'x' },
    { feature: 'b', pr: 2, kind: 'enhanced', title: 'y' }, // blank since
    { feature: null, pr: 3, kind: 'skip', reason: 'r' }
  ];

  it('a pre-release only fills blanks (no graduation)', () => {
    const out = stampLedger(rows, 'v3.0.0-beta.5');
    expect(out[0].since).toBe('v3.0.0-beta.1');
    expect(out[1].since).toBe('v3.0.0-beta.5');
    expect(out[2]).toEqual(rows[2]); // skip untouched
  });

  it('a stable release fills blanks AND graduates its pre-releases', () => {
    const out = stampLedger(rows, 'v3.0.0');
    expect(out[0].since).toBe('v3.0.0'); // beta.1 graduated
    expect(out[1].since).toBe('v3.0.0'); // blank filled
    expect(out[2].kind).toBe('skip');
  });

  it("does not graduate another version's pre-releases", () => {
    const out = stampLedger(
      [{ feature: 'a', pr: 1, kind: 'new', since: 'v2.9.0-beta.1' }],
      'v3.0.0'
    );
    expect(out[0].since).toBe('v2.9.0-beta.1');
  });
});

describe('serializeLedger', () => {
  it('emits one canonical-order row per line', () => {
    const out = serializeLedger([
      { pr: 1, feature: 'a', title: 't', kind: 'new', since: 'v1.0.0' },
      { feature: null, pr: 2, kind: 'skip', reason: 'r' }
    ]);
    expect(out).toBe(
      '[\n' +
        '  { "feature": "a", "pr": 1, "kind": "new", "since": "v1.0.0", "title": "t" },\n' +
        '  { "feature": null, "pr": 2, "kind": "skip", "reason": "r" }\n' +
        ']\n'
    );
  });

  it('preserves unrecognized fields instead of dropping them', () => {
    const out = serializeLedger([
      { feature: 'a', pr: 1, kind: 'new', custom: 'keep-me' }
    ]);
    expect(out).toBe(
      '[\n  { "feature": "a", "pr": 1, "kind": "new", "custom": "keep-me" }\n]\n'
    );
  });
});
