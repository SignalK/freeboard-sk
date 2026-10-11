import { describe, expect, it } from 'vitest';
import { getDistance } from 'geolib';

import {
  bearingDistanceReadout,
  bearingDistanceRing
} from './bearing-distance';
import { Position } from 'src/app/types';

describe('bearingDistanceReadout', () => {
  it('reports distance, bearing and its reciprocal', () => {
    // due east along the equator, one degree
    const r = bearingDistanceReadout([0, 0], [1, 0]);
    expect(r.bearing).toBeCloseTo(90, 6);
    expect(r.reciprocal).toBeCloseTo(270, 6);
    expect(r.distance).toBe(getDistance([0, 0], [1, 0]));
  });

  it('wraps the reciprocal into [0, 360)', () => {
    const southWest = bearingDistanceReadout([0, 0], [-1, -1]);
    expect(southWest.bearing).toBeGreaterThan(180);
    expect(southWest.reciprocal).toBeCloseTo(southWest.bearing - 180, 6);

    const north = bearingDistanceReadout([0, 0], [0, 1]);
    expect(north.bearing).toBeCloseTo(0, 6);
    expect(north.reciprocal).toBeCloseTo(180, 6);
  });
});

describe('bearingDistanceRing', () => {
  const ringPoints = (origin: Position, d: number): Position[] =>
    bearingDistanceRing(origin, d).getCoordinates()[0] as Position[];

  it('is geodesic: every point is the target distance away, even at high latitude', () => {
    // At 75°N a Mercator circle through a point 20 nm north would reach ~3.9x
    // too far east-west; the ring must stay at range in every direction.
    const origin: Position = [15, 75];
    const d = 37040;
    ringPoints(origin, d).forEach((p) => {
      expect(Math.abs(getDistance(origin, p) - d)).toBeLessThanOrEqual(1);
    });
  });

  it('stays continuous across the antimeridian', () => {
    const lons = ringPoints([179.9, 10], 50000).map((p) => p[0]);
    expect(Math.max(...lons)).toBeGreaterThan(180);
    for (let i = 1; i < lons.length; i++) {
      expect(Math.abs(lons[i] - lons[i - 1])).toBeLessThan(1);
    }
  });
});
