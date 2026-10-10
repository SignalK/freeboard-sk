import { computeDestinationPoint, getGreatCircleBearing } from 'geolib';
import { GuardZone, LonLat } from './guard-zones';

/** A point around the radar: bearing relative to the bow (radians,
 *  clockwise, -π..π) and distance (m). */
export interface RadarPolar {
  angle: number;
  distance: number;
}

export type ZoneHandle = 'startAngle' | 'endAngle' | 'innerDist' | 'outerDist';

export const ZONE_HANDLES: ZoneHandle[] = [
  'startAngle',
  'endAngle',
  'innerDist',
  'outerDist'
];

// the thinnest zone a drag can make, as in the MaYaRa radar GUI
export const MIN_ZONE_DEPTH = 50;
const FULL_TURN = 2 * Math.PI;
// the sphere computeDestinationPoint() places the zone outlines on; reading
// a distance back on the same sphere keeps handles under the finger
const EARTH_RADIUS = 6371000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance (m) on the sphere the zones are drawn on. */
function sphereDistance(from: ArrayLike<number>, to: ArrayLike<number>) {
  const dLat = toRad(to[1] - from[1]);
  const dLon = toRad(to[0] - from[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from[1])) * Math.cos(toRad(to[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** An angle brought into -π..π. */
export function normalizeAngle(angle: number): number {
  const a = (((angle + Math.PI) % FULL_TURN) + FULL_TURN) % FULL_TURN;
  return a - Math.PI;
}

/** The clockwise sweep from the zone's start bearing to its end bearing. */
export function zoneSweep(zone: GuardZone): number {
  return (
    (((zone.endAngle - zone.startAngle) % FULL_TURN) + FULL_TURN) % FULL_TURN
  );
}

/** Where `point` lies around the radar at `position`, whose bow points to
 *  `heading` (radians, true). */
export function toRadarPolar(
  position: ArrayLike<number>,
  heading: number,
  point: ArrayLike<number>
): RadarPolar {
  const from = { longitude: position[0], latitude: position[1] };
  const to = { longitude: point[0], latitude: point[1] };
  const distance = sphereDistance(position, point);
  const bearing = (getGreatCircleBearing(from, to) * Math.PI) / 180;
  return {
    angle: normalizeAngle(distance > 0 ? bearing - heading : 0),
    distance
  };
}

/** The [lon, lat] of a polar point around the radar. */
export function fromRadarPolar(
  position: ArrayLike<number>,
  heading: number,
  polar: RadarPolar
): LonLat {
  if (polar.distance <= 0) {
    return [position[0], position[1]];
  }
  const p = computeDestinationPoint(
    { longitude: position[0], latitude: position[1] },
    polar.distance,
    ((heading + polar.angle) * 180) / Math.PI
  );
  return [p.longitude, p.latitude];
}

/**
 * The zone a drag from `start` to `end` draws: the two points are opposite
 * corners. Of the two sectors between their bearings it takes the one up to
 * half a turn wide, so a drag across dead astern draws the small sector the
 * user swept rather than the large one on the other side.
 */
export function zoneFromDrag(start: RadarPolar, end: RadarPolar): GuardZone {
  const clockwise = zoneSweep({
    startAngle: start.angle,
    endAngle: end.angle,
    startDistance: 0,
    endDistance: 0,
    enabled: true
  });
  const [from, to] =
    clockwise <= Math.PI ? [start.angle, end.angle] : [end.angle, start.angle];
  const startDistance = Math.max(0, Math.min(start.distance, end.distance));
  return {
    startAngle: normalizeAngle(from),
    endAngle: normalizeAngle(to),
    startDistance,
    endDistance: Math.max(
      start.distance,
      end.distance,
      startDistance + MIN_ZONE_DEPTH
    ),
    enabled: true
  };
}

/** The zone with one handle moved to `polar`, kept at least
 *  MIN_ZONE_DEPTH deep. */
export function dragHandle(
  zone: GuardZone,
  handle: ZoneHandle,
  polar: RadarPolar
): GuardZone {
  switch (handle) {
    case 'startAngle':
      return { ...zone, startAngle: normalizeAngle(polar.angle) };
    case 'endAngle':
      return { ...zone, endAngle: normalizeAngle(polar.angle) };
    case 'innerDist':
      return {
        ...zone,
        startDistance: Math.max(
          0,
          Math.min(polar.distance, zone.endDistance - MIN_ZONE_DEPTH)
        )
      };
    case 'outerDist':
      return {
        ...zone,
        endDistance: Math.max(
          MIN_ZONE_DEPTH,
          polar.distance,
          zone.startDistance + MIN_ZONE_DEPTH
        )
      };
  }
}

/** Where the zone's handles sit: the bearing handles halfway out, the
 *  distance handles on the middle bearing. */
export function handlePositions(
  zone: GuardZone
): Record<ZoneHandle, RadarPolar> {
  const midDistance = (zone.startDistance + zone.endDistance) / 2;
  const midAngle = normalizeAngle(zone.startAngle + zoneSweep(zone) / 2);
  return {
    startAngle: { angle: zone.startAngle, distance: midDistance },
    endAngle: { angle: zone.endAngle, distance: midDistance },
    innerDist: { angle: midAngle, distance: zone.startDistance },
    outerDist: { angle: midAngle, distance: zone.endDistance }
  };
}

/** The Radar API value of a zone, as one PUT sends it. */
export function zoneControlValue(zone: GuardZone) {
  return {
    value: zone.startAngle,
    endValue: zone.endAngle,
    startDistance: zone.startDistance,
    endDistance: zone.endDistance,
    enabled: zone.enabled
  };
}

/** The zone kept within the radar's reach (`maxDistance`, m), when it
 *  reports one. */
export function limitZone(zone: GuardZone, maxDistance?: number): GuardZone {
  if (!(maxDistance > MIN_ZONE_DEPTH)) {
    return zone;
  }
  const endDistance = Math.min(zone.endDistance, maxDistance);
  return {
    ...zone,
    endDistance,
    startDistance: Math.max(
      0,
      Math.min(zone.startDistance, endDistance - MIN_ZONE_DEPTH)
    )
  };
}
