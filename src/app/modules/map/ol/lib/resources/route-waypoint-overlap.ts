import { getWidth } from 'ol/extent';
import { get as getProjection } from 'ol/proj';
import { Coordinate } from '../models';
import { worldCopyOffset } from '../util';

/**
 * A route point and its linked waypoint count as drawn on the same spot when
 * they render within this many pixels of each other. Only one marker is drawn
 * there: the route's start/end marker, or else the waypoint's icon (#991).
 */
export const WAYPOINT_COVER_PX = 3;

const WORLD_WIDTH = getWidth(getProjection('EPSG:3857').getExtent());

/** Per-point route metadata; only the waypoint link matters here. */
export type PointLink = { href?: string } | null | undefined;

/** Waypoint id from a route point's `/resources/waypoints/<id>` link. */
export function linkedWaypointId(link: PointLink): string | undefined {
  return link?.href ? link.href.split('/').slice(-1)[0] : undefined;
}

/**
 * True when two render-space (EPSG:3857) positions are drawn within
 * WAYPOINT_COVER_PX of each other at `resolution` (map units per pixel).
 * A route crossing the antimeridian is rendered unwrapped, so the positions
 * are compared within the same world copy.
 */
export function drawnTogether(
  a: number[],
  b: Coordinate | number[],
  resolution: number
): boolean {
  if (!(resolution > 0)) {
    return false;
  }
  const dx0 = a[0] - b[0];
  const dx = dx0 - worldCopyOffset(dx0, WORLD_WIDTH);
  return Math.hypot(dx, a[1] - b[1]) / resolution <= WAYPOINT_COVER_PX;
}
