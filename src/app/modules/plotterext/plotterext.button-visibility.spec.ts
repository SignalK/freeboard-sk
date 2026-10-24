import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { SignalKClient } from 'signalk-client-angular';
import { type BusPort, messagePort } from 'signalk-plotterext-bus/host';
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
import { ButtonContribution, PlotterExtensionManifest } from './types';

const manifest = (
  id: string,
  extra: ButtonContribution[] = []
): PlotterExtensionManifest =>
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
    buttons: [
      {
        id: 'open',
        title: 'Open viewer',
        slot: 'mapToolbar',
        action: { type: 'togglePanel', panel: 'viewer' }
      },
      {
        id: 'start',
        title: 'Start recording',
        slot: 'mapToolbar',
        action: { type: 'publish', topic: `${id}.start` }
      },
      {
        id: 'stop',
        title: 'Stop recording',
        slot: 'mapToolbar',
        visible: false,
        action: { type: 'publish', topic: `${id}.stop` }
      },
      {
        id: 'window',
        title: 'Viewer window',
        slot: 'mapToolbar',
        action: { type: 'toggleWindow', panel: 'viewer' }
      },
      ...extra
    ]
  }) as PlotterExtensionManifest;

// The buttons.visibility capability end to end: real extension clients over
// the bus, through jsdom iframes, as in plotterext.actions.spec.ts.
describe('PlotterExtensionService button visibility', () => {
  let service: PlotterExtensionService;
  let windows: ExtWindowService;
  const detachers: Array<() => void> = [];
  const clients: ExtensionClient[] = [];
  const frames: HTMLIFrameElement[] = [];

  // A fresh service, as when Freeboard loads.
  function load() {
    TestBed.resetTestingModule();
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
      'ext-b': manifest('ext-b', [
        {
          id: 'b-only',
          title: 'B only',
          slot: 'mapToolbar',
          action: { type: 'publish', topic: 'ext-b.only' }
        }
      ])
    });
  }

  beforeEach(() => {
    localStorage.clear();
    load();
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

  const panel = (extension: string) =>
    connect((iframe) =>
      service.attachPanel(iframe, {
        extension,
        panel: manifest(extension).panels![0],
        close: () => {}
      })
    );

  async function embedder(): Promise<ExtensionClient> {
    const channel = new MessageChannel();
    detachers.push(service.attachEmbeddingHost(messagePort(channel.port1)));
    const client = await connectExtension({
      port: messagePort(channel.port2),
      timeoutMs: 2000,
      onError: () => {}
    });
    clients.push(client);
    return client;
  }

  const reason = async (p: Promise<unknown>) => {
    const err = await p.catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RpcError);
    return (err as RpcError).reason;
  };

  const shown = () =>
    service.toolbarButtons().map((b) => `${b.extension}/${b.button.id}`);

  const button = (extension: string, id: string): ButtonContribution => {
    const buttons = service.manifests()[extension].buttons ?? [];
    return buttons.find((b) => b.id === id) as ButtonContribution;
  };

  it('advertises the buttons.visibility capability', async () => {
    const client = await runtime('ext-a');
    expect(client.hasCapability('buttons.visibility')).toBe(true);
  });

  it('starts every button as its manifest visible says, shown by default', () => {
    expect(shown()).toEqual([
      'ext-a/open',
      'ext-a/start',
      'ext-a/window',
      'ext-b/open',
      'ext-b/start',
      'ext-b/window',
      'ext-b/b-only'
    ]);
  });

  it('offers every button, shown or hidden, as an Action Button choice', async () => {
    const client = await runtime('ext-a');
    await client.call('buttons.setVisibility', {
      ids: ['start'],
      visible: false
    });

    const choices = service.actionButtonChoices();
    expect(choices.slice(0, 4)).toEqual([
      { id: 'ext:ext-a/open', label: 'Ext ext-a: Open viewer', shown: true },
      {
        id: 'ext:ext-a/start',
        label: 'Ext ext-a: Start recording',
        shown: false
      },
      {
        id: 'ext:ext-a/stop',
        label: 'Ext ext-a: Stop recording',
        shown: false
      },
      { id: 'ext:ext-a/window', label: 'Ext ext-a: Viewer window', shown: true }
    ]);
    expect(choices).toHaveLength(9);
  });

  it('hides a button and shows it again in its own place', async () => {
    const client = await runtime('ext-a');
    expect(
      await client.call('buttons.setVisibility', {
        ids: ['start'],
        visible: false
      })
    ).toEqual({});
    await client.call('buttons.setVisibility', {
      ids: ['stop'],
      visible: true
    });
    expect(shown().slice(0, 3)).toEqual([
      'ext-a/open',
      'ext-a/stop',
      'ext-a/window'
    ]);

    await client.call('buttons.setVisibility', {
      ids: ['start', 'stop'],
      visible: true
    });
    expect(shown().slice(0, 4)).toEqual([
      'ext-a/open',
      'ext-a/start',
      'ext-a/stop',
      'ext-a/window'
    ]);
  });

  it('lets any of the extension’s contexts set it, and the last call wins', async () => {
    const bg = await runtime('ext-a');
    const view = await panel('ext-a');
    await bg.call('buttons.setVisibility', { ids: ['open'], visible: false });
    await view.call('buttons.setVisibility', { ids: ['open'], visible: true });
    expect(shown()).toContain('ext-a/open');
    await view.call('buttons.setVisibility', { ids: ['open'], visible: false });
    expect(shown()).not.toContain('ext-a/open');
  });

  it('changes only the caller’s own buttons', async () => {
    const a = await runtime('ext-a');
    await a.call('buttons.setVisibility', { ids: ['open'], visible: false });
    expect(shown()).not.toContain('ext-a/open');
    expect(shown()).toContain('ext-b/open');

    expect(
      await reason(
        a.call('buttons.setVisibility', { ids: ['b-only'], visible: false })
      )
    ).toBe('buttons.unknownId');
    expect(shown()).toContain('ext-b/b-only');
  });

  it('refuses a malformed or unknown setVisibility and changes nothing', async () => {
    const client = await runtime('ext-a');
    const before = shown();
    expect(
      await reason(
        client.call('buttons.setVisibility', { ids: 'start', visible: false })
      )
    ).toBe('buttons.badRequest');
    expect(
      await reason(
        client.call('buttons.setVisibility', { ids: [1], visible: false })
      )
    ).toBe('buttons.badRequest');
    expect(
      await reason(
        client.call('buttons.setVisibility', { ids: ['start'], visible: 1 })
      )
    ).toBe('buttons.badRequest');
    expect(
      await reason(
        client.call('buttons.setVisibility', {
          ids: ['start', 'nope'],
          visible: false
        })
      )
    ).toBe('buttons.unknownId');
    expect(shown()).toEqual(before);
  });

  it('treats every id from the embedding host as unknown', async () => {
    const client = await embedder();
    expect(
      await reason(
        client.call('buttons.setVisibility', { ids: ['open'], visible: false })
      )
    ).toBe('buttons.unknownId');
    expect(shown()).toContain('ext-a/open');
  });

  it('does not persist: a reload starts from the manifest', async () => {
    const client = await runtime('ext-a');
    await client.call('buttons.setVisibility', {
      ids: ['start'],
      visible: false
    });
    await client.call('buttons.setVisibility', {
      ids: ['stop'],
      visible: true
    });
    while (clients.length) clients.pop()!.close();
    while (detachers.length) detachers.pop()!();

    load();
    expect(shown().slice(0, 3)).toEqual([
      'ext-a/open',
      'ext-a/start',
      'ext-a/window'
    ]);
  });

  it('forgets the choices of an extension that leaves, keeping the others’', async () => {
    const a = await runtime('ext-a');
    const b = await runtime('ext-b');
    await a.call('buttons.setVisibility', { ids: ['stop'], visible: true });
    await b.call('buttons.setVisibility', { ids: ['open'], visible: false });

    const both = service.manifests();
    service.manifests.set({ 'ext-b': both['ext-b'] });
    TestBed.tick();
    service.manifests.set(both);
    TestBed.tick();

    expect(shown()).not.toContain('ext-a/stop');
    expect(shown()).not.toContain('ext-b/open');
  });

  it('leaves the panel a hidden button opened open', async () => {
    service.handleButtonAction('ext-a', button('ext-a', 'open'));
    expect(service.visiblePanel()?.key).toBe('ext-a/viewer');

    const client = await runtime('ext-a');
    await client.call('buttons.setVisibility', {
      ids: ['open'],
      visible: false
    });
    expect(service.visiblePanel()?.key).toBe('ext-a/viewer');
  });

  it('leaves the window a hidden button opened open, and still tracks it', async () => {
    service.handleButtonAction('ext-a', button('ext-a', 'window'));
    const [w] = windows.ofExtension('ext-a');
    expect(w.visible).toBe(true);

    const client = await runtime('ext-a');
    await client.call('buttons.setVisibility', {
      ids: ['window'],
      visible: false
    });
    expect(windows.get(w.id)?.visible).toBe(true);

    // shown again, the button still toggles the window it opened
    await client.call('buttons.setVisibility', {
      ids: ['window'],
      visible: true
    });
    service.handleButtonAction('ext-a', button('ext-a', 'window'));
    expect(windows.ofExtension('ext-a').every((x) => x.id === w.id)).toBe(true);
    expect(windows.get(w.id)?.visible ?? false).toBe(false);
  });
});
