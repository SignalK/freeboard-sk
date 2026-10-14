import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { SignalKClient } from 'signalk-client-angular';
import {
  type BusPort,
  type OverlayRequestEvent,
  type OverlayStateEvent
} from 'signalk-plotterext-bus/host';
import {
  connectExtension,
  ExtensionClient
} from 'signalk-plotterext-bus/extension';

import { PlotterExtensionService } from './plotterext.service';
import { RouteBufferRegistry } from './route-buffer.registry';
import { AppFacade } from '../../app.facade';
import { SKResourceService } from '../skresources/resources.service';
import { MapService } from '../map/ol/lib/map.service';
import { SKStreamFacade } from '../skstream/skstream.facade';
import { PlotterExtensionManifest } from './types';

const manifest = (id: string): PlotterExtensionManifest =>
  ({
    name: `${id} plugin`,
    apiVersion: '1',
    requires: ['background.iframe', 'overlays.image'],
    background: [
      { id: 'renderer', type: 'iframe', url: `/plotterext/${id}/r.html` },
      { id: 'helper', type: 'iframe', url: `/plotterext/${id}/h.html` }
    ],
    overlays: [
      { id: 'depth', title: 'Depth', type: 'image', runtime: 'renderer' },
      // dropped: names no runtime of this manifest
      { id: 'orphan', title: 'Orphan', type: 'image', runtime: 'nope' },
      // dropped: a type this host does not draw
      { id: 'vector', title: 'Vector', type: 'data', runtime: 'renderer' }
    ]
  }) as unknown as PlotterExtensionManifest;

const VIEW = {
  extent: [0, 0, 1000, 500] as [number, number, number, number],
  bounds: [0, 0, 0.009, 0.0045] as [number, number, number, number],
  width: 100,
  height: 50,
  pixelRatio: 1,
  resolution: 10,
  zoom: 15,
  rotation: 0
};

const fakeImage = (width = 100, height = 50) =>
  ({ width, height, close: vi.fn() }) as unknown as ImageBitmap;

