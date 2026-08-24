import { expect, describe, it, beforeEach } from 'vitest';
import { GPX, finiteOr } from './gpxlib';

describe('finiteOr', () => {
  it('parses a well-formed attribute', () => {
    expect(finiteOr('25.77', 90)).toBe(25.77);
    expect(finiteOr('-80.19', 180)).toBe(-80.19);
    expect(finiteOr('0', 90)).toBe(0);
  });

  it('falls back for a missing, empty or malformed attribute', () => {
    for (const bad of [undefined, null, '', '   ', 'abc', {}]) {
      expect(finiteOr(bad, 90)).toBe(90);
    }
  });

  it('covers what the previous `Number(x) ?? null` guard could not', () => {
    // Number() returns NaN or 0 for bad input, never null or undefined, so the
    // nullish fallback never fired. A malformed attribute became NaN, and a
    // null or empty one silently became a valid-looking latitude of 0.
    expect(Number(undefined as never)).toBeNaN();
    expect(Number('abc')).toBeNaN();
    expect(Number(null as never)).toBe(0);
    expect(Number('')).toBe(0);
  });

  it('falls back for a non-finite attribute', () => {
    expect(finiteOr('Infinity', 90)).toBe(90);
    expect(finiteOr('NaN', 90)).toBe(90);
  });
});

// A NaN reaching the bounds is unrecoverable: every comparison in
// updateBounds() against NaN is false, so the accumulator can never narrow and
// the file exports as minlat="NaN".
describe('GPX.applyBounds', () => {
  let gpx: GPX;
  // applyBounds is private; exercise the real code path rather than faking it.
  const apply = (attr: Record<string, unknown> | null) =>
    (gpx as unknown as { applyBounds: (b: unknown) => void }).applyBounds(
      attr === null ? undefined : { $: attr }
    );

  beforeEach(() => {
    gpx = new GPX();
  });

  it('reads a well-formed bounds element', () => {
    apply({
      minlat: '25.70',
      minlon: '-80.25',
      maxlat: '25.80',
      maxlon: '-80.10'
    });
    expect({ ...gpx.metadata.bounds }).toEqual({
      minLat: 25.7,
      minLon: -80.25,
      maxLat: 25.8,
      maxLon: -80.1
    });
  });

  it('keeps the accumulator sentinels for attributes that are missing', () => {
    apply({ minlat: '25.70' });
    expect({ ...gpx.metadata.bounds }).toEqual({
      minLat: 25.7,
      minLon: 180,
      maxLat: -90,
      maxLon: -180
    });
  });

  it('tolerates an absent bounds element', () => {
    apply(null);
    expect({ ...gpx.metadata.bounds }).toEqual({
      minLat: 90,
      minLon: 180,
      maxLat: -90,
      maxLon: -180
    });
  });

  it('never writes NaN into the bounds', () => {
    apply({ minlat: 'abc', minlon: '', maxlat: 'Infinity', maxlon: 'xyz' });
    for (const v of Object.values(gpx.metadata.bounds)) {
      expect(Number.isNaN(v)).toBe(false);
    }
  });

  it('still derives bounds from points after a malformed bounds element', () => {
    apply({ minlat: 'abc', minlon: '', maxlat: 'abc', maxlon: '' });
    gpx.updateBounds({ lat: 25.77, lon: -80.19 });
    expect({ ...gpx.metadata.bounds }).toEqual({
      minLat: 25.77,
      minLon: -80.19,
      maxLat: 25.77,
      maxLon: -80.19
    });
  });
});
