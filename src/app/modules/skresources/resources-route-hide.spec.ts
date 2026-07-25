import { describe, it, expect } from 'vitest';
import { signal } from '@angular/core';
import { SKResourceService } from './resources.service';
import { FBRoute, FBRoutes } from 'src/app/types/resources/freeboard';

/**
 * Regression tests for the route popover "Hide" action (#551). Hiding a route
 * from the map popover must have the same durable effect as unchecking "Show on
 * Map" in the Route list: the route leaves the displayed cache AND the selection
 * is updated so it stays hidden across a refresh.
 *
 * The trap: while a collection is unfiltered (`selections.routes === null`,
 * "show all"), `selectionRemove` is a no-op — removing only from the cache would
 * let the route reappear on the next `refreshRoutes()` (and leave the Route list
 * checkbox ticked). `routeHide` must first materialise the currently-shown
 * routes into an explicit selection.
 *
 * `routeHide` only touches `this.app.config.selections` and the route cache
 * signal, so exercise it on a bare prototype with a mock app — no Angular DI.
 * `app` / `routeCacheSignal` are private, so assign and read them via narrow
 * casts (same approach as resources-charts-opacity.spec).
 */
const route = (id: string): FBRoute => [id, {}, true] as unknown as FBRoute;

function svc(selections: string[] | null, cache: FBRoutes): SKResourceService {
  const s = Object.create(SKResourceService.prototype) as SKResourceService;
  Object.assign(s as unknown as Record<string, unknown>, {
    app: {
      config: { selections: { routes: selections } },
      saveConfig: () => undefined
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

describe('SKResourceService.routeHide (#551)', () => {
  it('removes the route from the displayed cache', () => {
    const s = svc(null, [route('r1'), route('r2'), route('r3')]);
    s.routeHide('r2');
    expect(cacheIds(s)).toEqual(['r1', 'r3']);
  });

  it('makes the hide durable from an unfiltered collection (materialises the selection)', () => {
    const s = svc(null, [route('r1'), route('r2'), route('r3')]);
    s.routeHide('r2');
    // Unfiltered ("show all") became an explicit whitelist of the routes that
    // remain shown — so the hidden route does not reappear on the next refresh.
    expect(selectionOf(s)).toEqual(['r1', 'r3']);
  });

  it('removes the id from an already-filtered selection', () => {
    const s = svc(['r1', 'r2', 'r3'], [route('r1'), route('r2'), route('r3')]);
    s.routeHide('r2');
    expect(selectionOf(s)).toEqual(['r1', 'r3']);
    expect(cacheIds(s)).toEqual(['r1', 'r3']);
  });
});