// The overlays.image capability end to end: real extension clients over the
// bus, through jsdom iframes, against the real host service.
describe('PlotterExtensionService image overlays', () => {
  let service: PlotterExtensionService;
  let saveConfig: ReturnType<typeof vi.fn>;
  let config: { plotterExtensions: { widgets: []; overlays?: unknown } };
  const detachers: Array<() => void> = [];
  const clients: ExtensionClient[] = [];
  const frames: HTMLIFrameElement[] = [];

  beforeEach(() => {
    localStorage.clear();
    saveConfig = vi.fn();
    config = { plotterExtensions: { widgets: [] } };
    TestBed.configureTestingModule({
      providers: [
        PlotterExtensionService,
        RouteBufferRegistry,
        {
          provide: AppFacade,
          useValue: {
            config: {
              ...config,
              display: { nightMode: false },
              map: { center: [0, 0], zoomLevel: 10 }
            },
            mapExtent: signal([]),
            debug: () => {},
            isTopWindow: () => true,
            saveConfig,
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
    service.manifests.set({
      'ext-a': manifest('ext-a'),
      'ext-b': manifest('ext-b')
    });
    TestBed.tick();
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

  async function runtime(
    extension: string,
    id = 'renderer'
  ): Promise<ExtensionClient> {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    frames.push(iframe);
    detachers.push(
      service.attachBackground(iframe, {
        extension,
        runtime: { id, type: 'iframe', url: '' }
      })
    );
    const client = await connectExtension({
      port: extensionPort(iframe),
      timeoutMs: 2000,
      onError: () => {}
    });
    clients.push(client);
    return client;
  }

  async function recorder<T>(client: ExtensionClient, event: string) {
    const seen: T[] = [];
    await client.subscribe([event], (_n, p) => seen.push(p as T));
    return seen;
  }

  /** Flush the host's effects, then let the bus deliver what they sent. */
  async function settle() {
    TestBed.tick();
    await new Promise((r) => setTimeout(r, 20));
  }

  it('advertises overlays.image and lists only the extension’s drawable overlays', async () => {
    const a = await runtime('ext-a');
    expect(a.hasCapability('overlays.image')).toBe(true);
    await expect(a.overlays.list()).resolves.toEqual([
      {
        id: 'depth',
        title: 'Depth',
        band: 'aboveCharts',
        visible: true,
        opacity: 1,
        suspended: false
      }
    ]);
    expect(service.overlays.entries().map((e) => e.key)).toEqual([
      'ext-a/depth',
      'ext-b/depth'
    ]);
  });

  it('sends overlay.request only to the overlay’s own runtime', async () => {
    const renderer = await runtime('ext-a', 'renderer');
    const helper = await runtime('ext-a', 'helper');
    const other = await runtime('ext-b', 'renderer');
    const toRenderer = await recorder<OverlayRequestEvent>(
      renderer,
      'overlay.request'
    );
    const toHelper = await recorder<OverlayRequestEvent>(
      helper,
      'overlay.request'
    );
    const toOther = await recorder<OverlayRequestEvent>(
      other,
      'overlay.request'
    );
    await settle();
    service.requestOverlayFrame('ext-a/depth', VIEW, 0);
    await settle();
    expect(toRenderer).toEqual([
      expect.objectContaining({ overlayId: 'depth', ...VIEW })
    ]);
    expect(toHelper).toEqual([]);
    expect(toOther).toEqual([]);
  });

  it('replays the latest request to a runtime that subscribes late', async () => {
    service.requestOverlayFrame('ext-a/depth', VIEW, 0);
    service.requestOverlayFrame('ext-a/depth', { ...VIEW, zoom: 16 }, 0);
    const renderer = await runtime('ext-a');
    const seen = await recorder<OverlayRequestEvent>(
      renderer,
      'overlay.request'
    );
    await settle();
    expect(seen).toEqual([expect.objectContaining({ zoom: 16 })]);
  });

  it('replays once, not again on the runtime’s later subscriptions', async () => {
    service.requestOverlayFrame('ext-a/depth', VIEW, 0);
    const renderer = await runtime('ext-a');
    const seen = await recorder<OverlayRequestEvent>(
      renderer,
      'overlay.request'
    );
    await recorder<OverlayStateEvent>(renderer, 'overlay.state');
    await renderer.subscribe(['some.other.topic'], () => {});
    await settle();
    expect(seen).toHaveLength(1);
  });

  it('accepts an answering frame and hands it to the layer', async () => {
    const renderer = await runtime('ext-a');
    const delivered: Array<{ extent: number[] }> = [];
    service.overlays.registerSink('ext-a/depth', (f) => delivered.push(f));
    const requests = await recorder<OverlayRequestEvent>(
      renderer,
      'overlay.request'
    );
    service.requestOverlayFrame('ext-a/depth', VIEW, 0);
    await settle();
    const res = await renderer.overlays.frame({
      overlayId: 'depth',
      requestId: requests[0].requestId,
      extent: VIEW.extent,
      image: fakeImage()
    });
    expect(res).toEqual({ accepted: true });
    expect(delivered).toEqual([
      expect.objectContaining({ extent: VIEW.extent })
    ]);
  });

  it('refuses frames from another runtime or of the wrong size', async () => {
    const helper = await runtime('ext-a', 'helper');
    const renderer = await runtime('ext-a', 'renderer');
    service.overlays.registerSink('ext-a/depth', () => {});
    service.requestOverlayFrame('ext-a/depth', VIEW, 0);
    await expect(
      helper.overlays.frame({
        overlayId: 'depth',
        extent: VIEW.extent,
        image: fakeImage()
      })
    ).rejects.toHaveProperty('reason', 'overlays.unknownId');
    await expect(
      renderer.overlays.frame({
        overlayId: 'depth',
        requestId: service.overlays.latestRequestsFor('ext-a', 'renderer')[0]
          .requestId,
        extent: VIEW.extent,
        image: fakeImage(10, 10)
      })
    ).rejects.toHaveProperty('reason', 'overlays.badRequest');
    await expect(
      renderer.call('overlay.frame', {
        overlayId: 'depth',
        extent: VIEW.extent,
        image: {}
      })
    ).rejects.toHaveProperty('reason', 'overlays.badRequest');
    await expect(
      renderer.overlays.frame({
        overlayId: 'depth',
        extent: [10, 0, 5, 1],
        image: fakeImage()
      })
    ).rejects.toHaveProperty('reason', 'overlays.badRequest');
  });

  it('reports a visibility change to the owning extension and saves it', async () => {
    const a = await runtime('ext-a');
    const b = await runtime('ext-b');
    const seenA = await recorder<OverlayStateEvent>(a, 'overlay.state');
    const seenB = await recorder<OverlayStateEvent>(b, 'overlay.state');
    await settle();
    await a.overlays.setVisibility(['depth'], false);
    await settle();
    expect(seenA).toEqual([
      { overlayId: 'depth', visible: false, opacity: 1, suspended: false }
    ]);
    expect(seenB).toEqual([]);
    expect(saveConfig).toHaveBeenCalled();
    // the user's own choice (the chart list) is reported the same way
    service.overlays.setOpacity(['ext-a/depth'], 0.5);
    await settle();
    expect(seenA.at(-1)).toEqual({
      overlayId: 'depth',
      visible: false,
      opacity: 0.5,
      suspended: false
    });
  });

  it('reloads the saved choices once the server config is in (init)', async () => {
    const app = TestBed.inject(AppFacade) as unknown as {
      config: { plotterExtensions: { widgets: []; overlays?: unknown } };
    };
    // the server-stored config replaces the local copy before init()
    app.config = {
      ...app.config,
      plotterExtensions: {
        widgets: [],
        overlays: { 'ext-a/depth': { visible: false, opacity: 0.3 } }
      }
    };
    await service.init(); // SignalKClient is a bare stub: discovery fails
    service.manifests.set({ 'ext-a': manifest('ext-a') });
    TestBed.tick();
    expect(service.overlays.entry('ext-a/depth')).toMatchObject({
      visible: false,
      opacity: 0.3
    });
    // and the next change keeps it rather than writing a stale copy back
    service.overlays.setVisibility(['ext-a/depth'], true);
    expect(app.config.plotterExtensions.overlays).toEqual({
      'ext-a/depth': { visible: true, opacity: 0.3 }
    });
  });

  it('will not let an extension touch another extension’s overlay', async () => {
    const a = await runtime('ext-a');
    await expect(
      a.call('overlay.setVisibility', { ids: ['nope'], visible: false })
    ).rejects.toHaveProperty('reason', 'overlays.unknownId');
    await expect(
      a.call('overlay.setOpacity', { ids: ['depth'], opacity: 3 })
    ).rejects.toHaveProperty('reason', 'overlays.badRequest');
    expect(service.overlays.entry('ext-b/depth')!.visible).toBe(true);
  });
});
