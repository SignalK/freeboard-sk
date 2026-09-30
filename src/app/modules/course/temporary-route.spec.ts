import { describe, it, expect } from 'vitest';
import {
  isTemporaryRoute,
  routeIdFromHref,
  TEMPORARY_ROUTE_GRACE_MS,
  TEMPORARY_ROUTE_KEEP_MS,
  temporaryRouteMarker,
  temporaryRoutesToDelete
} from './temporary-route';

const route = (properties: { [name: string]: unknown } | null) => ({
  feature: { properties }
});

const NOW = Date.parse('2026-09-30T12:00:00.000Z');
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const iso = (t: number) => new Date(t).toISOString();

/** A temporary route stored `createdAgo` ago, optionally released `releasedAgo` ago. */
const temp = (createdAgo: number, releasedAgo?: number) =>
  route({
    temporary: {
      created: iso(NOW - createdAgo),
      ...(releasedAgo !== undefined ? { released: iso(NOW - releasedAgo) } : {})
    }
  });

describe('temporary route marker', () => {
  it('records when the route was stored', () => {
    expect(temporaryRouteMarker(new Date(NOW))).toEqual({
      created: '2026-09-30T12:00:00.000Z'
    });
  });

  it('recognises a route carrying the marker', () => {
    expect(isTemporaryRoute(temp(0))).toBe(true);
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

describe('temporaryRoutesToDelete', () => {
  it('keeps the route being followed', () => {
    const routes: Array<[string, ReturnType<typeof route>]> = [
      ['a', temp(3 * HOUR)],
      ['b', temp(2 * HOUR, HOUR)]
    ];
    expect(temporaryRoutesToDelete(routes, 'a', NOW)).toEqual([]);
  });

  it('keeps the most recent temporary route for a day after it stopped', () => {
    const released = TEMPORARY_ROUTE_KEEP_MS - MIN;
    expect(
      temporaryRoutesToDelete(
        [['a', temp(2 * TEMPORARY_ROUTE_KEEP_MS, released)]],
        null,
        NOW
      )
    ).toEqual([]);
  });

  it('deletes the most recent temporary route a day after it stopped', () => {
    expect(
      temporaryRoutesToDelete(
        [['a', temp(2 * TEMPORARY_ROUTE_KEEP_MS, TEMPORARY_ROUTE_KEEP_MS)]],
        null,
        NOW
      )
    ).toEqual(['a']);
  });

  it('counts from when it was stored if no Freeboard saw it stop', () => {
    expect(
      temporaryRoutesToDelete(
        [['a', temp(TEMPORARY_ROUTE_KEEP_MS - MIN)]],
        null,
        NOW
      )
    ).toEqual([]);
    expect(
      temporaryRoutesToDelete([['a', temp(TEMPORARY_ROUTE_KEEP_MS)]], null, NOW)
    ).toEqual(['a']);
  });

  it('deletes every older temporary route that is not followed', () => {
    const routes: Array<[string, ReturnType<typeof route>]> = [
      ['oldest', temp(5 * HOUR, 4 * HOUR)],
      ['older', temp(3 * HOUR)],
      ['latest', temp(2 * HOUR, HOUR)]
    ];
    expect(temporaryRoutesToDelete(routes, null, NOW)).toEqual([
      'oldest',
      'older'
    ]);
  });

  it('leaves a never-followed route inside the grace period', () => {
    // another Freeboard stored it and is about to start it
    const routes: Array<[string, ReturnType<typeof route>]> = [
      ['pending', temp(TEMPORARY_ROUTE_GRACE_MS - MIN)],
      ['latest', temp(TEMPORARY_ROUTE_GRACE_MS - 2 * MIN)]
    ];
    expect(temporaryRoutesToDelete(routes, 'latest', NOW)).toEqual([]);
  });

  it('does not apply the grace period to a route that has been followed', () => {
    const routes: Array<[string, ReturnType<typeof route>]> = [
      ['replaced', temp(2 * MIN, MIN)],
      ['latest', temp(MIN)]
    ];
    expect(temporaryRoutesToDelete(routes, 'latest', NOW)).toEqual([
      'replaced'
    ]);
  });

  it('never keeps a route with an unreadable creation time as the latest', () => {
    const routes: Array<[string, ReturnType<typeof route>]> = [
      ['damaged', route({ temporary: { created: 'soon' } })],
      ['latest', temp(HOUR)]
    ];
    expect(temporaryRoutesToDelete(routes, null, NOW)).toEqual(['damaged']);
  });

  it('ignores routes that are not temporary', () => {
    const routes: Array<[string, ReturnType<typeof route>]> = [
      ['passage', route({})],
      ['latest', temp(HOUR, MIN)]
    ];
    expect(temporaryRoutesToDelete(routes, null, NOW)).toEqual([]);
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
