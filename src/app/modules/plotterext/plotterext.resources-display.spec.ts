import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { SignalKClient } from 'signalk-client-angular';
import type { MethodHandler } from 'signalk-plotterext-bus/host';

import { PlotterExtensionService } from './plotterext.service';
import {
  RouteBufferRegistry,
  type RouteRegistryEvent
} from './route-buffer.registry';
import { AppFacade } from '../../app.facade';
import { SKResourceService } from '../skresources/resources.service';
import { MapService } from '../map/ol/lib/map.service';
import { SKStreamFacade } from '../skstream/skstream.facade';
import { FBRoute, FBRoutes } from '../../types/resources/freeboard';

/**
 * `resources.hide` on a route must be `route.hide` on it: off the chart, durable
 * from the default unfiltered state, and its mirror gone from the visible set
 * even with pending edits (the selection sync keeps dirty buffers). Notes are a
 * whole-layer type: `resources.show` turns the notes layer on.
 *
 * SKResourceService is a bare prototype with a mock app, as in
 * plotterext.route-hide.spec, so the genuine hideStored logic runs.
 */
const route = (id: string): FBRoute => [id, {}, true] as unknown as FBRoute;

const HREF = 'rte-2';
const SERVER_ROUTES = ['rte-1', HREF, 'rte-3'];

describe('PlotterExtensionService resources.display', () => {
  let skres: SKResourceService;
  let registry: RouteBufferRegistry;
  let methods: Record<string, MethodHandler>;
  let uiConfig: ReturnType<typeof signal<{ showNotes: boolean }>>;
  let setChartsVisibility: ReturnType<typeof vi.fn>;
  let events: RouteRegistryEvent[];

  beforeEach(() => {
    skres = Object.create(SKResourceService.prototype) as SKResourceService;
    const routeCacheSignal = signal<FBRoutes>([
      route('rte-1'),
      route(HREF),
      route('rte-3')
    ]);
    const app = {
      config: { selections: { routes: null as string[] | null } },
      data: { activeRoute: null },
      saveConfig: (): void => undefined
    };
    setChartsVisibility = vi.fn(async () => undefined);
    Object.assign(skres as unknown as Record<string, unknown>, {
      app,
      routeCacheSignal,
      routes: routeCacheSignal.asReadonly(),
      // Re-derive the displayed routes from the selection, as the real
      // refresh does from the server's list.
      refreshRoutes: async () => {
        const sel = app.config.selections.routes;
        routeCacheSignal.set(
          SERVER_ROUTES.filter((id) => !sel || sel.includes(id)).map(route)
        );
      },
      setChartsVisibility,
      // Read by the service's chart-event effect, which runs while a call awaits.
      charts: signal([]).asReadonly()
    });
    uiConfig = signal({ showNotes: false });

    TestBed.configureTestingModule({
      providers: [
        PlotterExtensionService,
        RouteBufferRegistry,
        {
          provide: AppFacade,
          useValue: {
            // Deep enough for the constructor effects, which these async tests
            // flush (see plotterext.embedding-host.spec).
            config: {
              plotterExtensions: { widgets: [] },
              display: { nightMode: false },
              map: { center: [0, 0], zoomLevel: 10 }
            },
            mapExtent: signal([]),
            saveConfig: () => {},
            debug: () => {},
            isTopWindow: () => false,
            uiCtrl: signal({ forceNightMode: false }),
            uiConfig
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
    const service = TestBed.inject(PlotterExtensionService);
    registry = TestBed.inject(RouteBufferRegistry);
    events = [];
    registry.events$.subscribe((e) => events.push(e));
    methods = (
      service as unknown as {
        resourceDisplayMethods: () => Record<string, MethodHandler>;
      }
    ).resourceDisplayMethods();
  });

  const call = (method: string, params: unknown) =>
    methods[method](params, {} as never);
  const selection = () =>
    (
      skres as unknown as {
        app: { config: { selections: { routes: string[] | null } } };
      }
    ).app.config.selections.routes;

  it('hides a route durably and drops its mirror, pending edits included', async () => {
    registry.show({ routeId: HREF, name: 'Route 2', points: [], href: HREF });
    registry.replace(HREF, [{ position: [0, 0] }, { position: [1, 1] }]);
    expect(registry.get(HREF)?.dirty).toBe(true);

    await call('resources.hide', { type: 'routes', ids: [HREF] });

    expect(skres.routes().map((r) => r[0])).toEqual(['rte-1', 'rte-3']);
    expect(selection()).toEqual(['rte-1', 'rte-3']);
    expect(registry.getByHref(HREF)).toBeUndefined();
    expect(events.at(-1)).toMatchObject({
      type: 'hidden',
      routeId: HREF,
      saved: true
    });
  });

  it('shows a hidden route, which the selection sync mirrors as route.visible', async () => {
    (
      skres as unknown as {
        app: { config: { selections: { routes: string[] | null } } };
      }
    ).app.config.selections.routes = ['rte-1'];
    await skres.refreshRoutes();
    TestBed.tick();
    events.length = 0;

    await call('resources.show', { type: 'routes', ids: [HREF] });
    TestBed.tick();

    expect(selection()).toEqual(['rte-1', HREF]);
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'visible', routeId: HREF, saved: true })
    );
  });

  it('passes charts to setChartsVisibility', async () => {
    await call('resources.show', { type: 'charts', ids: ['c1'] });
    await call('resources.hide', { type: 'charts', ids: ['c2'] });
    expect(setChartsVisibility.mock.calls).toEqual([
      [['c1'], true],
      [['c2'], false]
    ]);
  });

  it('shows notes by turning the notes layer on', async () => {
    await call('resources.show', { type: 'notes', ids: ['n1'] });
    expect(uiConfig().showNotes).toBe(true);
  });
});
