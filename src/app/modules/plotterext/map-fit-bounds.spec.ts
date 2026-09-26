import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { SignalKClient } from 'signalk-client-angular';

import { PlotterExtensionService } from './plotterext.service';
import { RouteBufferRegistry } from './route-buffer.registry';
import { AppFacade } from '../../app.facade';
import { SKResourceService } from '../skresources/resources.service';
import { MapService } from '../map/ol/lib/map.service';
import { SKStreamFacade } from '../skstream/skstream.facade';
import { FIT_MAX_ZOOM } from '../../lib/map-fit';

type MoveRequest = { center: [number, number]; zoom?: number } | null;

// `map.fitBounds` (#847): a box is [west, south, east, north], west > east
// across the antimeridian, and the unwrapped form a map engine uses is the
// same box. Either is fitted the short way round.
describe('PlotterExtensionService map.fitBounds', () => {
  let mapMoveRequest: WritableSignal<MoveRequest>;
  let rotation: number;
  let service: PlotterExtensionService;

  const fitBounds = (bounds: unknown) => {
    const methods = (
      service as unknown as {
        mapMethods: () => Record<
          string,
          (p: unknown, c: unknown) => Promise<unknown>
        >;
      }
    ).mapMethods();
    return methods['map.fitBounds']({ bounds }, {});
  };

  beforeEach(() => {
    mapMoveRequest = signal<MoveRequest>(null);
    rotation = 0;
    TestBed.configureTestingModule({
      providers: [
        PlotterExtensionService,
        RouteBufferRegistry,
        {
          provide: AppFacade,
          useValue: {
            config: {
              display: { nightMode: false },
              map: { center: [-80.19, 25.77], zoomLevel: 13 },
              plotterExtensions: { widgets: [] }
            },
            mapExtent: signal<number[]>([]),
            mapMoveRequest,
            MAP_ZOOM_EXTENT: { min: 2, max: 28 },
            uiCtrl: signal({ forceNightMode: false }),
            uiConfig: signal({ autoNightMode: false }),
            debug: () => {}
          }
        },
        { provide: SignalKClient, useValue: {} },
        { provide: MatDialog, useValue: {} },
        {
          provide: SKResourceService,
          useValue: { routes: signal([]), charts: signal([]) }
        },
        {
          provide: MapService,
          useValue: {
            getMaps: () => [
              {
                getSize: () => [1000, 400],
                getView: () => ({ getRotation: () => rotation })
              }
            ]
          }
        },
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
  });

  it('centres a box across the antimeridian near 180, not on Greenwich', async () => {
    await fitBounds([175, -21, -175, -13]);
    const req = mapMoveRequest();
    expect(Math.abs(req.center[0])).toBeCloseTo(180, 6);
    expect(req.center[1]).toBeGreaterThan(-21);
    expect(req.center[1]).toBeLessThan(-13);
  });

  it('fits the unwrapped form of that box to the same view', async () => {
    await fitBounds([175, -21, -175, -13]);
    const wrapped = mapMoveRequest();
    await fitBounds([175, -21, 185, -13]);
    const unwrapped = mapMoveRequest();
    expect(unwrapped.zoom).toBeCloseTo(wrapped.zoom, 6);
    expect(Math.abs(unwrapped.center[0])).toBeCloseTo(180, 6);
    // ten degrees wide, the same zoom as any other ten-degree box
    await fitBounds([-5, -21, 5, -13]);
    expect(mapMoveRequest().zoom).toBeCloseTo(wrapped.zoom, 6);
  });

  it('centres on the Web Mercator middle of the box', async () => {
    await fitBounds([-81, 20, -80, 60]);
    const [lon, lat] = mapMoveRequest().center;
    expect(lon).toBeCloseTo(-80.5, 6);
    // the Mercator middle of 20..60 lies north of the plain average, 40
    expect(lat).toBeGreaterThan(40);
    expect(lat).toBeLessThan(60);
  });

  it('fits the box as it lies on a rotated map', async () => {
    await fitBounds([-100, 20, -90, 21]); // wide and flat, on a wide map
    const northUp = mapMoveRequest().zoom;
    rotation = Math.PI / 2; // now it runs up the map's short side
    await fitBounds([-100, 20, -90, 21]);
    expect(mapMoveRequest().zoom).toBeLessThan(northUp - 1);
  });

  it('zooms a single-point box no deeper than the fit cap, not the map maximum', async () => {
    await fitBounds([-81, 24, -81, 24]);
    expect(mapMoveRequest().zoom).toBe(FIT_MAX_ZOOM);
    const [lon, lat] = mapMoveRequest().center;
    expect(lon).toBeCloseTo(-81, 9);
    expect(lat).toBeCloseTo(24, 9);
  });

  it('rejects what is not a box', async () => {
    for (const bad of [undefined, [1, 2, 3], [0, 10, 1, 5], [0, -95, 1, 5]]) {
      await expect(fitBounds(bad)).rejects.toMatchObject({
        data: { reason: 'INVALID_BOUNDS' }
      });
    }
    expect(mapMoveRequest()).toBeNull();
  });
});
