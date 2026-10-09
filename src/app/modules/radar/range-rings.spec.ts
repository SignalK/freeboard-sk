import { describe, expect, it } from 'vitest';
import {
  isRoundDistance,
  labelDecimals,
  radarRange,
  rangeRingScale,
  ringLabel
} from './range-rings';
import { ActiveRadar, CapabilityManifest } from './radar-api.service';

const NM = 1852;
const toNm = (m: number) => m / NM;
const toKm = (m: number) => m / 1000;
const distances = (range: number, unit: 'naut-mile' | 'kilometer') =>
  rangeRingScale(range, unit)?.distances ?? [];
const expectDistances = (actual: number[], expected: number[]) => {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 6));
};

const radar = (controls: Record<string, object>): ActiveRadar => ({
  device: { id: 'fur6424A', name: 'Furuno', brand: 'Furuno' },
  capabilities: { controls: {} } as unknown as CapabilityManifest,
  controls: new Map(Object.entries(controls))
});

describe('isRoundDistance', () => {
  it('accepts whole and half leading digits', () => {
    [0.25, 0.5, 1, 1.5, 3, 7.5, 16, 500, 2500].forEach((v) =>
      expect(isRoundDistance(v)).toBe(true)
    );
  });

  it('rejects other values', () => {
    [0.375, 0.125, 1.2, 0, -1].forEach((v) =>
      expect(isRoundDistance(v)).toBe(false)
    );
  });
});

describe('rangeRingScale', () => {
  it('puts the outer ring on the radar range', () => {
    const rings = distances(3 * NM, 'naut-mile');
    expect(rings[rings.length - 1]).toBeCloseTo(3 * NM);
  });

  it('spaces the rings at round values in the user unit', () => {
    expectDistances(distances(12 * NM, 'naut-mile').map(toNm), [3, 6, 9, 12]);
    // a quarter of 1.5 NM is 0.375, so three rings of 0.5 NM instead
    expectDistances(distances(1.5 * NM, 'naut-mile').map(toNm), [0.5, 1, 1.5]);
    expectDistances(distances(1500, 'kilometer').map(toKm), [0.5, 1, 1.5]);
    expect(rangeRingScale(1500, 'kilometer')?.unit).toBe('kilometer');
  });

  it("uses the radar's unit when the user unit gives no round spacing", () => {
    const scale = rangeRingScale(0.5 * NM, 'kilometer');
    expect(scale?.unit).toBe('naut-mile');
    expectDistances(scale.distances.map(toNm), [0.1, 0.2, 0.3, 0.4, 0.5]);
    expect(rangeRingScale(1500, 'naut-mile')?.unit).toBe('kilometer');
  });

  it('reads a range reported in whole metres as the range set', () => {
    // 1/8 NM, which radars report as 231 or 232 m
    [231, 232].forEach((range) => {
      const scale = rangeRingScale(range, 'kilometer');
      expect(scale?.unit).toBe('naut-mile');
      expect(scale.distances.map((d) => ringLabel(d, scale.unit))).toEqual([
        '0.025nmi',
        '0.05nmi',
        '0.075nmi',
        '0.1nmi',
        '0.125nmi'
      ]);
    });
  });

  it('spaces in the unit the range was set in, not one it merely matches', () => {
    // 250 m is 0.135 NM, three rings of 0.045 NM, but was set in km
    const scale = rangeRingScale(250, 'naut-mile');
    expect(scale?.unit).toBe('kilometer');
    expectDistances(scale.distances.map(toKm), [0.05, 0.1, 0.15, 0.2, 0.25]);
  });

  it('accepts whole-number spacings', () => {
    expectDistances(distances(64000, 'kilometer').map(toKm), [16, 32, 48, 64]);
  });

  it('falls back to four rings in the user unit', () => {
    const scale = rangeRingScale(1234, 'kilometer');
    expect(scale?.unit).toBe('kilometer');
    expect(scale?.distances).toHaveLength(4);
  });

  it('has no rings without a range', () => {
    expect(rangeRingScale(0, 'naut-mile')).toBeUndefined();
    expect(rangeRingScale(undefined, 'naut-mile')).toBeUndefined();
  });
});

describe('ringLabel', () => {
  it('labels every ring in the unit the rings are spaced in', () => {
    expect(ringLabel(0.1 * NM, 'naut-mile')).toBe('0.1nmi');
    expect(ringLabel(0.25 * NM, 'naut-mile')).toBe('0.25nmi');
    expect(ringLabel(3 * NM, 'naut-mile')).toBe('3nmi');
    expect(ringLabel(500, 'kilometer')).toBe('0.5km');
  });
});

describe('labelDecimals', () => {
  it('shows as many decimals as the distance needs', () => {
    expect(labelDecimals(3)).toBe(0);
    expect(labelDecimals(1.5)).toBe(1);
    expect(labelDecimals(0.75)).toBe(2);
    expect(labelDecimals(0.025)).toBe(3);
    expect(labelDecimals(1 / 3)).toBe(3);
  });
});

describe('radarRange', () => {
  it('reads the range control', () => {
    expect(radarRange(radar({ range: { value: 1852 } }))).toBe(1852);
    expect(radarRange(radar({}))).toBeUndefined();
    expect(radarRange(undefined)).toBeUndefined();
  });
});
