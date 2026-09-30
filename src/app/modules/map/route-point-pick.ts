/**
 * Picking a single point of a route on the map, for the actions that apply to
 * one point of the active route (navigate from here, skip).
 */

/** A point of the active route, counted in the order it is being followed. */
export interface ActiveRoutePoint {
  /** 0 based position in the order the route is being followed. */
  index: number;
  total: number;
  name?: string;
  /** Whether this is the point being headed for. */
  isNext: boolean;
}

/** How close a click must be to a route point, in pixels. */
export const ROUTE_POINT_PICK_PX = { mouse: 10, touch: 20 };

/**
 * The index of the route vertex nearest to `click`, if it is within
 * `tolerancePx`; otherwise null. `coordinates` and `click` are in render space
 * (EPSG:3857 metres) and `resolution` is metres per pixel. The x difference is
 * folded into one world width, so a click in another world copy, or on a route
 * stored past ±180°, still finds its vertex.
 */
export function pickRoutePoint(
  coordinates: ReadonlyArray<ReadonlyArray<number>>,
  click: ReadonlyArray<number>,
  resolution: number,
  tolerancePx: number,
  worldWidth: number
): number | null {
  let best: number | null = null;
  let bestPx = tolerancePx;
  coordinates.forEach(([x, y], i) => {
    let dx = click[0] - x;
    dx -= Math.round(dx / worldWidth) * worldWidth;
    const px = Math.hypot(dx, click[1] - y) / resolution;
    if (px <= bestPx) {
      best = i;
      bestPx = px;
    }
  });
  return best;
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
