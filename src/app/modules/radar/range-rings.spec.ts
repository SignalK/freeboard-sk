import { describe, expect, it } from 'vitest';
import {
  isRadarInStandby,
  isRoundDistance,
  labelDecimals,
  radarRange,
  rangeRingDistances
} from './range-rings';
import { ActiveRadar, CapabilityManifest } from './radar-api.service';

const NM = 1852;
const toNm = (m: number) => m / NM;
const toKm = (m: number) => m / 1000;
const expectDistances = (actual: number[], expected: number[]) => {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 6));
};

const radar = (controls: Record<string, object>): ActiveRadar => ({
  device: { id: 'fur6424A', name: 'Furuno', brand: 'Furuno' },
  capabilities: {
    controls: {
      power: {
        id: 0,
        name: 'Power',
        description: '',
        category: 'base',
        dataType: 'number',
        descriptions: {
          0: 'Off',
          1: 'Standby',
          2: 'Transmit',
          3: 'Preparing',
          4: 'Fault'
        }
      }
    }
  } as unknown as CapabilityManifest,
  controls: new Map(Object.entries(controls))
});

describe('isRoundDistance', () => {
  it('accepts whole and half leading digits', () => {
    [0.25, 0.5, 1, 1.5, 3, 7.5, 500, 2500].forEach((v) =>
      expect(isRoundDistance(v)).toBe(true)
    );
  });

  it('rejects other values', () => {
    [0.375, 0.125, 1.2, 0, -1].forEach((v) =>
      expect(isRoundDistance(v)).toBe(false)
    );
  });
});

describe('rangeRingDistances', () => {
  it('puts the outer ring on the radar range', () => {
    const rings = rangeRingDistances(3 * NM, toNm);
    expect(rings[rings.length - 1]).toBeCloseTo(3 * NM);
  });

  it('spaces the rings at round values in the user unit', () => {
    expectDistances(rangeRingDistances(12 * NM, toNm).map(toNm), [3, 6, 9, 12]);
    // a quarter of 1.5 NM is 0.375, so three rings of 0.5 NM instead
    expectDistances(
      rangeRingDistances(1.5 * NM, toNm).map(toNm),
      [0.5, 1, 1.5]
    );
    expectDistances(rangeRingDistances(1500, toKm).map(toKm), [0.5, 1, 1.5]);
  });

  it('falls back to four rings', () => {
    expect(rangeRingDistances(1234, toKm)).toHaveLength(4);
  });

  it('has no rings without a range', () => {
    expect(rangeRingDistances(0, toNm)).toEqual([]);
    expect(rangeRingDistances(undefined, toNm)).toEqual([]);
  });
});

describe('labelDecimals', () => {
  it('shows as many decimals as the distance needs', () => {
    expect(labelDecimals(3)).toBe(0);
    expect(labelDecimals(1.5)).toBe(1);
    expect(labelDecimals(0.75)).toBe(2);
    expect(labelDecimals(1 / 3)).toBe(2);
  });
});

describe('radarRange', () => {
  it('reads the range control', () => {
    expect(radarRange(radar({ range: { value: 1852 } }))).toBe(1852);
    expect(radarRange(radar({}))).toBeUndefined();
    expect(radarRange(undefined)).toBeUndefined();
  });
});

describe('isRadarInStandby', () => {
  it('is true in standby, off and on a fault', () => {
    expect(isRadarInStandby(radar({ power: { value: 1 } }))).toBe(true);
    expect(isRadarInStandby(radar({ power: { value: 0 } }))).toBe(true);
    expect(isRadarInStandby(radar({ power: { value: 4 } }))).toBe(true);
  });

  it('is false while transmitting, warming up or in an unknown state', () => {
    expect(isRadarInStandby(radar({ power: { value: 2 } }))).toBe(false);
    expect(isRadarInStandby(radar({ power: { value: 3 } }))).toBe(false);
    expect(isRadarInStandby(radar({}))).toBe(false);
    expect(isRadarInStandby(undefined)).toBe(false);
  });
});
