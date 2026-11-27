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
  HOST_CAPABILITIES,
  PanelContribution,
  PlotterExtensionManifest
} from './types';

describe('PlotterExtensionService panes', () => {
  let service: PlotterExtensionService;

  const panel = (
    id: string,
    extra: Partial<PanelContribution> = {}
  ): PanelContribution => ({
    id,
    title: id,
    type: 'iframe',
    url: `/${id}.html`,
    ...extra
  });

  const manifest = (
    name: string,
    panels: PanelContribution[],
    extra: Partial<PlotterExtensionManifest> = {}
  ): PlotterExtensionManifest => ({
    name,
    apiVersion: HOST_API_VERSION,
    panels,
    ...extra
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PlotterExtensionService,
        RouteBufferRegistry,
        {
          provide: AppFacade,
          useValue: {
            config: { plotterExtensions: { widgets: [] } },
            debug: () => {},
            saveConfig: () => {}
          }
        },
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
  });

  const offered = () =>
    service.paneChoices().map((c) => `${c.extension}/${c.panel.id}`);

  it('advertises the capability', () => {
    expect(HOST_CAPABILITIES).toContain('panes');
  });

  it('offers the iframe panels marked for a pane, in manifest order', () => {
    service.manifests.set({
      radar: manifest('Radar', [
        panel('settings'),
        panel('ppi', { pane: true }),
        panel('history', { pane: true })
      ]),
      camera: manifest('Camera', [panel('bow', { pane: true })])
    });
    expect(offered()).toEqual(['radar/ppi', 'radar/history', 'camera/bow']);
    expect(service.paneChoices()[0].extensionName).toBe('Radar');
  });

  it('offers no panel it could not show', () => {
    service.manifests.set({
      radar: manifest('Radar', [
        panel('no-url', { pane: true, url: undefined }),
        panel('element', { pane: true, type: 'customElement' }),
        panel('newer', { pane: true, apiVersion: '99' }),
        panel('truthy', { pane: 'yes' as unknown as boolean })
      ]),
      incompatible: manifest('Incompatible', [panel('ppi', { pane: true })], {
        requires: ['x-unknown.capability']
      })
    });
    expect(offered()).toEqual([]);
  });
});
