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

// The `map` capability's change event: every settled viewport move (an OL
// moveend, whatever caused it) publishes one `map.view` carrying the same
// { center, zoom, bounds } shape `map.getView` returns.
describe('PlotterExtensionService map.view event', () => {
  let appStub: {
    config: {
      display: { nightMode: boolean };
      map: { center: [number, number]; zoomLevel: number };
      plotterExtensions: { widgets: [] };
    };
    mapExtent: WritableSignal<number[]>;
    uiCtrl: WritableSignal<{ forceNightMode: boolean }>;
    uiConfig: WritableSignal<{ autoNightMode: boolean }>;
    debug: () => void;
  };
  let published: Array<{ event: string; params: unknown }>;
  let service: PlotterExtensionService;

  /** Stand in for the map settling: what fb-map's onMapMoveEnd writes. */
  const moveEnd = (
    center: [number, number],
    zoom: number,
    bounds: number[]
  ) => {
    appStub.config.map.center = center;
    appStub.config.map.zoomLevel = zoom;
    appStub.mapExtent.set(bounds);
    TestBed.tick();
  };

  const getView = () =>
    (
      service as unknown as {
        mapMethods: () => Record<
          string,
          (p: unknown, c: unknown) => Promise<unknown>
        >;
      }
    )
      .mapMethods()
      ['map.getView']({}, {});

  beforeEach(() => {
    published = [];
    appStub = {
      config: {
        display: { nightMode: false },
        map: { center: [-80.19, 25.77], zoomLevel: 13 },
        plotterExtensions: { widgets: [] }
      },
      mapExtent: signal<number[]>([]),
      uiCtrl: signal({ forceNightMode: false }),
      uiConfig: signal({ autoNightMode: false }),
      debug: () => {}
    };

    TestBed.configureTestingModule({
      providers: [
        PlotterExtensionService,
        RouteBufferRegistry,
        { provide: AppFacade, useValue: appStub },
        { provide: SignalKClient, useValue: {} },
        { provide: MatDialog, useValue: {} },
        {
          provide: SKResourceService,
          useValue: { routes: signal([]), charts: signal([]) }
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
    // A live context recording what the host publishes to it, so the real
    // broadcast path runs rather than a stubbed emitter.
    (
      service as unknown as {
        contexts: Set<{
          conn: { publish: (event: string, params: unknown) => void };
        }>;
      }
    ).contexts.add({
      conn: { publish: (event, params) => published.push({ event, params }) }
    });
    // Seed the effect with the starting view; the first run emits nothing.
    TestBed.tick();
  });

  it('publishes map.view once per settled move', () => {
    moveEnd([-80.0, 25.5], 12, [-80.5, 25.0, -79.5, 26.0]);
    const views = published.filter((p) => p.event === 'map.view');
    expect(views).toHaveLength(1);
    expect(views[0].params).toEqual({
      center: [-80.0, 25.5],
      zoom: 12,
      bounds: [-80.5, 25.0, -79.5, 26.0]
    });
  });

  it('publishes the same shape map.getView returns', async () => {
    moveEnd([-64.75, 32.3], 9, [-65.5, 31.8, -64.0, 32.8]);
    const view = published.filter((p) => p.event === 'map.view').at(-1)?.params;
    expect(view).toEqual(await getView());
  });

  it('does not publish on the initial view before the map has moved', () => {
    expect(published.filter((p) => p.event === 'map.view')).toHaveLength(0);
  });

  it('does not publish when a moveend leaves the view where it was', () => {
    moveEnd([-80.0, 25.5], 12, [-80.5, 25.0, -79.5, 26.0]);
    // OL hands us a fresh extent array on every moveend, so an unchanged view
    // still re-assigns the signal — the event must compare values, not refs.
    moveEnd([-80.0, 25.5], 12, [-80.5, 25.0, -79.5, 26.0]);
    expect(published.filter((p) => p.event === 'map.view')).toHaveLength(1);
  });

  it('publishes for a zoom-only change', () => {
    moveEnd([-80.0, 25.5], 12, [-80.5, 25.0, -79.5, 26.0]);
    moveEnd([-80.0, 25.5], 13, [-80.25, 25.25, -79.75, 25.75]);
    const views = published.filter((p) => p.event === 'map.view');
    expect(views).toHaveLength(2);
    expect(views[1].params).toMatchObject({ zoom: 13 });
  });
});
