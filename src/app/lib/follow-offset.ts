import { getGreatCircleBearing } from 'geolib';
import { Convert } from './convert';
import { GeoUtils } from './geoutils';
import { MapCenterOffset, MapPanBehavior, Position } from '../types';

/**
 * The vessel centre offset is fixed in the *screen's* frame — `x` across the
 * screen, `y` up it — each a whole percentage of the distance from the viewport
 * centre to that edge. Because it is held in screen space the vessel keeps the
 * on-screen spot it was panned to whatever its course does. Anchoring it to the
 * boat's heading instead swings the chart about whenever the course is unknown
 * or noisy (at rest, or barely moving) — which is exactly when you pan to look
 * around. Positive `y` puts the map centre above the vessel (look ahead),
 * positive `x` to its right.
 */

/** The viewport an offset is measured against. */
export interface MapViewport {
  halfWidth: number; // metres from the centre to the side edge
  halfHeight: number; // metres from the centre to the top edge
  rotation: number; // OL view rotation in radians
}

/** Neither axis may exceed this share of the distance to the screen edge. */
export const CENTER_OFFSET_LIMIT = 90;

/** Round and clamp an entered or panned-to offset axis to a usable percentage. */
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

/**
 * Coerce any stored offset shape to the current screen-fixed `{x, y}` form:
 * - unset → centred;
 * - the `{ahead, abeam}` pair from the vessel-frame offset maps ahead→y, abeam→x;
 * - a bare number is the oldest single along-course value (a 0–0.7 fractional
 *   preset, otherwise a whole percentage) and lands on `y`, where it pointed in
 *   heading-up;
 * - an `{x, y}` offset is clamped.
 * @param value the stored `centerOffset`
 * @param abeam the stored `centerOffsetAbeam`, if the vessel-frame pair was used
 */
export function normaliseCenterOffset(
  value: unknown,
  abeam?: unknown
): MapCenterOffset {
  if (typeof value === 'number') {
    return {
      x: typeof abeam === 'number' ? clampCenterOffset(abeam) : 0,
      y: Number.isInteger(value)
        ? clampCenterOffset(value)
        : legacyCenterOffset(value)
    };
  }
  if (value && typeof value === 'object') {
    const offset = value as Partial<MapCenterOffset>;
    return {
      x: clampCenterOffset(offset.x ?? 0),
      y: clampCenterOffset(offset.y ?? 0)
    };
  }
  return { x: 0, y: 0 };
}

const TWO_PI = Math.PI * 2;

/** Normalise an angle to `[0, 2π)`. */
const normalise = (radians: number): number =>
  ((radians % TWO_PI) + TWO_PI) % TWO_PI;

/**
 * Screen axes map to world bearings through the OL view rotation alone: a world
 * bearing β projects to screen `(sin(β + rot), cos(β + rot))` = (right, up), so
 * screen-up is world bearing `-rot` and screen-right is `π/2 - rot`. Both
 * functions below share this — and neither takes the vessel's course, which is
 * what keeps the offset fixed to the screen rather than the boat.
 */

/**
 * Resolve the configured offset to a map centre. `x`/`y` are shares of the
 * viewport half-width / half-height, i.e. on-screen metres right and up; these
 * combine into a world bearing through the view rotation, so the result never
 * depends on the vessel's course.
 * @param vessel vessel position `[lon, lat]`
 * @param viewport the current map viewport
 * @param offset the configured offset percentages
 */
export function mapCenterForOffset(
  vessel: Position,
  viewport: MapViewport,
  offset: MapCenterOffset
): Position {
  const right = (offset.x / 100) * viewport.halfWidth;
  const up = (offset.y / 100) * viewport.halfHeight;
  const distance = Math.hypot(right, up);
  if (!distance || !Number.isFinite(distance)) {
    return vessel;
  }
  // atan2 carries the sign of both axes, so a below-screen or to-the-left offset
  // needs no special case — it simply points the other way.
  return GeoUtils.destCoordinate(
    vessel,
    normalise(-viewport.rotation + Math.atan2(right, up)),
    distance
  );
}

/**
 * The map centre that keeps a screen-fixed offset constant across a zoom of
 * `zoomShift` levels (positive in, negative out). The view resolution changes by
 * a factor of two per level, so the offset spans half the ground distance one
 * level in and twice one level out; scaling the viewport by that factor before
 * projecting the offset lands the vessel back on the same on-screen spot.
 * @param vessel vessel position `[lon, lat]`
 * @param viewport the current (pre-zoom) map viewport
 * @param offset the configured offset percentages
 * @param zoomShift zoom levels applied, e.g. `+1` for a single zoom-in step
 */
export function mapCenterForZoomShift(
  vessel: Position,
  viewport: MapViewport,
  offset: MapCenterOffset,
  zoomShift: number
): Position {
  const scale = 2 ** -zoomShift;
  return mapCenterForOffset(
    vessel,
    {
      ...viewport,
      halfWidth: viewport.halfWidth * scale,
      halfHeight: viewport.halfHeight * scale
    },
    offset
  );
}

/**
 * Raw pan offset in screen-edge percentages (`x` right, `y` up), before
 * clamping — the inverse projection of {@link mapCenterForOffset}. `|value| > 100`
 * on an axis means the pan dragged the vessel past that edge, i.e. off screen.
 * Null when the viewport edge distances are unusable.
 */
function panScreenFraction(
  vessel: Position,
  mapCenter: Position,
  viewport: MapViewport
): MapCenterOffset | null {
  const { halfWidth, halfHeight, rotation } = viewport;
  if (
    !halfWidth ||
    !halfHeight ||
    !Number.isFinite(halfWidth) ||
    !Number.isFinite(halfHeight)
  ) {
    return null;
  }
  const distance = GeoUtils.distanceTo(vessel, mapCenter) ?? 0;
  // getGreatCircleBearing returns degrees; the map works in radians.
  const bearing = Convert.degreesToRadians(
    getGreatCircleBearing(vessel, mapCenter) ?? 0
  );
  const screenAngle = bearing + rotation;
  return {
    x: ((distance * Math.sin(screenAngle)) / halfWidth) * 100,
    y: ((distance * Math.cos(screenAngle)) / halfHeight) * 100
  };
}

/** How a settled follow-mode pan is interpreted. */
export type PanResolution =
  | { action: 'offset'; offset: MapCenterOffset }
  | { action: 'release' }
  | { action: 'ignore' };

/**
 * Resolve a settled follow-mode pan. A pan that leaves the vessel on screen is
 * adopted as the screen-fixed centre offset (both axes kept, so a diagonal pan
 * sticks); a pan that drags the vessel past a viewport edge releases follow mode
 * rather than clamping the vessel back on; an unmeasurable view is ignored.
 * @param vessel vessel position `[lon, lat]`
 * @param mapCenter map centre the user panned to `[lon, lat]`
 * @param viewport the current map viewport
 */
export function resolvePan(
  vessel: Position,
  mapCenter: Position,
  viewport: MapViewport
): PanResolution {
  const raw = panScreenFraction(vessel, mapCenter, viewport);
  if (raw === null) {
    return { action: 'ignore' };
  }
  if (Math.abs(raw.x) > 100 || Math.abs(raw.y) > 100) {
    return { action: 'release' };
  }
  return {
    action: 'offset',
    offset: { x: clampCenterOffset(raw.x), y: clampCenterOffset(raw.y) }
  };
}
