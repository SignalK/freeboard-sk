import { describe, expect, it } from 'vitest';
import { getDistance, getGreatCircleBearing } from 'geolib';
import {
  GuardZone,
  guardZoneFromControl,
  guardZoneRings,
  radarGuardZones
} from './guard-zones';
import {
  ActiveRadar,
  CapabilityManifest,
  ControlDef,
  ControlValue
} from './radar-api.service';

const deg = (d: number) => (d * Math.PI) / 180;
const POSITION: [number, number] = [5, 52];

const at = (p: [number, number]) => ({ longitude: p[0], latitude: p[1] });
const distanceTo = (p: [number, number]) =>
  getDistance(at(POSITION), at(p), 0.1);
const bearingTo = (p: [number, number]) =>
  getGreatCircleBearing(at(POSITION), at(p));

const zoneDef = (id: number): ControlDef => ({
  id,
  name: 'Guard zone',
  description: '',
  category: 'guardZones',
  dataType: 'zone'
});

const radar = (
  controls: Record<string, ControlDef>,
  values: Record<string, ControlValue>
): ActiveRadar => ({
  device: { id: 'fur6424A', name: 'Furuno', brand: 'Furuno' },
  capabilities: { controls } as unknown as CapabilityManifest,
  controls: new Map(Object.entries(values))
});

describe('guardZoneFromControl', () => {
  it('reads the Radar API zone value', () => {
    expect(
      guardZoneFromControl({
        enabled: true,
        value: -0.279,
        endValue: 1.065,
        startDistance: 46,
        endDistance: 100
      })
    ).toEqual({
      startAngle: -0.279,
      endAngle: 1.065,
      startDistance: 46,
      endDistance: 100,
      enabled: true
    });
  });

  it('has no zone for a value that was never set', () => {
    expect(
      guardZoneFromControl({
        enabled: false,
        value: 0,
        endValue: 0,
        startDistance: 0,
        endDistance: 0
      })
    ).toBeUndefined();
    expect(guardZoneFromControl({})).toBeUndefined();
    expect(guardZoneFromControl(undefined)).toBeUndefined();
  });

  it('has no zone for values that are not finite', () => {
    const zone = { value: 0, endValue: 1, startDistance: 0, endDistance: 500 };
    expect(guardZoneFromControl({ ...zone, value: Infinity })).toBeUndefined();
    expect(guardZoneFromControl({ ...zone, endValue: NaN })).toBeUndefined();
    expect(
      guardZoneFromControl({ ...zone, endDistance: Infinity })
    ).toBeUndefined();
    expect(
      guardZoneFromControl({ ...zone, startDistance: -Infinity })
    ).toBeUndefined();
  });

  it('has no zone whose inner distance lies beyond its outer one', () => {
    expect(
      guardZoneFromControl({
        value: 0,
        endValue: 1,
        startDistance: 600,
        endDistance: 500
      })
    ).toBeUndefined();
  });

  it('treats a missing enabled flag as switched off', () => {
    expect(
      guardZoneFromControl({ value: 0, endValue: 1, endDistance: 500 }).enabled
    ).toBe(false);
  });
});

describe('radarGuardZones', () => {
  it('returns the guard zone controls that hold a zone', () => {
    const zones = radarGuardZones(
      radar(
        {
          guardZone2: zoneDef(17),
          guardZone1: zoneDef(16),
          exclusionZone1: zoneDef(20),
          gain: { ...zoneDef(1), dataType: 'number' }
        },
        {
          guardZone1: {
            value: 0,
            endValue: 1,
            endDistance: 500,
            enabled: true
          },
          guardZone2: { value: 0, endValue: 0, endDistance: 0 },
          exclusionZone1: { value: 0, endValue: 1, endDistance: 500 },
          gain: { value: 50 }
        }
      )
    );
    expect(zones.map((z) => z.id)).toEqual(['guardZone1']);
  });

  it('is empty without a radar', () => {
    expect(radarGuardZones(undefined)).toEqual([]);
  });
});

describe('guardZoneRings', () => {
  const sector: GuardZone = {
    startAngle: deg(-30),
    endAngle: deg(60),
    startDistance: 200,
    endDistance: 1000,
    enabled: true
  };

  it('draws a sector between its distances, turned by the heading', () => {
    const [ring] = guardZoneRings(POSITION, deg(90), sector);
    // the outer arc starts at heading + start bearing and ends at heading + end
    expect(distanceTo(ring[0])).toBeCloseTo(1000, -1);
    expect(bearingTo(ring[0])).toBeCloseTo(60, 0);
    const outerEnd = ring.find(
      (p, i) =>
        i > 0 && Math.abs(bearingTo(p) - 150) < 0.5 && distanceTo(p) > 900
    );
    expect(outerEnd).toBeDefined();
    // every point lies inside the zone's distances and bearings
    ring.forEach((p) => {
      const d = distanceTo(p);
      expect(d).toBeGreaterThan(195);
      expect(d).toBeLessThan(1005);
      const b = bearingTo(p);
      expect(b).toBeGreaterThan(59.5);
      expect(b).toBeLessThan(150.5);
    });
    expect(ring[ring.length - 1]).toEqual(ring[0]);
  });

  it('runs clockwise across north when the end bearing is below the start', () => {
    const [ring] = guardZoneRings(POSITION, 0, {
      ...sector,
      startAngle: deg(170),
      endAngle: deg(-170)
    });
    // through dead astern, never through the bow
    ring.forEach((p) => {
      const b = bearingTo(p);
      expect(b > 169.5 && b < 190.5).toBe(true);
    });
  });

  it('draws a sector without an inner distance from the radar', () => {
    const [ring] = guardZoneRings(POSITION, 0, { ...sector, startDistance: 0 });
    expect(ring).toContainEqual(POSITION);
  });

  it('draws equal bearings as a full ring with a hole', () => {
    const rings = guardZoneRings(POSITION, 0, {
      ...sector,
      startAngle: deg(-180),
      endAngle: deg(-180)
    });
    expect(rings).toHaveLength(2);
    rings[0].forEach((p) => expect(distanceTo(p)).toBeCloseTo(1000, -1));
    rings[1].forEach((p) => expect(distanceTo(p)).toBeCloseTo(200, -1));
  });

  it('keeps a sector just wider than the full-ring tolerance', () => {
    const rings = guardZoneRings(POSITION, 0, {
      ...sector,
      startAngle: 0,
      endAngle: 0.002
    });
    expect(rings).toHaveLength(1);
    rings[0]
      .filter((p) => distanceTo(p) > 900)
      .forEach((p) => expect(bearingTo(p)).toBeLessThan(0.5));
  });

  it('draws a sweep of a whole turn as a full ring', () => {
    expect(
      guardZoneRings(POSITION, 0, {
        ...sector,
        startAngle: 0,
        endAngle: 2 * Math.PI
      })
    ).toHaveLength(2);
  });

  it('draws a full ring without an inner distance as a disc', () => {
    const rings = guardZoneRings(POSITION, 0, {
      ...sector,
      startAngle: 0,
      endAngle: 0,
      startDistance: 0
    });
    expect(rings).toHaveLength(1);
  });
});
