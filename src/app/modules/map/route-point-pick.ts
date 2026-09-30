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
  /** [lon, lat] */
  position?: number[];
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
