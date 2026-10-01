import type { SKWaypoint } from '../resource-classes';
import type { PointMeta } from './route-reorder.util';

/** The name and description listed for a route point. */
export interface RoutePointMeta {
  name: string;
  description: string;
}

const generatedName = (index: number) =>
  `RtePt-${('000' + String(index + 1)).slice(-3)}`;

/**
 * Name and description to list for each point of a route. A point that
 * references a saved waypoint shows the waypoint's name, marked `*`; a point
 * without a name gets a generated `RtePt-NNN`.
 */
export function routePointsMeta(
  pointCount: number,
  coordinatesMeta: PointMeta[] | undefined,
  waypoint: (id: string) => SKWaypoint | undefined
): RoutePointMeta[] {
  if (!Array.isArray(coordinatesMeta)) {
    return Array.from({ length: pointCount }, (_, index) => ({
      name: generatedName(index),
      description: ''
    }));
  }
  return coordinatesMeta.map((pt, index) => {
    if (pt?.href) {
      const wpt = waypoint(pt.href.split('/').slice(-1)[0]);
      return wpt
        ? {
            name: `* ${wpt.name || generatedName(index)}`,
            description: wpt.description ? `* ${wpt.description}` : ''
          }
        : { name: '!wpt reference!', description: '' };
    }
    return {
      name: pt?.name ?? generatedName(index),
      description: pt?.description ?? ''
    };
  });
}
