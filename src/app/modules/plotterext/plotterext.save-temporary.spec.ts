import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { SignalKClient } from 'signalk-client-angular';

import { PlotterExtensionService } from './plotterext.service';
import { RouteBufferRegistry } from './route-buffer.registry';
import { AppFacade } from '../../app.facade';
import { SKResourceService } from '../skresources/resources.service';
import { MapService } from '../map/ol/lib/map.service';
import { SKStreamFacade } from '../skstream/skstream.facade';
import { FBRoute } from '../../types/resources/freeboard';

/**
 * `saveBuffer` rebuilds a stored route from its edit buffer, so a temporary
 * route's marker has to be carried over on purpose: an extension's
 * `route.save` leaves the route temporary, and only the user's own SAVE
 * (`promote`) makes it an ordinary route.
 */
const HREF = 'rte-temp';
const MARKER = { created: '2026-09-30T10:00:00.000Z' };
const COORDS = [
  [24.95, 60.16],
  [24.96, 60.17]
];

describe('PlotterExtensionService.saveBuffer on a temporary route', () => {
  let service: PlotterExtensionService;
  let put: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const stored = [
      HREF,
      {
        name: 'Temporary route',
        description: '',
        distance: 0,
        feature: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: COORDS },
          properties: { temporary: MARKER }
        }
      },
      true
    ] as unknown as FBRoute;
    put = vi.fn(() => Promise.resolve({}));

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
            routes: signal([stored]),
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
            putToServer: put
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
    TestBed.inject(RouteBufferRegistry).show({
      routeId: HREF,
      name: 'Temporary route',
      points: COORDS.map((position) => ({
        position: position as [number, number]
      })),
      href: HREF
    });
  });

  const savedProperties = () =>
    (
      put.mock.calls[0][2] as {
        feature: { properties: Record<string, unknown> };
      }
    ).feature.properties;

  it('leaves it temporary when an extension saves it', async () => {
    await service.saveBuffer(HREF, {});

    expect(put).toHaveBeenCalledWith('routes', HREF, expect.anything());
    expect(savedProperties()['temporary']).toEqual(MARKER);
  });

  it('makes it an ordinary route when the user saves it', async () => {
    await service.saveBuffer(HREF, { promote: true });

    expect(put).toHaveBeenCalledWith('routes', HREF, expect.anything());
    expect(savedProperties()['temporary']).toBeUndefined();
  });
});
