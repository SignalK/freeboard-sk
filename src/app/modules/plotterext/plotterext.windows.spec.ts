import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { SignalKClient } from 'signalk-client-angular';
import { type BusPort, type WindowState } from 'signalk-plotterext-bus/host';
import {
  connectExtension,
  ExtensionClient,
  RpcError
} from 'signalk-plotterext-bus/extension';

import { PlotterExtensionService } from './plotterext.service';
import { RouteBufferRegistry } from './route-buffer.registry';
import { AppFacade } from '../../app.facade';
import { SKResourceService } from '../skresources/resources.service';
import { MapService } from '../map/ol/lib/map.service';
import { SKStreamFacade } from '../skstream/skstream.facade';
import { ExtWindowService } from './windows/window.service';
import { PlotterExtensionManifest } from './types';

const manifest = (id: string): PlotterExtensionManifest =>
  ({
    name: id,
    apiVersion: '1',
    requires: ['windows'],
    panels: [
      {
        id: 'viewer',
        title: 'Viewer',
        type: 'iframe',
        url: `/plotterext/${id}/viewer.html`
      }
    ],
    background: [
      {
        id: 'runtime',
        title: 'Runtime',
        type: 'iframe',
        url: `/plotterext/${id}/runtime.html`
      }
    ]
  }) as PlotterExtensionManifest;

