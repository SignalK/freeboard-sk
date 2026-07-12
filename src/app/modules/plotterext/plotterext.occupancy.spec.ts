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
import {
  HOST_API_VERSION,
  PlacedWidget,
  PlotterExtensionManifest
} from './types';

// Regression coverage for #433: a placement whose providing extension is gone
// (disabled / uninstalled / renamed) must not keep its anchor cell occupied.
// The cell renders empty (filtered out of activeWidgets), so it must also be
// long-pressable again — i.e. cellOccupied() must report it free.
describe('PlotterExtensionService occupancy (#433)', () => {
  const liveExt = 'live-ext';
  const orphanExt = 'gone-ext';

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

  const livePlacement: PlacedWidget = {
    instanceId: 'i-live',
    extension: liveExt,
    widget: 'gauge',
    anchor: 'tr',
    col: 3,
    row: 0
  };
  // Same shape, but its extension has no (longer a) manifest.
  const orphanPlacement: PlacedWidget = {
    instanceId: 'i-orphan',
    extension: orphanExt,
    widget: 'gauge',
    anchor: 'tr',
    col: 0,
    row: 0
  };

  let service: PlotterExtensionService;
  let widgets: PlacedWidget[];

  beforeEach(() => {
    widgets = [livePlacement, orphanPlacement];
    const appStub = {
      config: { plotterExtensions: { widgets } },
      debug: () => {}
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

    // Only the live extension's manifest is present; the orphan's is gone.
    service.manifests.set({ [liveExt]: manifest });
    // Exercise the real filter that drives the overlay.
    (
      service as unknown as { refreshActiveWidgets(): void }
    ).refreshActiveWidgets();
  });

  it('drops the orphaned placement from the rendered set', () => {
    expect(service.activeWidgets().map((p) => p.instanceId)).toEqual([
      'i-live'
    ]);
  });

  it('reports the orphaned placement’s cell as free so it stays long-pressable', () => {
    expect(service.cellOccupied('tr', { col: 0, row: 0 })).toBe(false);
  });

  it('still reports the live placement’s cell as occupied', () => {
    expect(service.cellOccupied('tr', { col: 3, row: 0 })).toBe(true);
  });
});
