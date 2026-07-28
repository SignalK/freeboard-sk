import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { SignalKClient } from 'signalk-client-angular';

import { PlotterExtensionService } from './plotterext.service';
import { RouteBufferRegistry } from './route-buffer.registry';
import { AppFacade } from '../../app.facade';
import { SKResourceService } from '../skresources/resources.service';
import { MapService } from '../map/ol/lib/map.service';
import { SKStreamFacade } from '../skstream/skstream.facade';
import { FBRoute, FBRoutes } from '../../types/resources/freeboard';

/**
 * Regression coverage for #592: `route.hide` on a saved route must take the
 * route off the chart in the default "show all" state, not only once the Route
 * list has been filtered.
 *
 * The trap: while `selections.routes === null` (unfiltered) `selectionRemove`
 * is a no-op and `refreshRoutes()` re-derives the full set, so hiding through
 * the raw selection API left the route displayed while the registry deleted its
 * mirror and emitted `route.hidden` — host and extension disagreeing.
 * `hideRoute` must go through `SKResourceService.routeHide`, which materialises
 * the shown routes into an explicit selection first.
 *
 * The SKResourceService stub is a bare prototype with a mock app (same approach
 * as resources-route-hide.spec) so the genuine `routeHide` logic runs rather
 * than a fake standing in for it.
 */
const route = (id: string): FBRoute => [id, {}, true] as unknown as FBRoute;

const HREF = 'rte-2';

describe('PlotterExtensionService.hideRoute (#592)', () => {
  let service: PlotterExtensionService;
  let skres: SKResourceService;
  let registry: RouteBufferRegistry;

  /** @param selections null = unfiltered ("show all"), the default state. */
  const setup = (selections: string[] | null) => {
    skres = Object.create(SKResourceService.prototype) as SKResourceService;
    const routeCacheSignal = signal<FBRoutes>([
      route('rte-1'),
      route(HREF),
      route('rte-3')
    ]);
    Object.assign(skres as unknown as Record<string, unknown>, {
      app: {
        config: { selections: { routes: selections } },
        saveConfig: () => undefined
      },
      routeCacheSignal,
      routes: routeCacheSignal.asReadonly()
    });

    TestBed.configureTestingModule({
      providers: [
        PlotterExtensionService,
        RouteBufferRegistry,
        {
          provide: AppFacade,
          useValue: {
            config: { plotterExtensions: { widgets: [] } },
            debug: () => {}
          }
        },
        { provide: SignalKClient, useValue: {} },
        { provide: MatDialog, useValue: {} },
        { provide: SKResourceService, useValue: skres },
        { provide: MapService, useValue: {} },
        {
          provide: SKStreamFacade,
          useValue: {
            selfNightMode: signal(false),
            refreshSelfNightMode: () => {}
          }
        }
      ]
    });
    service = TestBed.inject(PlotterExtensionService);
    registry = TestBed.inject(RouteBufferRegistry);
    // Mirror the saved route as an extension would see it after route.show.
    registry.show({ routeId: HREF, name: 'Route 2', points: [], href: HREF });
  };

  const cacheIds = () => skres.routes().map((r: FBRoute) => r[0]);
  const selection = () =>
    (
      skres as unknown as {
        app: { config: { selections: { routes: string[] | null } } };
      }
    ).app.config.selections.routes;

  describe('from an unfiltered ("show all") collection', () => {
    beforeEach(() => setup(null));

    it('removes the route from the displayed set', () => {
      service.hideRoute(HREF);
      expect(cacheIds()).toEqual(['rte-1', 'rte-3']);
    });

    it('makes the hide survive a route refresh', () => {
      service.hideRoute(HREF);
      // "Show all" became an explicit whitelist of what remains shown, so the
      // hidden route is not restored when the cache is next re-derived.
      expect(selection()).toEqual(['rte-1', 'rte-3']);
    });

    it('drops the registry mirror as a hidden-but-saved route', () => {
      service.hideRoute(HREF);
      expect(registry.get(HREF)).toBeUndefined();
    });
  });

  // The filtered path already worked, but via a server round-trip; assert it
  // keeps working and now updates the displayed set locally.
  describe('from an already-filtered collection', () => {
    beforeEach(() => setup(['rte-1', HREF, 'rte-3']));

    it('still removes the route from the selection and the displayed set', () => {
      service.hideRoute(HREF);
      expect(selection()).toEqual(['rte-1', 'rte-3']);
      expect(cacheIds()).toEqual(['rte-1', 'rte-3']);
    });
  });
});
