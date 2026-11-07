import { describe, it, expect } from 'vitest';
import { signal } from '@angular/core';
import { SKResourceService } from './resources.service';
import { FBRoute, FBRoutes } from 'src/app/types/resources/freeboard';

/**
 * The route being followed stays on the map when routes are hidden from the
 * Route list, as refreshRoutes() already keeps it: its line and direction
 * chevrons show the way ahead. Exercised on a bare prototype with a mock app,
 * as in resources-route-hide.spec.
 */
const route = (id: string): FBRoute => [id, {}, true] as unknown as FBRoute;

function svc(
  selections: string[] | null,
  cache: FBRoutes,
  activeRoute: string | null
): SKResourceService {
  const s = Object.create(SKResourceService.prototype) as SKResourceService;
  Object.assign(s as unknown as Record<string, unknown>, {
    app: {
      config: { selections: { routes: selections } },
      data: { activeRoute },
      saveConfig: (): void => undefined
    },
    routeCacheSignal: signal<FBRoutes>(cache)
  });
  return s;
}

const cacheIds = (s: SKResourceService) =>
  (s as unknown as { routeCacheSignal: () => FBRoutes })
    .routeCacheSignal()
    .map((r) => r[0]);

const selectionOf = (s: SKResourceService) =>
  (
    s as unknown as {
      app: { config: { selections: { routes: string[] | null } } };
    }
  ).app.config.selections.routes;

describe('SKResourceService.routeRemove()', () => {
  it('keeps the active route when every route is hidden', () => {
    const s = svc(null, [route('r1'), route('r2')], 'r2');
    s.routeRemove();
    expect(cacheIds(s)).toEqual(['r2']);
    expect(selectionOf(s)).toEqual(['r2']);
  });

  it('keeps the active route when it is hidden on its own', () => {
    const s = svc(['r1', 'r2'], [route('r1'), route('r2')], 'r2');
    s.routeRemove(['r1', 'r2']);
    expect(cacheIds(s)).toEqual(['r2']);
    expect(selectionOf(s)).toEqual(['r2']);
  });

  it('hides every route when none is active', () => {
    const s = svc(null, [route('r1'), route('r2')], null);
    s.routeRemove();
    expect(cacheIds(s)).toEqual([]);
    expect(selectionOf(s)).toEqual([]);
  });
});
