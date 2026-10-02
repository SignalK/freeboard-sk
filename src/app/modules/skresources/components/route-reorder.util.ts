import type { RoutePoint } from 'signalk-plotterext-bus/host';
import type { Position } from 'src/app/types';

/**
 * Per-point metadata as stored in a route's `feature.properties.coordinatesMeta`:
 * the point's own name/description, or an `href` reference to a saved waypoint.
 */
export interface PointMeta {
  name?: string;
  description?: string;
  href?: string;
}

/**
 * Whether a route's point reorder should edit the in-memory route buffer rather
 * than persist straight to the server. True for an unsaved draft or a route with
 * pending edits — persistence then stays deferred to an explicit Save (#583).
 */
export function editsRouteBuffer(
  buffer: { saved: boolean; dirty: boolean } | undefined
): boolean {
  return !!buffer && (!buffer.saved || buffer.dirty);
}

/**
 * Build route-buffer points from coordinates and their `coordinatesMeta`,
 * carrying each point's name, description and waypoint link (`href`) so a load,
 * reorder or edit doesn't drop per-point metadata (#880).
 */
export function buildRoutePoints(
  points: Position[],
  coordsMeta?: PointMeta[]
): RoutePoint[] {
  return points.map((position, i) => {
    const m = Array.isArray(coordsMeta) ? coordsMeta[i] : undefined;
    return {
      position,
      ...(m?.name ? { name: m.name } : {}),
      ...(m?.description ? { description: m.description } : {}),
      ...(m?.href ? { href: m.href } : {})
    };
  });
}

/**
 * The `coordinatesMeta` to store for a route's points, or undefined when no
 * point carries a name, description or waypoint link.
 *
 * Every entry has a `name` (`''` for an unnamed point): the server rejects an
 * empty `{}` entry, and readers that look only at `name` (course point names,
 * other apps) need one on a waypoint-linked point too (#880). An unnamed point
 * stores `''` rather than a generated `RtePt-NNN`, which would be persisted and
 * then go stale once the points are reordered; readers generate one for display.
 */
export function coordinatesMetaFromPoints(
  points: Array<Pick<RoutePoint, 'name' | 'description' | 'href'>>
): PointMeta[] | undefined {
  if (!points.some((p) => p.name || p.description || p.href)) {
    return undefined;
  }
  return points.map((p) => ({
    name: p.name ?? '',
    ...(p.description ? { description: p.description } : {}),
    ...(p.href ? { href: p.href } : {})
  }));
}
