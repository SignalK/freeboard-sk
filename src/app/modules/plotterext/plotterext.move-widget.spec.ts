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

// Moving a placed widget: drop targets follow the add-widget packing rules,
// the widget's own cells count as free, and a drop rewrites only the
// placement's anchor/col/row (the stored shape is unchanged).
describe('PlotterExtensionService moving a widget', () => {
  const ext = 'ext';
  const manifest: PlotterExtensionManifest = {
    name: ext,
    apiVersion: HOST_API_VERSION,
    widgets: [
      {
        id: 'strip',
        title: 'Strip',
        type: 'iframe',
        url: 'w.html',
        size: '1x2'
      }
    ]
  };
  const strip = (
    instanceId: string,
    anchor: PlacedWidget['anchor'],
    col: number
  ): PlacedWidget => ({
    instanceId,
    extension: ext,
    widget: 'strip',
    anchor,
    col,
    row: 0
  });

  let service: PlotterExtensionService;
  let widgets: PlacedWidget[];
  let saves: number;

  beforeEach(() => {
    // The layout from the field report: four strips fill bottom-right, one
    // sits alone bottom-center.
    widgets = [
      strip('br0', 'br', 0),
      strip('br1', 'br', 1),
      strip('br2', 'br', 2),
      strip('br3', 'br', 3),
      strip('sog', 'cb', 0)
    ];
    saves = 0;
    const appStub = {
      config: { plotterExtensions: { widgets } },
      debug: () => {},
      saveConfig: () => saves++
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
    service.manifests.set({ [ext]: manifest });
    (
      service as unknown as { refreshActiveWidgets(): void }
    ).refreshActiveWidgets();
  });

  it('offers every free cell the widget fits, but not its own spot', () => {
    service.startMove('sog');
    const targets = service.moveTargets();
    // its own column resolves to where it already is
    expect(targets.cb).toEqual([
      { col: 1, row: 0 },
      { col: 1, row: 1 }
    ]);
    expect(targets.br).toEqual([]);
    expect(targets.bl).toHaveLength(8);
  });

  it('moves the widget and saves the same placement shape', () => {
    service.startMove('sog');
    expect(service.dropMovingWidget('bl', { col: 2, row: 1 })).toBe(true);
    expect(widgets.find((w) => w.instanceId === 'sog')).toEqual(
      strip('sog', 'bl', 2)
    );
    expect(Object.keys(widgets[4]).sort()).toEqual([
      'anchor',
      'col',
      'extension',
      'instanceId',
      'row',
      'widget'
    ]);
    expect(saves).toBe(1);
    expect(service.movingWidget()).toBeNull();
    expect(service.cellOccupied('cb', { col: 0, row: 0 })).toBe(false);
    expect(service.cellOccupied('bl', { col: 2, row: 0 })).toBe(true);
  });

  it('refuses a drop on an occupied cell and keeps the move going', () => {
    service.startMove('sog');
    expect(service.dropMovingWidget('br', { col: 0, row: 0 })).toBe(false);
    expect(widgets[4].anchor).toBe('cb');
    expect(saves).toBe(0);
    expect(service.movingWidget()?.instanceId).toBe('sog');
  });

  it('lets a widget move within its own anchor onto its own cells', () => {
    service.startMove('br0');
    expect(service.moveTargets().br).toEqual([]);
    service.removeWidget('br1');
    // removing another widget does not end the move
    expect(service.movingWidget()?.instanceId).toBe('br0');
    expect(service.dropMovingWidget('br', { col: 1, row: 1 })).toBe(true);
    expect(widgets.find((w) => w.instanceId === 'br0')?.col).toBe(1);
  });

  it('ends the move when the moving widget is removed', () => {
    service.startMove('sog');
    service.removeWidget('sog');
    expect(service.movingWidget()).toBeNull();
    expect(service.moveTargets().cb).toEqual([]);
  });
});
