import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { SignalKClient } from 'signalk-client-angular';
import { MethodHandler } from 'signalk-plotterext-bus/host';

import { PlotterExtensionService } from './plotterext.service';
import { RouteBufferRegistry } from './route-buffer.registry';
import { AppFacade } from '../../app.facade';
import { SKResourceService } from '../skresources/resources.service';
import { MapService } from '../map/ol/lib/map.service';
import { SKStreamFacade } from '../skstream/skstream.facade';
import { PipAppService } from '../pip-app/pip-app.service';
import { PipAppDef } from '../pip-app/types';
import {
  HOST_API_VERSION,
  HOST_CAPABILITIES,
  PlotterExtensionManifest
} from './types';

const manifest = (name: string): PlotterExtensionManifest => ({
  name,
  apiVersion: HOST_API_VERSION,
  panels: [
    {
      id: 'sonar',
      title: 'Sonar',
      type: 'iframe',
      url: '/plotterext/sonar/panel.html?compact=1'
    },
    {
      id: 'remote',
      title: 'Remote',
      type: 'iframe',
      url: 'https://evil.example/x'
    }
  ]
});

describe('PlotterExtensionService PiP App windows', () => {
  let service: PlotterExtensionService;
  let windows: ReturnType<typeof signal<PipAppDef[]>>;
  let pipApps: {
    viewport: ReturnType<typeof signal<{ w: number; h: number }>>;
    windows: typeof windows;
    rectFromPixels: ReturnType<typeof vi.fn>;
    open: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };
  let experiments: boolean;

  const methods = (ext: string) =>
    (
      service as unknown as {
        uiWindowMethods(e: string): Record<string, MethodHandler>;
      }
    ).uiWindowMethods(ext);
  const call = (ext: string, name: string, params?: unknown) =>
    methods(ext)[name](params, {} as never);

  beforeEach(() => {
    experiments = true;
    windows = signal([]);
    pipApps = {
      viewport: signal({ w: 1000, h: 800 }),
      windows,
      rectFromPixels: vi.fn(() => ({ x: 0.4, y: 0.1, w: 0.5, h: 0.3 })),
      open: vi.fn((source, title, rect) => {
        const def = { id: `w${windows().length + 1}`, title, source, rect };
        windows.update((l) => [...l, def as PipAppDef]);
        return def;
      }),
      close: vi.fn((id: string) =>
        windows.update((l) => l.filter((w) => w.id !== id))
      )
    };
    TestBed.configureTestingModule({
      providers: [
        PlotterExtensionService,
        RouteBufferRegistry,
        {
          provide: AppFacade,
          useValue: {
            config: {
              plotterExtensions: { widgets: [] },
              get experiments() {
                return experiments;
              }
            },
            hostDef: { url: 'http://boat.local:3000' },
            debug: () => undefined
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
            refreshSelfNightMode: () => undefined
          }
        },
        { provide: PipAppService, useValue: pipApps }
      ]
    });
    service = TestBed.inject(PlotterExtensionService);
    service.manifests.set({ a: manifest('a'), b: manifest('b') });
  });

  it('advertises the vendor capability', () => {
    expect(HOST_CAPABILITIES).toContain('x-freeboard-sk.windows');
  });

  it('opens its own panel as a server-relative PiP App', async () => {
    const res = await call('a', 'ui.openWindow', { panel: 'sonar' });
    expect(res).toEqual({ windowId: 'w1' });
    expect(pipApps.open).toHaveBeenCalledWith(
      { kind: 'webapp', path: '/plotterext/sonar/panel.html?compact=1' },
      'Sonar',
      undefined
    );
  });

  it('places a sized window clear of the right-hand toolbar', async () => {
    await call('a', 'ui.openWindow', {
      panel: 'sonar',
      width: 480,
      height: 240
    });
    expect(pipApps.rectFromPixels).toHaveBeenCalledWith({
      x: 450,
      y: 70,
      w: 480,
      h: 240
    });
    expect(pipApps.open.mock.calls[0][2]).toEqual({
      x: 0.4,
      y: 0.1,
      w: 0.5,
      h: 0.3
    });
  });

  it('opens a server page by url and refuses other origins', async () => {
    await call('a', 'ui.openWindow', { url: '/signalk-wifish/?compact' });
    expect(pipApps.open).toHaveBeenCalledWith(
      { kind: 'webapp', path: '/signalk-wifish/?compact' },
      undefined,
      undefined
    );
    await expect(
      call('a', 'ui.openWindow', { url: 'https://evil.example/' })
    ).rejects.toMatchObject({ data: { reason: 'windows.badRequest' } });
    expect(pipApps.open).toHaveBeenCalledTimes(1);
  });

  it('never opens a panel that points at another origin', async () => {
    await expect(
      call('a', 'ui.openWindow', { panel: 'remote' })
    ).rejects.toMatchObject({ data: { reason: 'UNKNOWN_PANEL' } });
    expect(pipApps.open).not.toHaveBeenCalled();
  });

  it('lets only the opening extension close its window', async () => {
    const { windowId } = (await call('a', 'ui.openWindow', {
      panel: 'sonar'
    })) as { windowId: string };
    await expect(
      call('b', 'ui.closeWindow', { windowId })
    ).rejects.toMatchObject({ data: { reason: 'UNKNOWN_WINDOW' } });
    await call('a', 'ui.closeWindow', { windowId });
    expect(pipApps.close).toHaveBeenCalledWith(windowId);
    await expect(
      call('a', 'ui.closeWindow', { windowId })
    ).rejects.toMatchObject({ data: { reason: 'UNKNOWN_WINDOW' } });
  });

  it('refuses while PiP App is switched off', async () => {
    experiments = false;
    await expect(
      call('a', 'ui.openWindow', { panel: 'sonar' })
    ).rejects.toMatchObject({ data: { reason: 'windows.disabled' } });
  });
});
