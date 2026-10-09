import { computeDestinationPoint } from 'geolib';
import { ActiveRadar, ControlValue } from './radar-api.service';

/** A guard zone: an annular sector around the radar, its bearings relative
 *  to the bow (radians, clockwise) and its distances in metres. Equal start
 *  and end bearings make a full ring. */
export interface GuardZone {
  startAngle: number;
  endAngle: number;
  startDistance: number;
  endDistance: number;
  enabled: boolean;
}

export interface RadarGuardZone {
  /** control id, e.g. `guardZone1` */
  id: string;
  zone: GuardZone;
}

/** [longitude, latitude] */
export type LonLat = [number, number];

const GUARD_ZONE_PREFIX = 'guardZone';
// a sector whose ends are closer than this is the full ring
const FULL_RING_TOLERANCE = 0.001;
// the longest arc step drawn as one straight segment
const MAX_ARC_STEP = (2 * Math.PI) / 180;

/** The zone a `zone` control value describes, or undefined when it has none
 *  (a zone never set reports no outer distance). */
export function guardZoneFromControl(
  value: ControlValue | undefined
): GuardZone | undefined {
  if (
    typeof value?.value !== 'number' ||
    typeof value.endValue !== 'number' ||
    !(value.endDistance > 0)
  ) {
    return undefined;
  }
  return {
    startAngle: value.value,
    endAngle: value.endValue,
    startDistance: Math.max(0, value.startDistance ?? 0),
    endDistance: value.endDistance,
    enabled: value.enabled === true
  };
}

/** The guard zones of a radar, in control id order. */
export function radarGuardZones(
  radar: ActiveRadar | undefined
): RadarGuardZone[] {
  if (!radar?.capabilities?.controls || !radar.controls) {
    return [];
  }
  return Object.entries(radar.capabilities.controls)
    .filter(
      ([id, def]) => id.startsWith(GUARD_ZONE_PREFIX) && def.dataType === 'zone'
    )
    .map(([id]) => ({ id, zone: guardZoneFromControl(radar.controls.get(id)) }))
    .filter((z) => z.zone !== undefined)
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** True when the zone covers every bearing. */
export function isFullRing(zone: GuardZone): boolean {
  return Math.abs(zone.endAngle - zone.startAngle) < FULL_RING_TOLERANCE;
}

/**
 * The zone's outline as polygon rings in [lon, lat], placed around `position`
 * and turned by the vessel's `heading` (radians, true), since the zone's
 * bearings are relative to the bow. A full ring with an inner distance is an
 * outer ring with a hole; a sector runs clockwise from its start bearing to
 * its end bearing.
 */
export function guardZoneRings(
  position: ArrayLike<number>,
  heading: number,
  zone: GuardZone
): LonLat[][] {
  const point = (bearing: number, distance: number): LonLat => {
    if (distance <= 0) {
      return [position[0], position[1]];
    }
    const p = computeDestinationPoint(
      { longitude: position[0], latitude: position[1] },
      distance,
      ((heading + bearing) * 180) / Math.PI
    );
    return [p.longitude, p.latitude];
  };
  const arc = (from: number, sweep: number, distance: number): LonLat[] => {
    const steps = Math.max(1, Math.ceil(Math.abs(sweep) / MAX_ARC_STEP));
    const points: LonLat[] = [];
    for (let i = 0; i <= steps; i++) {
      points.push(point(from + (sweep * i) / steps, distance));
    }
    return points;
  };

  if (isFullRing(zone)) {
    const outer = arc(0, 2 * Math.PI, zone.endDistance);
    return zone.startDistance > 0
      ? [outer, arc(0, -2 * Math.PI, zone.startDistance)]
      : [outer];
  }

  let sweep = zone.endAngle - zone.startAngle;
  while (sweep <= 0) {
    sweep += 2 * Math.PI;
  }
  const ring = arc(zone.startAngle, sweep, zone.endDistance);
  if (zone.startDistance > 0) {
    ring.push(...arc(zone.endAngle, -sweep, zone.startDistance));
  } else {
    ring.push(point(0, 0));
  }
  ring.push(ring[0]);
  return [ring];
}
