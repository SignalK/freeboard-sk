import { expect, describe, it, beforeEach, afterEach, vi } from 'vitest';
import { GPX, finiteOr } from './gpxlib';

/**
 * GPX.parse() delegates the XML to a web worker. `@vitest/web-worker` (in the
 * vitest setupFiles) does supply a `Worker` global, so the feature check in
 * xml2JsonInWorker passes — but the worker module itself does not load here, so
 * the promise rejects and parse() reports failure by returning false. Stub the
 * global with a Worker that answers directly, which keeps these tests on the
 * public API rather than a private seam. Every case asserts parse() did not
 * return false, so a broken stub fails loudly instead of silently testing
 * nothing.
 */
class StubWorker {
  static reply: unknown = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage() {
    queueMicrotask(() => this.onmessage?.({ data: StubWorker.reply }));
  }
  terminate() {
    /* nothing to release */
  }
}

const gpxWithBounds = (attr: Record<string, string> | null) => ({
  gpx: {
    metadata: [attr ? { bounds: [{ $: attr }] } : {}],
    wpt: [{ $: { lat: '25.77', lon: '-80.19' }, name: ['Miami'] }]
  }
});

describe('finiteOr', () => {
  it('parses a well-formed attribute', () => {
    expect(finiteOr('25.77', 90)).toBe(25.77);
    expect(finiteOr('-80.19', 180)).toBe(-80.19);
    expect(finiteOr('0', 90)).toBe(0);
  });

  // Number() answers NaN or 0 for all of these, never a nullish value, which is
  // why the `Number(x) ?? null` guard this replaced could never fire.
  it('falls back for a missing, empty or malformed attribute', () => {
    for (const bad of [undefined, null, '', '   ', 'abc', {}]) {
      expect(finiteOr(bad, 90)).toBe(90);
    }
  });

  it('falls back for a non-finite attribute', () => {
    expect(finiteOr('Infinity', 90)).toBe(90);
    expect(finiteOr('NaN', 90)).toBe(90);
  });
});

describe('GPX.parse — metadata bounds', () => {
  let gpx: GPX;

  beforeEach(() => {
    gpx = new GPX();
    vi.stubGlobal('Worker', StubWorker);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const parse = async (attr: Record<string, string> | null) => {
    StubWorker.reply = gpxWithBounds(attr);
    const ok = await gpx.parse('<gpx></gpx>');
    expect(ok).not.toBe(false);
    return { ...gpx.metadata.bounds };
  };

  it('reads a well-formed bounds element', async () => {
    expect(
      await parse({
        minlat: '25.70',
        minlon: '-80.25',
        maxlat: '25.80',
        maxlon: '-80.10'
      })
    ).toEqual({
      minLat: 25.7,
      minLon: -80.25,
      maxLat: 25.8,
      maxLon: -80.1
    });
  });

  it('keeps the accumulator sentinels for attributes that are missing', async () => {
    // minLat comes from the header; the rest fall back to the sentinels and are
    // then narrowed by the file's own waypoint.
    expect(await parse({ minlat: '25.70' })).toEqual({
      minLat: 25.7,
      minLon: -80.19,
      maxLat: 25.77,
      maxLon: -80.19
    });
  });

  it('tolerates a metadata element with no bounds', async () => {
    expect(await parse(null)).toEqual({
      minLat: 25.77,
      minLon: -80.19,
      maxLat: 25.77,
      maxLon: -80.19
    });
  });

  it('never writes NaN into the bounds', async () => {
    const bounds = await parse({
      minlat: 'abc',
      minlon: '',
      maxlat: 'Infinity',
      maxlon: 'xyz'
    });
    for (const v of Object.values(bounds)) {
      expect(Number.isNaN(v)).toBe(false);
    }
  });

  it('still derives bounds from points after a malformed bounds element', async () => {
    // The whole point of the fix: a NaN here would make every updateBounds()
    // comparison false, so the file's own points could never narrow the box.
    expect(
      await parse({ minlat: 'abc', minlon: '', maxlat: 'abc', maxlon: '' })
    ).toEqual({
      minLat: 25.77,
      minLon: -80.19,
      maxLat: 25.77,
      maxLon: -80.19
    });
  });
});
