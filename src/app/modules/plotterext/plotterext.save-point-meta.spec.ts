import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { SignalKClient } from 'signalk-client-angular';
import type { RoutePoint } from 'signalk-plotterext-bus/host';

import { PlotterExtensionService } from './plotterext.service';
import { RouteBufferRegistry } from './route-buffer.registry';
import { AppFacade } from '../../app.facade';
import { SKResourceService } from '../skresources/resources.service';
import { MapService } from '../map/ol/lib/map.service';
import { SKStreamFacade } from '../skstream/skstream.facade';
import { FBRoute, Position } from '../../types';

/**
 * `saveBuffer` rebuilds a route's `coordinatesMeta` from its edit buffer (#880).
 * Every entry must carry a `name` (the server rejects `{}`), and a point's
 * waypoint link has to survive loading the stored route into a buffer and
 * saving it again.
 */
const HREF = 'rte-1';
const WPT_A = '/resources/waypoints/aaa';
const WPT_B = '/resources/waypoints/bbb';
const COORDS: Position[] = [
  [24.95, 60.16],
  [24.96, 60.17],
  [24.97, 60.18]
];
const STORED_META = [
  { name: 'Mark', description: 'Red nun', href: WPT_A },
  { href: WPT_B },
  { name: '' }
];

describe('PlotterExtensionService.saveBuffer point metadata (#880)', () => {
  let service: PlotterExtensionService;
  let registry: RouteBufferRegistry;
  let put: ReturnType<typeof vi.fn>;
  let post: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const stored = [
      HREF,
      {
        name: 'Stored',
        description: '',
        distance: 0,
        feature: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: COORDS },
          properties: { coordinatesMeta: STORED_META }
        }
      },
      true
    ] as unknown as FBRoute;
    put = vi.fn(() => Promise.resolve({}));
    post = vi.fn(() => Promise.resolve({ id: 'rte-new' }));

    TestBed.configureTestingModule({
      providers: [
        PlotterExtensionService,
        RouteBufferRegistry,
        {
          provide: AppFacade,
          useValue: {
            // Deep enough for the constructor effects an async test flushes.
            config: {
              plotterExtensions: { widgets: [] },
              display: { nightMode: false },
              map: { center: [0, 0], zoomLevel: 10 }
            },
            data: { editingId: '' },
            mapExtent: signal([]),
            debug: () => {},
            isTopWindow: () => false,
            uiCtrl: signal({ forceNightMode: false })
          }
        },
        { provide: SignalKClient, useValue: {} },
        { provide: MatDialog, useValue: {} },
        {
          provide: SKResourceService,
          useValue: {
            routes: signal([]),
            charts: signal([]),
            fromCache: (_collection: string, id: string) =>
              id === HREF ? stored : undefined,
            buildRoute: (coordinates: unknown) => [
              'new',
              {
                name: '',
                description: '',
                distance: 0,
                feature: {
                  type: 'Feature',
                  geometry: { type: 'LineString', coordinates },
                  properties: {}
                }
              },
              true
            ],
            putToServer: put,
            postToServer: post,
            selectionAdd: () => {}
          }
        },
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
  });

  const savedMeta = (fn: ReturnType<typeof vi.fn>) =>
    (
      fn.mock.calls[0][fn === put ? 2 : 1] as {
        feature: { properties: { coordinatesMeta?: unknown } };
      }
    ).feature.properties.coordinatesMeta;

  it('keeps waypoint links when a stored route is loaded and saved again', async () => {
    // The load path the host uses for route.show and its own mirrors.
    const points = (
      service as unknown as {
        pointsFromRoute: (c: Position[], m: unknown) => RoutePoint[];
      }
    ).pointsFromRoute(COORDS, STORED_META);
    registry.show({ routeId: HREF, name: 'Stored', points, href: HREF });

    await service.saveBuffer(HREF, {});

    expect(savedMeta(put)).toEqual([
      { name: 'Mark', description: 'Red nun', href: WPT_A },
      { name: '', href: WPT_B },
      { name: '' }
    ]);
  });

  it('names every point of a partly named draft', async () => {
    const { routeId } = registry.create({
      points: [
        { position: COORDS[0], name: 'Start' },
        { position: COORDS[1] },
        { position: COORDS[2] }
      ]
    });

    await service.saveBuffer(routeId, { name: 'Draft' });

    expect(post).toHaveBeenCalled();
    expect(savedMeta(post)).toEqual([
      { name: 'Start' },
      { name: '' },
      { name: '' }
    ]);
  });

  it('stores no point metadata for a draft with none', async () => {
    const { routeId } = registry.create({
      points: COORDS.map((position) => ({ position }))
    });

    await service.saveBuffer(routeId, { name: 'Plain' });

    expect(savedMeta(post)).toBeUndefined();
  });
});
