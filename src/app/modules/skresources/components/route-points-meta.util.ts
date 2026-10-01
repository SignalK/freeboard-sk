import type { SKWaypoint } from '../resource-classes';

/**
 * A route's `feature.properties.coordinatesMeta` entry: either the point's own
 * name/description, or an `href` reference to a saved waypoint.
 */
interface CoordinateMeta {
  name?: string;
  description?: string;
  href?: string;
}

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
  coordinates: unknown[],
  coordinatesMeta: CoordinateMeta[] | undefined,
  waypoint: (id: string) => SKWaypoint | undefined
): RoutePointMeta[] {
  if (!Array.isArray(coordinatesMeta)) {
    return coordinates.map((_, index) => ({
      name: generatedName(index),
      description: ''
    }));
  }
  return coordinatesMeta.map((pt, index) => {
    if (pt?.href) {
      const wpt = waypoint(pt.href.split('/').slice(-1)[0]);
      return wpt
        ? {
            name: `* ${wpt.name}`,
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
