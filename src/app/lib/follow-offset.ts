import { getGreatCircleBearing } from 'geolib';
import { Convert } from './convert';
import { GeoUtils } from './geoutils';
import { MapPanBehavior, Position } from '../types';

/**
 * Where the map centre sits relative to the vessel, as whole percentages of the
 * distance from the viewport centre to the screen edge. The offset is held in
 * the vessel's frame rather than the screen's, so it rotates with the boat —
 * a look-ahead has to stay ahead in north-up too, or a vessel heading south
 * would be shown the water it has already passed.
 */
export interface CenterOffset {
  ahead: number; // along the course; negative places the centre astern
  abeam: number; // to starboard of the course; negative places it to port
}

/** The viewport the offset is measured against. */
export interface MapViewport {
  halfWidth: number; // metres from the centre to the side edge
  halfHeight: number; // metres from the centre to the top edge
  rotation: number; // OL view rotation in radians
}

/** Neither axis may exceed this share of the distance to the screen edge. */
export const CENTER_OFFSET_LIMIT = 90;

/** Round and clamp an entered or panned-to offset to a usable percentage. */
export function clampCenterOffset(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const rounded = Math.round(value);
  // Resolving a pan leaves a hair of rounding error on the axis the user did
  // not move along, and Math.round turns that into -0. Normalise it so "no
  // offset" is always the same value.
  return rounded === 0
    ? 0
    : Math.max(-CENTER_OFFSET_LIMIT, Math.min(CENTER_OFFSET_LIMIT, rounded));
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
const QUARTER_TURN = Math.PI / 2;

/** Normalise an angle to `[0, 2π)`. */
const normalise = (radians: number): number =>
  ((radians % TWO_PI) + TWO_PI) % TWO_PI;

/**
 * Geodetic distance from the viewport centre to the screen edge in the given
 * direction. This correctly handles any map rotation mode (north-up or
 * heading-up) and any screen aspect ratio.
 *
 * In OL, a CW bearing β has projected-space direction (sin β, cos β). With OL
 * view rotation rot (CCW), the screen-space components are:
 *   sx = sin(β + rot)  (rightward)   sy = cos(β + rot)  (upward)
 * The edge of the viewport rectangle lies at min(hw/|sx|, hh/|sy|).
 * @param halfWidth geodetic distance from the centre to the side edge
 * @param halfHeight geodetic distance from the centre to the top edge
 * @param bearing direction of interest in radians
 * @param rotation OL view rotation in radians
 */
export function edgeDistanceInDirection(
  halfWidth: number,
  halfHeight: number,
  bearing: number,
  rotation: number
): number {
  const sx = Math.abs(Math.sin(bearing + rotation));
  const sy = Math.abs(Math.cos(bearing + rotation));
  return Math.min(
    sx > 1e-10 ? halfWidth / sx : Infinity,
    sy > 1e-10 ? halfHeight / sy : Infinity
  );
}

/** The two axis offsets in metres, measured in the vessel's frame. */
function offsetComponents(
  course: number,
  viewport: MapViewport,
  offset: CenterOffset
): { ahead: number; abeam: number } {
  const { halfWidth, halfHeight, rotation } = viewport;
  return {
    ahead:
      edgeDistanceInDirection(halfWidth, halfHeight, course, rotation) *
      (offset.ahead / 100),
    abeam:
      edgeDistanceInDirection(
        halfWidth,
        halfHeight,
        course + QUARTER_TURN,
        rotation
      ) *
      (offset.abeam / 100)
  };
}

/**
 * Shrink factor keeping the vessel on screen. Each axis is clamped against the
 * edge distance in its *own* direction, which is not enough once both are in
 * play: 90% ahead combined with 90% abeam lands diagonally outside the corner.
 * Offsets on a single axis are always within bounds, so this returns 1 for them
 * and only bites on a genuine corner offset.
 */
function onScreenScale(
  bearing: number,
  distance: number,
  viewport: MapViewport
): number {
  const { halfWidth, halfHeight, rotation } = viewport;
  const fx =
    halfWidth > 0
      ? Math.abs(distance * Math.sin(bearing + rotation)) / halfWidth
      : 0;
  const fy =
    halfHeight > 0
      ? Math.abs(distance * Math.cos(bearing + rotation)) / halfHeight
      : 0;
  const excess = Math.max(fx, fy) / (CENTER_OFFSET_LIMIT / 100);
  return excess > 1 ? 1 / excess : 1;
}

/**
 * Scale an offset pair back until the vessel is inside the viewport, so that a
 * stored offset is the one actually rendered. Panning the vessel clean off the
 * screen otherwise stores a pair the renderer then shrinks, and the vessel
 * springs back from where it was dropped.
 * @param offset the offset percentages to constrain
 * @param course vessel COG (or heading) in radians
 * @param viewport the current map viewport
 */
export function constrainCenterOffset(
  offset: CenterOffset,
  course: number,
  viewport: MapViewport
): CenterOffset {
  const { ahead, abeam } = offsetComponents(course, viewport, offset);
  const distance = Math.hypot(ahead, abeam);
  if (!distance || !Number.isFinite(distance)) {
    return offset;
  }
  const scale = onScreenScale(
    normalise(course + Math.atan2(abeam, ahead)),
    distance,
    viewport
  );
  return scale >= 1
    ? offset
    : {
        ahead: clampCenterOffset(offset.ahead * scale),
        abeam: clampCenterOffset(offset.abeam * scale)
      };
}

/**
 * Resolve the configured offset to a map centre for the vessel's current
 * position and course.
 * @param vessel vessel position `[lon, lat]`
 * @param course vessel COG (or heading) in radians
 * @param viewport the current map viewport
 * @param offset the configured offset percentages
 */
export function mapCenterForOffset(
  vessel: Position,
  course: number,
  viewport: MapViewport,
  offset: CenterOffset
): Position {
  const { ahead, abeam } = offsetComponents(course, viewport, offset);
  const distance = Math.hypot(ahead, abeam);
  if (!distance || !Number.isFinite(distance)) {
    return vessel;
  }
  // atan2 carries the sign of both axes, so an astern or to-port offset needs
  // no special case — it simply points the other way.
  const bearing = normalise(course + Math.atan2(abeam, ahead));
  return GeoUtils.destCoordinate(
    vessel,
    bearing,
    distance * onScreenScale(bearing, distance, viewport)
  );
}

/**
 * Derive the offset from a chart pan, by resolving the vessel → map-centre
 * displacement into its along-course and abeam components so the vessel stays
 * where the user dragged it.
 *
 * Returns null when the vessel has no course to measure against, in which case
 * the pan leaves the configured offset alone.
 * @param vessel vessel position `[lon, lat]`
 * @param mapCenter map centre the user panned to `[lon, lat]`
 * @param course vessel COG (or heading) in radians; null when not under way
 * @param viewport the current map viewport
 */
export function centerOffsetFromPan(
  vessel: Position,
  mapCenter: Position,
  course: number | null,
  viewport: MapViewport
): CenterOffset | null {
  if (course === null) {
    return null;
  }
  const { halfWidth, halfHeight, rotation } = viewport;
  const aheadEdge = edgeDistanceInDirection(
    halfWidth,
    halfHeight,
    course,
    rotation
  );
  const abeamEdge = edgeDistanceInDirection(
    halfWidth,
    halfHeight,
    course + QUARTER_TURN,
    rotation
  );
  if (
    !aheadEdge ||
    !abeamEdge ||
    !Number.isFinite(aheadEdge) ||
    !Number.isFinite(abeamEdge)
  ) {
    return null;
  }
  const distance = GeoUtils.distanceTo(vessel, mapCenter) ?? 0;
  // getGreatCircleBearing returns degrees; the map works in radians.
  const bearing = Convert.degreesToRadians(
    getGreatCircleBearing(vessel, mapCenter) ?? 0
  );
  const delta = bearing - course;
  return constrainCenterOffset(
    {
      ahead: clampCenterOffset(
        ((distance * Math.cos(delta)) / aheadEdge) * 100
      ),
      abeam: clampCenterOffset(((distance * Math.sin(delta)) / abeamEdge) * 100)
    },
    course,
    viewport
  );
}
