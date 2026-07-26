import { getGreatCircleBearing } from 'geolib';
import { Convert } from './convert';
import { GeoUtils } from './geoutils';
import { MapPanBehavior, Position } from '../types';

/**
 * The vessel centre offset is a whole percentage of the distance from the
 * viewport centre to the screen edge, measured along the vessel's course:
 * positive puts the map centre ahead of the vessel (look ahead), negative puts
 * it astern (look behind). Clamped short of the edge so the vessel can never be
 * pushed off screen.
 */
export const CENTER_OFFSET_LIMIT = 90;

/** Round and clamp an entered or panned-to offset to a usable percentage. */
export function clampCenterOffset(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(
    -CENTER_OFFSET_LIMIT,
    Math.min(CENTER_OFFSET_LIMIT, Math.round(value))
  );
}

/**
 * Convert the superseded fractional offset (the 0–0.7 preset dropdown) to a
 * percentage. Legacy values are the only non-integers the setting can hold.
 */
export function legacyCenterOffset(value: number): number {
  return clampCenterOffset(value * 100);
}

/**
 * Map the superseded "Lock Follow Vessel" checkbox onto a pan behavior.
 * Locked meant "stay in follow mode when I pan", so it becomes the option that
 * keeps follow on and honours the pan; unlocked dropped out of follow mode,
 * which is also what a config predating the checkbox did.
 */
export function legacyPanBehavior(lockMoveMap?: boolean): MapPanBehavior {
  return lockMoveMap ? 'offset' : 'exit';
}

const TWO_PI = Math.PI * 2;

/** Normalise an angle to `[0, 2π)`. */
const normalise = (radians: number): number =>
  ((radians % TWO_PI) + TWO_PI) % TWO_PI;

/**
 * Geodetic distance from the viewport centre to the screen edge in the given
 * course direction. This correctly handles any map rotation mode (north-up or
 * heading-up) and any screen aspect ratio.
 *
 * In OL, a CW bearing β has projected-space direction (sin β, cos β). With OL
 * view rotation rot (CCW), the screen-space components are:
 *   sx = sin(β + rot)  (rightward)   sy = cos(β + rot)  (upward)
 * The edge of the viewport rectangle lies at min(hw/|sx|, hh/|sy|).
 * @param halfWidth geodetic distance from the centre to the side edge
 * @param halfHeight geodetic distance from the centre to the top edge
 * @param course vessel COG (or heading) in radians
 * @param rotation OL view rotation in radians
 */
export function edgeDistanceInDirection(
  halfWidth: number,
  halfHeight: number,
  course: number,
  rotation: number
): number {
  const sx = Math.abs(Math.sin(course + rotation));
  const sy = Math.abs(Math.cos(course + rotation));
  return Math.min(
    sx > 1e-10 ? halfWidth / sx : Infinity,
    sy > 1e-10 ? halfHeight / sy : Infinity
  );
}

/**
 * Resolve the vessel centre offset to a map centre for the vessel's current
 * position and course.
 * @param vessel vessel position `[lon, lat]`
 * @param course vessel COG (or heading) in radians
 * @param edgeDistance metres from the viewport centre to the edge on that course
 * @param offset the configured offset percentage
 */
export function mapCenterForOffset(
  vessel: Position,
  course: number,
  edgeDistance: number,
  offset: number
): Position {
  const distance = edgeDistance * (offset / 100);
  if (!distance || !Number.isFinite(distance)) {
    return vessel;
  }
  return GeoUtils.destCoordinate(
    vessel,
    distance < 0 ? normalise(course + Math.PI) : normalise(course),
    Math.abs(distance)
  );
}

/**
 * Derive the vessel centre offset from a chart pan, by projecting the
 * vessel → map-centre displacement onto the vessel's course. The setting is a
 * single along-course value, so panning off the course line contributes only
 * its along-course component.
 *
 * Returns null when the vessel has no course to measure against, in which case
 * the pan leaves the configured offset alone.
 * @param vessel vessel position `[lon, lat]`
 * @param mapCenter map centre the user panned to `[lon, lat]`
 * @param course vessel COG (or heading) in radians; null when not under way
 * @param edgeDistance metres from the viewport centre to the edge on that course
 */
export function centerOffsetFromPan(
  vessel: Position,
  mapCenter: Position,
  course: number | null,
  edgeDistance: number
): number | null {
  if (course === null || !edgeDistance || !Number.isFinite(edgeDistance)) {
    return null;
  }
  const distance = GeoUtils.distanceTo(vessel, mapCenter) ?? 0;
  // getGreatCircleBearing returns degrees; the map works in radians.
  const bearing = Convert.degreesToRadians(
    getGreatCircleBearing(vessel, mapCenter) ?? 0
  );
  const alongCourse = distance * Math.cos(bearing - course);
  return clampCenterOffset((alongCourse / edgeDistance) * 100);
}
