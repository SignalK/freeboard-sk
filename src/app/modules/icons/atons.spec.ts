import { describe, it, expect } from 'vitest';
import { meteoWindBucket, METEO_WIND_MAX_KTS, getAtoNDefs } from './atons';

/**
 * `meteoWindBucket` selects the wind-barb glyph for a meteo target (#490). It
 * takes speed in m/s (Signal K native), returns null when no speed is reported,
 * 0 for calm (below the first bucket → plain windsock), else the 5-knot bucket.
 * 1 m/s ≈ 1.94384 kn.
 */
describe('meteoWindBucket (#490)', () => {
  it('returns null when no finite speed is reported', () => {
    expect(meteoWindBucket(null)).toBeNull();
    expect(meteoWindBucket(undefined)).toBeNull();
    expect(meteoWindBucket(NaN)).toBeNull();
    expect(meteoWindBucket(Infinity)).toBeNull();
  });

  it('returns 0 (windsock) below the first 5-knot bucket', () => {
    expect(meteoWindBucket(0)).toBe(0);
    expect(meteoWindBucket(2)).toBe(0); // ≈ 3.9 kn
  });

  it('rounds down to the nearest 5-knot bucket', () => {
    expect(meteoWindBucket(2.7)).toBe(5); // ≈ 5.2 kn
    expect(meteoWindBucket(6)).toBe(10); // ≈ 11.7 kn
    expect(meteoWindBucket(10)).toBe(15); // ≈ 19.4 kn
  });

  it('clamps to the maximum bucket for very high speeds', () => {
    expect(meteoWindBucket(50)).toBe(METEO_WIND_MAX_KTS); // ≈ 97 kn
  });
});

describe('getAtoNDefs — bundled wind barbs (#490)', () => {
  it('provides a barb def for every bucket, for real and virtual', () => {
    const defs = getAtoNDefs();
    for (let kts = 5; kts <= METEO_WIND_MAX_KTS; kts += 5) {
      const id = `weatherStation-${kts}`;
      expect(defs['real'][id]?.path).toContain(`${id}.svg`);
      expect(defs['virtual'][id]?.path).toContain(`${id}.svg`);
    }
  });
});
