import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { SignalKClient } from 'signalk-client-angular';
import { type BusPort } from 'signalk-plotterext-bus/host';
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
import type { MapTarget, SelectedTarget } from './actions';

const manifest = (id: string): PlotterExtensionManifest =>
  ({
    name: `Ext ${id}`,
    apiVersion: '1',
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
    ],
    actions: [
      {
        id: 'route-to',
        title: 'Smart route to here',
        targets: ['position', 'waypoint'],
        action: {
          type: 'publish',
          topic: `${id}.routeTo`,
          params: { speed: 6 },
          scope: 'extension'
        }
      },
      {
        id: 'details',
        title: 'Details',
        targets: ['waypoint'],
        action: { type: 'togglePanel', panel: 'viewer' }
      },
      {
        id: 'plan',
        title: 'Plan',
        targets: ['position'],
        action: {
          type: 'toggleWindow',
          panel: 'viewer',
          params: { mode: 'plan' }
        }
      },
      {
        id: 'resolve-fix',
        title: 'Resolve fix',
        targets: ['position'],
        visible: false,
        action: { type: 'publish', topic: `${id}.resolve` }
      }
    ]
  }) as PlotterExtensionManifest;

const position = (lon: number, lat: number): SelectedTarget => ({
  target: { kind: 'position', position: [lon, lat] }
});

const waypoint: SelectedTarget = {
  target: {
    kind: 'waypoint',
    position: [-80.11, 25.76],
    featurePosition: [-80.12, 25.77],
    id: 'w1',
    href: '/resources/waypoints/w1',
    name: 'Fuel dock'
  },
  match: { name: 'Fuel dock' }
};

