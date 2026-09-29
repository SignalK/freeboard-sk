/**
 * Temporary routes: a drawn route the user starts without saving it.
 *
 * The Course API follows a route by its resource href and reads the route
 * again on every point change, so the route has to be stored for as long as it
 * is followed. It is stored with a `temporary` marker in its feature
 * properties, and Freeboard deletes it once it is no longer the active route.
 */

export const TEMPORARY_ROUTE_NAME = 'Temporary route';

/**
 * How long a temporary route that is not active is left alone before any
 * Freeboard deletes it. Covers the gap between storing a route and the Course
 * API accepting it as the active route, which another client cannot see.
 */
export const TEMPORARY_ROUTE_GRACE_MS = 5 * 60 * 1000;

/** The value of a temporary route's `feature.properties.temporary`. */
export interface TemporaryRouteMarker {
  /** ISO 8601 time the route was stored. */
  created: string;
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

/**
 * Whether a temporary route has outlived the grace period and may be deleted
 * when it is not active. A missing or unreadable creation time counts as
 * expired, so a damaged marker cannot keep a route alive.
 */
export function isTemporaryRouteExpired(
  route: RouteLike,
  now: number,
  graceMs = TEMPORARY_ROUTE_GRACE_MS
): boolean {
  if (!isTemporaryRoute(route)) {
    return false;
  }
  const marker = route.feature.properties['temporary'] as { created?: unknown };
  const created =
    typeof marker.created === 'string' ? Date.parse(marker.created) : NaN;
  return Number.isNaN(created) || now - created >= graceMs;
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
