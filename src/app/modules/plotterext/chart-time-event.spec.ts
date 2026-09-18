import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { SignalKClient } from 'signalk-client-angular';

import { PlotterExtensionService } from './plotterext.service';
import { RouteBufferRegistry } from './route-buffer.registry';
import { AppFacade } from '../../app.facade';
import { SKResourceService } from '../skresources/resources.service';
import { SKChart } from '../skresources/resource-classes';
import { MapService } from '../map/ol/lib/map.service';
import { SKStreamFacade } from '../skstream/skstream.facade';
import { FBChart, FBCharts } from '../../types';

/**
 * The `charts.time` change event: a time-varying chart shown at a different
 * instant publishes one `chart.time { id, time }`, whatever moved it — an
 * extension's `chart.setTime` or the user's own Time palette both land in the
 * chart cache, which the service diffs.
 */
describe('PlotterExtensionService chart.time event', () => {
  const T0 = '2026-09-18T12:00:00.000Z';
  const T1 = '2026-09-18T12:05:00.000Z';
  let charts: WritableSignal<FBCharts>;
  let published: Array<{ event: string; params: unknown }>;
  let service: PlotterExtensionService;

  const radar = (id: string, timeValue: string | null): FBChart => {
    const c = new SKChart({
      name: id,
      url: 'http://r/{z}/{x}/{y}.png',
      type: 'tilelayer',
      time: { url: 'http://r/{z}/{x}/{y}.png?t={time}', current: true }
    });
    c.timeValue = timeValue;
    return [id, c, true];
  };

  /** The cache after a retarget, as SKResourceService.chartSetTime writes it. */
  const retarget = (id: string, time: string | null) => {
    charts.update((list) =>
      list.map((c) => (c[0] === id ? radar(id, time) : c))
    );
    TestBed.tick();
  };

  const timeEvents = () => published.filter((p) => p.event === 'chart.time');

  beforeEach(() => {
    published = [];
    charts = signal<FBCharts>([radar('a', null), radar('b', null)]);
    TestBed.configureTestingModule({
      providers: [
        PlotterExtensionService,
        RouteBufferRegistry,
        {
          provide: AppFacade,
          useValue: {
            config: {
              display: { nightMode: false },
              map: { center: [0, 0], zoomLevel: 5 },
              plotterExtensions: { widgets: [] }
            },
            mapExtent: signal<number[]>([]),
            uiCtrl: signal({ forceNightMode: false }),
            uiConfig: signal({ autoNightMode: false }),
            debug: () => {}
          }
        },
        { provide: SignalKClient, useValue: {} },
        { provide: MatDialog, useValue: {} },
        {
          provide: SKResourceService,
          useValue: {
            routes: signal([]),
            charts,
            chartsForHostApi: async () => charts(),
            chartIsTemporal: (c: FBChart) => !!c?.[1]?.time,
            // The real one rebuilds the cache entry; mirror that here so the
            // extension path exercises the same diff the UI path does.
            setChartsTime: (ids: string[], time: string | null) =>
              ids.forEach((id) => retarget(id, time))
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
    (
      service as unknown as {
        contexts: Set<{
          conn: { publish: (event: string, params: unknown) => void };
        }>;
      }
    ).contexts.add({
      conn: { publish: (event, params) => published.push({ event, params }) }
    });
    // Seed the effect; the first run emits nothing.
    TestBed.tick();
  });

  it('publishes chart.time when the user scrubs a chart, and again on return to live', () => {
    retarget('a', T0);
    expect(timeEvents()).toEqual([
      { event: 'chart.time', params: { id: 'a', time: T0 } }
    ]);
    retarget('a', null);
    expect(timeEvents().at(-1)?.params).toEqual({ id: 'a', time: null });
  });

  it('publishes one event per changed chart for an extension batch', async () => {
    const methods = (
      service as unknown as {
        chartMethods: () => Record<
          string,
          (p: unknown, c: unknown) => Promise<unknown>
        >;
      }
    ).chartMethods();
    await methods['chart.setTime']({ ids: ['a', 'b'], time: T1 }, {});
    expect(timeEvents().map((e) => e.params)).toEqual([
      { id: 'a', time: T1 },
      { id: 'b', time: T1 }
    ]);
  });

  it('does not publish for a chart whose instant did not change', () => {
    retarget('a', T0);
    published.length = 0;
    retarget('b', null); // rebuilt, same instant
    expect(timeEvents()).toHaveLength(0);
  });

  it('does not publish on the seeding run', () => {
    expect(timeEvents()).toHaveLength(0);
  });
});
