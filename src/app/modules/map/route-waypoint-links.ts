import { Position } from 'src/app/types';
import { DrawnWaypoint, waypointAt } from './ol/lib/waypoint-snap';
import type { RoutePointMeta } from './route-extend';

/**
 * Linking route points to the waypoints they were snapped onto (#881). A point
 * is linked when its vertex lies on a drawn waypoint, so these work from the
 * route geometry alone (render space, EPSG:3857).
 */

/** Name and description of a waypoint, by id; undefined if unknown. */
export type WaypointLookup = (
  id: string
) => { name?: string; description?: string } | undefined;

/** The metadata entry for a point linked to waypoint `id`. */
export function waypointLinkMeta(
  id: string,
  lookup: WaypointLookup
): RoutePointMeta {
  const wpt = lookup(id);
  return {
    name: wpt?.name ?? '',
    ...(wpt?.description ? { description: wpt.description } : {}),
    href: `/resources/waypoints/${id}`
  };
}

/**
 * Point metadata for a newly drawn route: each point lying on a waypoint is
 * linked to it. Undefined when no point is, matching a route drawn without
 * any.
 */
export function drawnRouteMeta(
  coords: Position[],
  waypoints: DrawnWaypoint[],
  lookup: WaypointLookup
): RoutePointMeta[] | undefined {
  const ids = coords.map((c) => waypointAt(c, waypoints));
  if (!ids.some((id) => id)) {
    return undefined;
  }
  return ids.map((id) => (id ? waypointLinkMeta(id, lookup) : { name: '' }));
}

/**
 * The vertex a single Modify operation moved or inserted, or -1 when it removed
 * one or changed nothing. `before` and `after` are the geometry either side of
 * the operation.
 */
export function touchedVertex(before: Position[], after: Position[]): number {
  if (after.length < before.length) {
    return -1;
  }
  for (let i = 0; i < before.length; i++) {
    if (before[i][0] !== after[i][0] || before[i][1] !== after[i][1]) {
      return i;
    }
  }
  return after.length > before.length ? after.length - 1 : -1;
}

/**
 * Link point `index` to the waypoint it lies on, if any. A route without
 * metadata gains a `{ name: '' }` entry for every other point. Returns the
 * metadata to keep: `meta` itself, changed in place like the rest of the
 * Modify bookkeeping, or a new array when the route had none; `meta`
 * unchanged when the point is on no waypoint.
 */
export function linkPointOnWaypoint(
  coords: Position[],
  index: number,
  meta: RoutePointMeta[] | undefined,
  waypoints: DrawnWaypoint[],
  lookup: WaypointLookup
): RoutePointMeta[] | undefined {
  const id = index >= 0 ? waypointAt(coords[index], waypoints) : undefined;
  if (!id) {
    return meta;
  }
  const linked = meta ?? coords.map(() => ({ name: '' }));
  linked[index] = waypointLinkMeta(id, lookup);
  return linked;
}
