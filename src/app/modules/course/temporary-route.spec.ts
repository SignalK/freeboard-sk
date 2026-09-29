import { describe, it, expect } from 'vitest';
import {
  isTemporaryRoute,
  isTemporaryRouteExpired,
  routeIdFromHref,
  TEMPORARY_ROUTE_GRACE_MS,
  temporaryRouteMarker
} from './temporary-route';

const route = (properties: { [name: string]: unknown } | null) => ({
  feature: { properties }
});

const CREATED = Date.parse('2026-09-30T10:00:00.000Z');

describe('temporary route marker', () => {
  it('records when the route was stored', () => {
    expect(temporaryRouteMarker(new Date(CREATED))).toEqual({
      created: '2026-09-30T10:00:00.000Z'
    });
  });

  it('recognises a route carrying the marker', () => {
    const marker = temporaryRouteMarker(new Date(CREATED));
    expect(isTemporaryRoute(route({ temporary: marker }))).toBe(true);
  });

  it('does not treat other routes as temporary', () => {
    expect(isTemporaryRoute(route({}))).toBe(false);
    expect(isTemporaryRoute(route(null))).toBe(false);
    expect(isTemporaryRoute({})).toBe(false);
    expect(isTemporaryRoute(undefined)).toBe(false);
  });

  it("ignores another app's plain `temporary` flag", () => {
    expect(isTemporaryRoute(route({ temporary: true }))).toBe(false);
    expect(isTemporaryRoute(route({ temporary: null }))).toBe(false);
  });
});

describe('isTemporaryRouteExpired', () => {
  const temporary = route({
    temporary: temporaryRouteMarker(new Date(CREATED))
  });

  it('keeps a temporary route inside the grace period', () => {
    expect(
      isTemporaryRouteExpired(temporary, CREATED + TEMPORARY_ROUTE_GRACE_MS - 1)
    ).toBe(false);
  });

  it('expires a temporary route once the grace period has passed', () => {
    expect(
      isTemporaryRouteExpired(temporary, CREATED + TEMPORARY_ROUTE_GRACE_MS)
    ).toBe(true);
  });

  it('expires a temporary route whose creation time is unreadable', () => {
    expect(
      isTemporaryRouteExpired(
        route({ temporary: { created: 'soon' } }),
        CREATED
      )
    ).toBe(true);
    expect(isTemporaryRouteExpired(route({ temporary: {} }), CREATED)).toBe(
      true
    );
  });

  it('never expires a route that is not temporary', () => {
    expect(isTemporaryRouteExpired(route({}), CREATED + 10 ** 12)).toBe(false);
  });
});

describe('routeIdFromHref', () => {
  it('takes the id from a Course API route href', () => {
    expect(routeIdFromHref('/resources/routes/abc-123')).toBe('abc-123');
  });

  it('returns null without an href', () => {
    expect(routeIdFromHref(undefined)).toBeNull();
    expect(routeIdFromHref(null)).toBeNull();
    expect(routeIdFromHref('')).toBeNull();
  });
});
