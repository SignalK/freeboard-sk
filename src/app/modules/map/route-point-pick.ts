/**
 * Picking a single point of a route on the map, for the actions that apply to
 * one point of the active route (navigate from here, skip).
 */

import { GeoUtils } from 'src/app/lib/geoutils';
import { Position } from 'src/app/types';

/** Below this speed over ground (0.5 kn, in m/s) no time to go is estimated. */
export const MIN_TIME_TO_GO_SOG = 0.2572;

/** A point of the active route, counted in the order it is being followed. */
export interface ActiveRoutePoint {
  /** 0 based position in the order the route is being followed. */
  index: number;
  total: number;
  name?: string;
  /** [lon, lat] */
  position?: number[];
  /** Metres from the vessel along the route; absent for a point passed. */
  distance?: number;
  /** Seconds to go at the current speed over ground; absent when stopped. */
  timeToGo?: number;
  /** Whether this is the point being headed for. */
  isNext: boolean;
}

/** How close a click must be to a route point, in pixels. */
export const ROUTE_POINT_PICK_PX = { mouse: 10, touch: 20 };

/** Points closer together than this, in pixels, are the same spot. */
const SAME_SPOT_PX = 1;

/**
 * The indexes of the route vertices at the spot nearest to `click`, if it is
 * within `tolerancePx`; otherwise empty. A spot can hold more than one vertex,
 * like the shared start and end of a loop. `coordinates` and `click` are in
 * render space (EPSG:3857 metres) and `resolution` is metres per pixel. The x
 * difference is folded into one world width, so a click in another world
 * copy, or on a route stored past ±180°, still finds its vertex.
 */
export function pickRoutePoints(
  coordinates: ReadonlyArray<ReadonlyArray<number>>,
  click: ReadonlyArray<number>,
  resolution: number,
  tolerancePx: number,
  worldWidth: number
): number[] {
  const px = coordinates.map(([x, y]) => {
    let dx = click[0] - x;
    dx -= Math.round(dx / worldWidth) * worldWidth;
    return Math.hypot(dx, click[1] - y) / resolution;
  });
  const nearest = Math.min(...px);
  if (!(nearest <= tolerancePx)) {
    return [];
  }
  return px
    .map((d, i) => (d - nearest <= SAME_SPOT_PX ? i : -1))
    .filter((i) => i !== -1);
}

/**
 * Which of several points at one spot a click means, all counted in the order
 * the route is followed: the one being headed for, else the next one ahead,
 * else the first.
 */
export function preferredRoutePoint(
  candidates: ReadonlyArray<number>,
  headingFor: number
): number {
  const sorted = [...candidates].sort((a, b) => a - b);
  return (
    sorted.find((i) => i === headingFor) ??
    sorted.find((i) => i > headingFor) ??
    sorted[0]
  );
}

/**
 * The position of stored route point `index` in the order the route is being
 * followed, which the Course API's `pointIndex` counts in.
 */
export function followedPointIndex(
  index: number,
  total: number,
  reversed: boolean
): number {
  return reversed ? total - 1 - index : index;
}

/**
 * Metres from `vessel` to point `index` along the route: straight to the point
 * being headed for, `nextIndex`, then along the legs. `followed` holds the
 * route's points in the order it is followed, as both indexes count. Undefined
 * for a point already passed.
 */
export function distanceAlongRoute(
  vessel: Position,
  followed: ReadonlyArray<Position>,
  nextIndex: number,
  index: number
): number | undefined {
  if (nextIndex < 0 || index < nextIndex || index >= followed.length) {
    return undefined;
  }
  let distance = GeoUtils.distanceTo(vessel, followed[nextIndex]);
  for (let i = nextIndex + 1; i <= index; i++) {
    distance += GeoUtils.distanceTo(followed[i - 1], followed[i]);
  }
  return distance;
}

/** Seconds to cover `distance` metres at `sog` m/s; undefined when stopped. */
export function timeToGo(
  distance: number | undefined,
  sog: number | null | undefined
): number | undefined {
  return distance !== undefined && sog && sog >= MIN_TIME_TO_GO_SOG
    ? distance / sog
    : undefined;
}
