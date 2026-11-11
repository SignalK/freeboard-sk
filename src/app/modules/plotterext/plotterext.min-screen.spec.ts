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
import {
  HOST_API_VERSION,
  PlacedWidget,
  PlotterExtensionManifest
} from './types';

describe('PlotterExtensionService widgets by screen size', () => {
  const liveExt = 'live-ext';

  const manifest: PlotterExtensionManifest = {
    name: liveExt,
    apiVersion: HOST_API_VERSION,
    widgets: [
      {
        id: 'gauge',
        title: 'Gauge',
        type: 'iframe',
        url: 'w.html',
        size: '1x1'
      }
    ]
  };

  const phoneWidget: PlacedWidget = {
    instanceId: 'i-phone',
    extension: liveExt,
    widget: 'gauge',
    anchor: 'tr',
    col: 3,
    row: 0
  };
  const tabletWidget: PlacedWidget = {
    instanceId: 'i-tablet',
    extension: liveExt,
    widget: 'gauge',
    anchor: 'br',
    col: 3,
    row: 1,
    minScreen: 'tablet'
  };

  let saveConfig: ReturnType<typeof vi.fn>;
  let service: PlotterExtensionService;
  let widgets: PlacedWidget[];

  beforeEach(() => {
    widgets = [{ ...phoneWidget }, { ...tabletWidget }];
    saveConfig = vi.fn();
    const appStub = {
      config: { plotterExtensions: { widgets } },
      debug: () => {},
      saveConfig
    };

    TestBed.configureTestingModule({
      providers: [
        PlotterExtensionService,
        RouteBufferRegistry,
        { provide: AppFacade, useValue: appStub },
        { provide: SignalKClient, useValue: {} },
        { provide: MatDialog, useValue: {} },
        { provide: SKResourceService, useValue: { routes: signal([]) } },
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

    service.manifests.set({ [liveExt]: manifest });
    (
      service as unknown as { refreshActiveWidgets(): void }
    ).refreshActiveWidgets();
  });

  const shown = () => service.shownWidgets().map((p) => p.instanceId);

  it('hides a tablet widget on a phone', () => {
    service.screenClass.set('phone');
    expect(shown()).toEqual(['i-phone']);
  });

  it('shows it again on a tablet', () => {
    service.screenClass.set('tablet');
    expect(shown()).toEqual(['i-phone', 'i-tablet']);
  });

  it('keeps the hidden widget’s cell taken, so a larger screen never stacks two', () => {
    service.screenClass.set('phone');
    expect(service.cellOccupied('br', { col: 3, row: 1 })).toBe(true);
  });

  it('lifts the action buttons only for widgets the screen shows', () => {
    service.screenClass.set('phone');
    expect(service.actionButtonLift()).toBe(0);
    service.screenClass.set('tablet');
    expect(service.actionButtonLift()).toBeGreaterThan(0);
  });

  it('saves a new minimum screen and drops the key for every screen', () => {
    service.setMinScreen('i-phone', 'monitor');
    expect(widgets[0].minScreen).toBe('monitor');
    service.setMinScreen('i-phone', 'phone');
    expect('minScreen' in widgets[0]).toBe(false);
    expect(saveConfig).toHaveBeenCalledTimes(2);
  });
});