// The windows capability end to end: real extension clients over the bus,
// through jsdom iframes, into the host's window store.
describe('PlotterExtensionService windows', () => {
  let service: PlotterExtensionService;
  let windows: ExtWindowService;
  const detachers: Array<() => void> = [];
  const clients: ExtensionClient[] = [];
  const frames: HTMLIFrameElement[] = [];

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        PlotterExtensionService,
        RouteBufferRegistry,
        {
          provide: AppFacade,
          useValue: {
            config: {
              plotterExtensions: { widgets: [] },
              display: { nightMode: false },
              map: { center: [0, 0], zoomLevel: 10 }
            },
            mapExtent: signal([]),
            debug: () => {},
            isTopWindow: () => true,
            uiCtrl: signal({ forceNightMode: false })
          }
        },
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
    windows = TestBed.inject(ExtWindowService);
    windows.area.set({ w: 1000, h: 800 });
    service.manifests.set({
      'ext-a': manifest('ext-a'),
      'ext-b': manifest('ext-b')
    });
  });

  afterEach(() => {
    while (clients.length) clients.pop()!.close();
    while (detachers.length) detachers.pop()!();
    while (frames.length) frames.pop()!.remove();
  });

  // The host's windowPort accepts only messages whose source is the iframe's
  // window, so the extension end posts as that window.
  function extensionPort(iframe: HTMLIFrameElement): BusPort {
    const win = iframe.contentWindow as Window;
    return {
      post(data) {
        window.dispatchEvent(
          new MessageEvent('message', {
            data,
            origin: window.location.origin,
            source: win
          })
        );
      },
      listen(handler) {
        const fn = (ev: MessageEvent) => handler(ev.data);
        win.addEventListener('message', fn);
        return () => win.removeEventListener('message', fn);
      }
    };
  }

  async function connect(
    attach: (iframe: HTMLIFrameElement) => () => void
  ): Promise<ExtensionClient> {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    frames.push(iframe);
    detachers.push(attach(iframe));
    const client = await connectExtension({
      port: extensionPort(iframe),
      timeoutMs: 2000,
      onError: () => {}
    });
    clients.push(client);
    return client;
  }

  const runtime = (extension: string) =>
    connect((iframe) =>
      service.attachBackground(iframe, {
        extension,
        runtime: manifest(extension).background![0]
      })
    );

  /** Connect the window's own page, as the window layer would. */
  const windowPage = (windowId: string) =>
    connect((iframe) => service.attachWindow(iframe, windows.get(windowId)!));

  const reason = async (p: Promise<unknown>) => {
    const err = await p.catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RpcError);
    return (err as RpcError).reason;
  };

  const tick = () => new Promise((r) => setTimeout(r, 20));

  it('advertises the windows capability', async () => {
    const client = await runtime('ext-a');
    expect(client.hasCapability('windows')).toBe(true);
  });

  it('opens a window from a runtime and hands the window page its context', async () => {
    const client = await runtime('ext-a');
    const w = (await client.call('ui.openWindow', {
      panel: 'viewer',
      params: { app: '/signalk-wifish/' },
      geometry: { anchor: 'bottom-right', width: 480, height: 240 }
    })) as WindowState;
    expect(w).toMatchObject({
      panel: 'viewer',
      presentation: 'floating',
      bounds: { x: 520, y: 560, width: 480, height: 240 }
    });
    const page = await windowPage(w.windowId);
    expect(page.context).toMatchObject({
      kind: 'window',
      id: 'viewer',
      instanceId: null,
      windowId: w.windowId,
      params: { app: '/signalk-wifish/' }
    });
  });

  it('lets a window close itself and tells its extension why', async () => {
    const client = await runtime('ext-a');
    const closed: unknown[] = [];
    await client.subscribe(['window.closed'], (_n, p) => closed.push(p));
    const w = (await client.call('ui.openWindow', {
      panel: 'viewer'
    })) as WindowState;
    const page = await windowPage(w.windowId);
    // a window closes itself with ui.closeWindow; it has no ui.closePanel
    const missing = await page.call('ui.closePanel').catch((e: unknown) => e);
    expect((missing as RpcError).code).toBe(-32601);
    await page.call('ui.closeWindow');
    await tick();
    expect(windows.get(w.windowId)).toBeUndefined();
    expect(closed).toEqual([{ windowId: w.windowId, reason: 'extension' }]);
  });

  it("keeps one extension's windows out of another's reach", async () => {
    const a = await runtime('ext-a');
    const b = await runtime('ext-b');
    const w = (await a.call('ui.openWindow', {
      panel: 'viewer'
    })) as WindowState;
    expect(
      await reason(b.call('ui.closeWindow', { windowId: w.windowId }))
    ).toBe('windows.unknownId');
    await expect(b.call('ui.listWindows')).resolves.toEqual({ windows: [] });
    expect(windows.get(w.windowId)).toBeDefined();
  });

  it('delivers bounds and state changes only to the owning extension', async () => {
    const a = await runtime('ext-a');
    const b = await runtime('ext-b');
    const seenA: string[] = [];
    const seenB: string[] = [];
    await a.subscribe(['window.*'], (n) => seenA.push(n));
    await b.subscribe(['window.*'], (n) => seenB.push(n));
    const w = (await a.call('ui.openWindow', {
      panel: 'viewer'
    })) as WindowState;
    await a.call('ui.updateWindow', {
      windowId: w.windowId,
      geometry: { width: 500 },
      visible: false
    });
    await tick();
    expect(seenA.sort()).toEqual(['window.bounds', 'window.state']);
    expect(seenB).toEqual([]);
  });

  it("closes an extension's windows when it leaves the collection", async () => {
    const a = await runtime('ext-a');
    const w = (await a.call('ui.openWindow', {
      panel: 'viewer'
    })) as WindowState;
    service.manifests.set({ 'ext-b': manifest('ext-b') });
    (service as unknown as { syncWindows(): void }).syncWindows();
    expect(windows.get(w.windowId)).toBeUndefined();
  });

  describe('window buttons', () => {
    const button = (type: 'openWindow' | 'toggleWindow', extra = {}) => ({
      id: 'show-viewer',
      title: 'Viewer',
      action: { type, panel: 'viewer', ...extra }
    });

    it('openWindow opens once, then shows and raises the same window', () => {
      const b = button('openWindow', { userClose: 'hide' });
      service.handleButtonAction('ext-a', b);
      const [w] = windows.windows();
      windows.userClose(w.id);
      expect(windows.get(w.id)?.visible).toBe(false);
      service.handleButtonAction('ext-a', b);
      expect(windows.windows().map((x) => x.id)).toEqual([w.id]);
      expect(windows.get(w.id)?.visible).toBe(true);
    });

    it('toggleWindow hides a hide-on-close window and brings it back', () => {
      const b = button('toggleWindow', {
        userClose: 'hide',
        params: { app: '/x/' }
      });
      service.handleButtonAction('ext-a', b);
      const [w] = windows.windows();
      expect(w.params).toEqual({ app: '/x/' });
      service.handleButtonAction('ext-a', b);
      expect(windows.get(w.id)?.visible).toBe(false);
      service.handleButtonAction('ext-a', b);
      expect(windows.get(w.id)?.visible).toBe(true);
    });

    it('toggleWindow closes a close-on-close window and reopens a new one', () => {
      const b = button('toggleWindow');
      service.handleButtonAction('ext-a', b);
      const [w] = windows.windows();
      service.handleButtonAction('ext-a', b);
      expect(windows.get(w.id)).toBeUndefined();
      service.handleButtonAction('ext-a', b);
      expect(windows.windows().length).toBe(1);
      expect(windows.windows()[0].id).not.toBe(w.id);
    });

    it('ignores a button whose panel is not in the manifest', () => {
      service.handleButtonAction(
        'ext-a',
        button('openWindow', { panel: 'nope' })
      );
      expect(windows.windows()).toEqual([]);
    });
  });
});
