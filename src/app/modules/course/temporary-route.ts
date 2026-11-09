/**
 * Temporary routes: a drawn route the user starts without saving it.
 *
 * The Course API follows a route by its resource href and reads the route
 * again on every point change, so the route has to be stored for as long as it
 * is followed. It is stored with a `temporary` marker in its feature
 * properties. The most recent temporary route is kept after it stops being
 * followed, so a detour or a course cleared elsewhere does not lose it; it is
 * deleted when a newer temporary route replaces it, or once it has not been
 * followed for a day. A temporary route cut short with END HERE does not
 * replace the route it was cut from, which is kept as long as the copy is.
 * Saving it under a name removes the marker.
 */

export const TEMPORARY_ROUTE_NAME = 'Temporary route';

/**
 * How long a temporary route that has never been followed is left alone before
 * any Freeboard deletes it. Covers the gap between storing a route and the
 * Course API accepting it as the active route, which another client cannot see.
 */
export const TEMPORARY_ROUTE_GRACE_MS = 5 * 60 * 1000;

/** How long the most recent temporary route is kept once it is not followed. */
export const TEMPORARY_ROUTE_KEEP_MS = 24 * 60 * 60 * 1000;

/** The value of a temporary route's `feature.properties.temporary`. */
export interface TemporaryRouteMarker {
  /** ISO 8601 time the route was stored. */
  created: string;
  /** ISO 8601 time the route last stopped being followed. */
  released?: string;
  /** The temporary route this one was cut from by END HERE. The source is
   *  kept while this route is, so the user can still go back to it. */
  source?: string;
}

type RouteLike =
  | { feature?: { properties?: { [name: string]: unknown } | null } }
  | null
  | undefined;

export function temporaryRouteMarker(now: Date): TemporaryRouteMarker {
  return { created: now.toISOString() };
}

export function isTemporaryRoute(route: RouteLike): boolean {
  const marker = route?.feature?.properties?.['temporary'];
  return typeof marker === 'object' && marker !== null;
}

/** Make a temporary route an ordinary saved route. */
export function promoteTemporaryRoute(route: RouteLike) {
  if (route?.feature?.properties) {
    delete route.feature.properties['temporary'];
  }
}

/** A marker time as epoch ms; NaN when missing or unreadable. */
function markerTime(route: RouteLike, key: 'created' | 'released') {
  const value = (
    route?.feature?.properties?.['temporary'] as Record<string, unknown>
  )?.[key];
  return typeof value === 'string' ? Date.parse(value) : NaN;
}

/**
 * The temporary routes to delete, given every stored route and the route the
 * server is following:
 * - never a route being followed, nor one stored within the grace period that
 *   has never been followed (another client may be about to start it);
 * - the most recent temporary route once it has not been followed for
 *   `keepMs`, counted from when it stopped (from when it was stored if no
 *   Freeboard saw it stop);
 * - every other temporary route;
 * - but never the source of a temporary route that is kept.
 *
 * A missing or unreadable creation time sorts oldest and never counts as
 * recent, so a damaged marker cannot keep a route alive.
 */
export function temporaryRoutesToDelete(
  routes: ReadonlyArray<readonly [string, RouteLike, ...unknown[]]>,
  activeId: string | null,
  now: number,
  opts: { graceMs?: number; keepMs?: number } = {}
): string[] {
  const graceMs = opts.graceMs ?? TEMPORARY_ROUTE_GRACE_MS;
  const keepMs = opts.keepMs ?? TEMPORARY_ROUTE_KEEP_MS;
  const temporary = routes.filter(([, route]) => isTemporaryRoute(route));
  const createdOf = (route: RouteLike) => {
    const t = markerTime(route, 'created');
    return Number.isNaN(t) ? -Infinity : t;
  };
  let newest: string | null = null;
  let newestCreated = -Infinity;
  for (const [id, route] of temporary) {
    const created = createdOf(route);
    if (newest === null || created > newestCreated) {
      newest = id;
      newestCreated = created;
    }
  }
  const due = new Set(
    temporary
      .filter(([id, route]) => {
        if (id === activeId) {
          return false;
        }
        const released = markerTime(route, 'released');
        if (Number.isNaN(released) && now - createdOf(route) < graceMs) {
          return false;
        }
        if (id === newest) {
          const since = Number.isNaN(released) ? createdOf(route) : released;
          return now - since >= keepMs;
        }
        return true;
      })
      .map(([id]) => id)
  );
  // A kept route keeps its source, which keeps its own source in turn.
  let spared = true;
  while (spared) {
    spared = false;
    for (const [id, route] of temporary) {
      const source = sourceOf(route);
      if (!due.has(id) && source && due.delete(source)) {
        spared = true;
      }
    }
  }
  return [...due];
}

function sourceOf(route: RouteLike): string | null {
  const value = (
    route?.feature?.properties?.['temporary'] as Record<string, unknown>
  )?.['source'];
  return typeof value === 'string' ? value : null;
}

/** The route id at the end of a Course API href (`/resources/routes/<id>`). */
export function routeIdFromHref(
  href: string | null | undefined
): string | null {
  if (!href) {
    return null;
  }
  const parts = href.split('/');
  return parts[parts.length - 1] || null;
}

/**
 * Whether the active route can end at point `endIndex`, both counted in the
 * order the route is followed like `nextIndex`, the point being headed for:
 * the point must not be behind the vessel, the shortened route needs two
 * points, and ending at the last point changes nothing.
 */
export function canEndRouteAt(
  endIndex: number,
  nextIndex: number,
  total: number
): boolean {
  return endIndex >= Math.max(nextIndex, 1) && endIndex < total - 1;
}

/**
 * The stored route's `items` (its points, or their metadata) up to and
 * including point `endIndex` in the order the route is followed, laid out in
 * that order, so the copy is followed forwards.
 */
export function followedRouteUpTo<T>(
  items: ReadonlyArray<T>,
  endIndex: number,
  reversed: boolean
): T[] {
  const followed = reversed ? [...items].reverse() : [...items];
  return followed.slice(0, endIndex + 1);
}

/** Longitudes a whole turn apart can differ by rounding after the shift. */
const LONGITUDE_EPSILON = 1e-9;

function sameLongitude(a: number, b: number): boolean {
  const turns = (a - b) / 360;
  return Math.abs(turns - Math.round(turns)) * 360 < LONGITUDE_EPSILON;
}

/**
 * Whether two lists of route points hold the same positions in order. A
 * longitude matches its equivalents a whole turn away (181° is -179°), as a
 * route edited across the antimeridian may store either.
 */
export function samePoints(
  a: ReadonlyArray<ReadonlyArray<number>>,
  b: ReadonlyArray<ReadonlyArray<number>>
): boolean {
  return (
    a.length === b.length &&
    a.every(
      (p, i) =>
        p.length === b[i].length &&
        sameLongitude(p[0], b[i][0]) &&
        p.every((v, j) => j === 0 || v === b[i][j])
    )
  );
}