// The actions capability end to end: real extension clients over the bus,
// through jsdom iframes, as in plotterext.windows.spec.ts.
describe('PlotterExtensionService actions', () => {
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

  const reason = async (p: Promise<unknown>) => {
    const err = await p.catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RpcError);
    return (err as RpcError).reason;
  };

  const tick = () => new Promise((r) => setTimeout(r, 20));

  const offered = (sel: SelectedTarget) =>
    service.actionsFor(sel).map((a) => `${a.extension}/${a.action.id}`);

  it('advertises the actions capability', async () => {
    const client = await runtime('ext-a');
    expect(client.hasCapability('actions')).toBe(true);
  });

  it('offers the visible actions that apply to a target, in manifest order', () => {
    expect(offered(position(-80, 25))).toEqual([
      'ext-a/route-to',
      'ext-a/plan',
      'ext-b/route-to',
      'ext-b/plan'
    ]);
    expect(offered(waypoint)).toEqual([
      'ext-a/route-to',
      'ext-a/details',
      'ext-b/route-to',
      'ext-b/details'
    ]);
    expect(
      offered({
        target: {
          kind: 'vessel',
          position: [0, 0],
          context: 'vessels.self',
          self: true
        }
      })
    ).toEqual([]);
  });

  it('shows and hides an extension’s own actions with actions.setVisibility', async () => {
    const client = await runtime('ext-a');
    await client.call('actions.setVisibility', {
      ids: ['resolve-fix'],
      visible: true
    });
    await client.call('actions.setVisibility', {
      ids: ['route-to'],
      visible: false
    });
    expect(offered(position(-80, 25))).toEqual([
      'ext-a/plan',
      'ext-a/resolve-fix',
      'ext-b/route-to',
      'ext-b/plan'
    ]);
  });

  it('refuses a malformed or unknown setVisibility and changes nothing', async () => {
    const client = await runtime('ext-a');
    expect(
      await reason(
        client.call('actions.setVisibility', {
          ids: 'route-to',
          visible: false
        })
      )
    ).toBe('actions.badRequest');
    expect(
      await reason(
        client.call('actions.setVisibility', { ids: ['route-to'], visible: 1 })
      )
    ).toBe('actions.badRequest');
    expect(
      await reason(
        client.call('actions.setVisibility', {
          ids: ['route-to', 'nope'],
          visible: false
        })
      )
    ).toBe('actions.unknownId');
    expect(offered(position(-80, 25))).toContain('ext-a/route-to');
  });

  it('publishes a publish action with the invocation, and emits action.invoked', async () => {
    const a = await runtime('ext-a');
    const b = await runtime('ext-b');
    const topics: unknown[] = [];
    const invokedA: unknown[] = [];
    const invokedB: unknown[] = [];
    await a.subscribe(['ext-a.routeTo'], (_n, p) => topics.push(p));
    await a.subscribe(['action.invoked'], (_n, p) => invokedA.push(p));
    await b.subscribe(['action.invoked'], (_n, p) => invokedB.push(p));

    service.invokeAction('ext-a', 'route-to', waypoint);
    await tick();

    expect(topics).toEqual([
      { speed: 6, actionId: 'route-to', target: waypoint.target }
    ]);
    expect(invokedA).toEqual([
      { actionId: 'route-to', target: waypoint.target }
    ]);
    // the event stays within the extension; the match data is never sent
    expect(invokedB).toEqual([]);
  });

  it('does not run a hidden action', async () => {
    const a = await runtime('ext-a');
    const heard: unknown[] = [];
    await a.subscribe(['ext-a.resolve', 'action.invoked'], (n) =>
      heard.push(n)
    );
    service.invokeAction('ext-a', 'resolve-fix', position(-80, 25));
    await tick();
    expect(heard).toEqual([]);
  });

  it('opens a panel action and hands the panel its invocation', async () => {
    const a = await runtime('ext-a');
    const invoked: unknown[] = [];
    await a.subscribe(['action.invoked'], (_n, p) => invoked.push(p));

    service.invokeAction('ext-a', 'details', waypoint);
    const entry = service.openPanels().find((p) => p.key === 'ext-a/viewer');
    expect(entry).toMatchObject({ visible: true });
    expect(entry?.invocation).toEqual({
      actionId: 'details',
      target: waypoint.target
    });

    const panel = await connect((iframe) =>
      service.attachPanel(iframe, {
        extension: 'ext-a',
        panel: entry!.panel,
        invocation: entry!.invocation,
        close: () => {}
      })
    );
    expect(panel.context).toMatchObject({
      kind: 'panel',
      id: 'viewer',
      invocation: { actionId: 'details', target: waypoint.target }
    });
    await tick();
    // the runtime, already loaded, heard it as an event
    expect(invoked).toHaveLength(1);
  });

  it('opens a togglePanel action rather than closing the visible panel', () => {
    service.openPanel('ext-a', 'viewer');
    service.invokeAction('ext-a', 'details', waypoint);
    expect(service.visiblePanel()?.key).toBe('ext-a/viewer');
  });

  it('opens a window action, tracks it, and tells it of the next choice', async () => {
    service.invokeAction('ext-a', 'plan', position(-80, 25));
    const [w] = windows.ofExtension('ext-a');
    expect(w.params).toEqual({ mode: 'plan' });
    expect(w.invocation).toEqual({
      actionId: 'plan',
      target: { kind: 'position', position: [-80, 25] }
    });

    const page = await connect((iframe) => service.attachWindow(iframe, w));
    expect(page.context).toMatchObject({
      kind: 'window',
      windowId: w.id,
      params: { mode: 'plan' },
      invocation: { actionId: 'plan' }
    });
    const heard: Array<{ target: MapTarget }> = [];
    await page.subscribe(['action.invoked'], (_n, p) =>
      heard.push(p as { target: MapTarget })
    );

    // a toggleWindow action opens: choosing it again raises the same window
    windows.update(w.id, { visible: false });
    service.invokeAction('ext-a', 'plan', position(-81, 26));
    await tick();
    expect(windows.ofExtension('ext-a')).toHaveLength(1);
    expect(windows.get(w.id)?.visible).toBe(true);
    expect(heard.map((h) => h.target.position)).toEqual([[-81, 26]]);
  });

  it('opens a new window once the tracked one has closed', () => {
    service.invokeAction('ext-a', 'plan', position(-80, 25));
    const [first] = windows.ofExtension('ext-a');
    windows.close(first.id, 'user');
    service.invokeAction('ext-a', 'plan', position(-81, 26));
    const [second] = windows.ofExtension('ext-a');
    expect(second.id).not.toBe(first.id);
    expect(second.invocation?.target.position).toEqual([-81, 26]);
  });
});
