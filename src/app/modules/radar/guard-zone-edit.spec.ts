import { describe, expect, it } from 'vitest';
import {
  dragHandle,
  fromRadarPolar,
  handlePositions,
  limitZone,
  MIN_ZONE_DEPTH,
  normalizeAngle,
  toRadarPolar,
  zoneFromDrag,
  zoneSweep
} from './guard-zone-edit';
import { GuardZone } from './guard-zones';

const deg = (d: number) => (d * Math.PI) / 180;
const POSITION: [number, number] = [5, 52];

const zone: GuardZone = {
  startAngle: deg(-30),
  endAngle: deg(60),
  startDistance: 200,
  endDistance: 1000,
  enabled: true
};

describe('normalizeAngle', () => {
  it('brings angles into -π..π', () => {
    expect(normalizeAngle(deg(190))).toBeCloseTo(deg(-170));
    expect(normalizeAngle(deg(-190))).toBeCloseTo(deg(170));
    expect(normalizeAngle(deg(30))).toBeCloseTo(deg(30));
  });
});

describe('toRadarPolar', () => {
  it('measures bearings from the bow', () => {
    // a point due east of a boat heading north-east is 45° to starboard
    const point = fromRadarPolar(POSITION, 0, {
      angle: deg(90),
      distance: 500
    });
    const polar = toRadarPolar(POSITION, deg(45), point);
    expect(polar.angle).toBeCloseTo(deg(45), 2);
    expect(polar.distance).toBeCloseTo(500, 0);
  });

  it('reads a point across the antimeridian', () => {
    const position = [179.999, -17];
    const point = fromRadarPolar(position, 0, {
      angle: deg(90),
      distance: 1000
    });
    expect(point[0]).toBeLessThan(0);
    const polar = toRadarPolar(position, 0, point);
    expect(polar.angle).toBeCloseTo(deg(90), 2);
    expect(polar.distance).toBeCloseTo(1000, 0);
  });
});

describe('zoneFromDrag', () => {
  it('spans the bearings and distances between the two corners', () => {
    const z = zoneFromDrag(
      { angle: deg(40), distance: 900 },
      { angle: deg(-20), distance: 300 }
    );
    expect(z.startAngle).toBeCloseTo(deg(-20));
    expect(z.endAngle).toBeCloseTo(deg(40));
    expect(z.startDistance).toBe(300);
    expect(z.endDistance).toBe(900);
    expect(z.enabled).toBe(true);
  });

  it('draws the small sector across dead astern', () => {
    const z = zoneFromDrag(
      { angle: deg(170), distance: 300 },
      { angle: deg(-170), distance: 900 }
    );
    expect(z.startAngle).toBeCloseTo(deg(170));
    expect(z.endAngle).toBeCloseTo(deg(-170));
    expect(zoneSweep(z)).toBeCloseTo(deg(20));
  });

  it('keeps a zone at least the minimum depth', () => {
    const z = zoneFromDrag(
      { angle: 0, distance: 500 },
      { angle: deg(30), distance: 510 }
    );
    expect(z.endDistance - z.startDistance).toBe(MIN_ZONE_DEPTH);
  });
});

describe('dragHandle', () => {
  it('moves one bearing', () => {
    const z = dragHandle(zone, 'endAngle', { angle: deg(80), distance: 50 });
    expect(z.endAngle).toBeCloseTo(deg(80));
    expect(z.startAngle).toBe(zone.startAngle);
    expect(z.endDistance).toBe(zone.endDistance);
  });

  it('keeps the inner distance inside the outer one', () => {
    expect(
      dragHandle(zone, 'innerDist', { angle: 0, distance: 990 }).startDistance
    ).toBe(1000 - MIN_ZONE_DEPTH);
    expect(
      dragHandle(zone, 'innerDist', { angle: 0, distance: -5 }).startDistance
    ).toBe(0);
  });

  it('keeps the outer distance outside the inner one', () => {
    expect(
      dragHandle(zone, 'outerDist', { angle: 0, distance: 100 }).endDistance
    ).toBe(200 + MIN_ZONE_DEPTH);
  });
});

describe('handlePositions', () => {
  it('puts the bearing handles halfway out, the distance handles mid-sector', () => {
    const h = handlePositions(zone);
    expect(h.startAngle).toEqual({ angle: zone.startAngle, distance: 600 });
    expect(h.endAngle).toEqual({ angle: zone.endAngle, distance: 600 });
    expect(h.innerDist.angle).toBeCloseTo(deg(15));
    expect(h.innerDist.distance).toBe(200);
    expect(h.outerDist.distance).toBe(1000);
  });

  it('finds the middle of a sector across dead astern', () => {
    const h = handlePositions({
      ...zone,
      startAngle: deg(170),
      endAngle: deg(-170)
    });
    expect(Math.abs(h.outerDist.angle)).toBeCloseTo(Math.PI);
  });
});

describe('limitZone', () => {
  it('keeps the zone within the radar reach', () => {
    const z = limitZone(
      { ...zone, startDistance: 900, endDistance: 2000 },
      920
    );
    expect(z.endDistance).toBe(920);
    expect(z.startDistance).toBe(920 - MIN_ZONE_DEPTH);
  });

  it('never sends a negative inner distance', () => {
    // a zone shallower than the minimum depth, as a radar may hold one
    const z = limitZone({ ...zone, startDistance: 0, endDistance: 30 }, 920);
    expect(z.startDistance).toBe(0);
    expect(z.endDistance).toBe(30);
  });

  it('leaves the zone alone without a reach', () => {
    expect(limitZone(zone, undefined)).toBe(zone);
  });
});
