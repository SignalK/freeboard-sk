import type { RoutePoint } from 'signalk-plotterext-bus/host';
import type { Position } from 'src/app/types';

/** Per-point metadata as stored in a route's `feature.properties.coordinatesMeta`. */
interface PointMeta {
  name?: string;
  description?: string;
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
 * Build route-buffer points from reordered coordinates, carrying each point's
 * name/description so a reorder doesn't drop per-point metadata.
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
      ...(m?.description ? { description: m.description } : {})
    };
  });
}
