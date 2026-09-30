/**
 * Temporary routes: a drawn route the user starts without saving it.
 *
 * The Course API follows a route by its resource href and reads the route
 * again on every point change, so the route has to be stored for as long as it
 * is followed. It is stored with a `temporary` marker in its feature
 * properties. The most recent temporary route is kept after it stops being
 * followed, so a detour or a course cleared elsewhere does not lose it; it is
 * deleted when a newer temporary route replaces it, or once it has not been
 * followed for a day.
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

/** A marker time as epoch ms; NaN when missing or unreadable. */
function markerTime(route: RouteLike, key: keyof TemporaryRouteMarker) {
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
 * - every other temporary route.
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
  return temporary
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
    .map(([id]) => id);
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
