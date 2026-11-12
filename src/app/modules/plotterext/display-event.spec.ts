import { TestBed } from '@angular/core/testing';
import { signal, type WritableSignal } from '@angular/core';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { SignalKClient } from 'signalk-client-angular';

import { PlotterExtensionService } from './plotterext.service';
import { RouteBufferRegistry } from './route-buffer.registry';
import { AppFacade } from '../../app.facade';
import { ConfigEvent } from '../../lib/services/info.service';
import { SKResourceService } from '../skresources/resources.service';
import { MapService } from '../map/ol/lib/map.service';
import { SKStreamFacade } from '../skstream/skstream.facade';
import { FBCharts } from '../../types';

describe('PlotterExtensionService display.changed event', () => {
  let published: Array<{ event: string; params: unknown }>;
  let service: PlotterExtensionService;
  let config$: Subject<ConfigEvent>;
  let uiCtrl: WritableSignal<{ forceNightMode: boolean; darkTheme: boolean }>;

  const displayEvents = () =>
    published.filter((p) => p.event === 'display.changed');

  const choose = (panelOpacity: number | null) => {
    TestBed.inject(AppFacade).config.display.panelOpacity = panelOpacity;
    config$.next('saved');
  };

  beforeEach(() => {
    config$ = new Subject<ConfigEvent>();
    uiCtrl = signal({ forceNightMode: false, darkTheme: false });
    published = [];
    TestBed.configureTestingModule({
      providers: [
        PlotterExtensionService,
        RouteBufferRegistry,
        {
          provide: AppFacade,
          useValue: {
            config: {
              display: { nightMode: false, panelOpacity: null },
              map: { center: [0, 0], zoomLevel: 5 },
              plotterExtensions: { widgets: [] }
            },
            config$,
            mapExtent: signal<number[]>([]),
            uiCtrl,
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
            charts: signal<FBCharts>([])
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
  });

  // init() starts following the display state; each test chooses when.
  const follow = () =>
    (
      service as unknown as { followDisplayOnce: () => void }
    ).followDisplayOnce();

  it('publishes the new opacity when the user picks one', () => {
    follow();
    choose(0.7);
    expect(displayEvents()).toEqual([
      {
        event: 'display.changed',
        params: { panelOpacity: 0.7, colorScheme: 'light' }
      }
    ]);
    choose(null);
    expect(displayEvents().at(-1)?.params).toEqual({
      panelOpacity: null,
      colorScheme: 'light'
    });
  });

  it('publishes the full state when the theme flips', () => {
    follow();
    choose(0.85);
    uiCtrl.update((c) => ({ ...c, darkTheme: true }));
    TestBed.tick();
    expect(displayEvents().at(-1)?.params).toEqual({
      panelOpacity: 0.85,
      colorScheme: 'dark'
    });
    expect(displayEvents()).toHaveLength(2);
  });

  it('emits nothing when an unrelated UI control changes', () => {
    follow();
    TestBed.tick();
    uiCtrl.update((c) => ({ ...c, forceNightMode: true }));
    TestBed.tick();
    expect(displayEvents()).toHaveLength(0);
  });

  it('seeds silently at init() from the final config, not an earlier theme flip', async () => {
    // The theme resolves while the stored config is still loading; the stored
    // opacity lands before init() without a config$ event reaching us.
    uiCtrl.update((c) => ({ ...c, darkTheme: true }));
    TestBed.tick();
    TestBed.inject(AppFacade).config.display.panelOpacity = 0.7;
    follow();
    TestBed.tick();
    expect(displayEvents()).toHaveLength(0);
    const methods = (
      service as unknown as {
        displayMethods: () => Record<
          string,
          (p: unknown, c: unknown) => Promise<unknown>
        >;
      }
    ).displayMethods();
    expect(await methods['display.get'](undefined, {})).toEqual({
      panelOpacity: 0.7,
      colorScheme: 'dark'
    });
  });

  it('does not publish when a save leaves the opacity as it was', () => {
    follow();
    choose(null);
    expect(displayEvents()).toHaveLength(0);
  });

  it('answers display.get with the current choice', async () => {
    follow();
    choose(0.85);
    const methods = (
      service as unknown as {
        displayMethods: () => Record<
          string,
          (p: unknown, c: unknown) => Promise<unknown>
        >;
      }
    ).displayMethods();
    expect(await methods['display.get'](undefined, {})).toEqual({
      panelOpacity: 0.85,
      colorScheme: 'light'
    });
  });
});
