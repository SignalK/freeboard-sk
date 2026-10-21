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
        id: 'sights',
        title: 'Pending sights',
        slot: 'mapToolbar',
        style: 'warning',
        colors: { bg: '#ffd600' },
        badge: 2,
        action: { type: 'togglePanel', panel: 'viewer' }
      },
      ...extra
    ]
  }) as PlotterExtensionManifest;

// The buttons.decorations capability end to end: real extension clients over
// the bus, through jsdom iframes, as in plotterext.button-visibility.spec.ts.
describe('PlotterExtensionService button decorations', () => {
  let service: PlotterExtensionService;
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

  const decoration = (extension: string, id: string) =>
    service
      .toolbarButtons()
      .find((b) => b.extension === extension && b.button.id === id)?.decoration;

  it('advertises the buttons.decorations capability', async () => {
    const client = await runtime('ext-a');
    expect(client.hasCapability('buttons.decorations')).toBe(true);
  });

  it('starts every button as its manifest says, normal by default', () => {
    expect(decoration('ext-a', 'open')).toEqual({ style: 'normal', badge: 0 });
    expect(decoration('ext-a', 'sights')).toEqual({
      style: 'warning',
      colors: { bg: '#ffd600' },
      badge: 2
    });
  });

  it('changes only the decorations given', async () => {
    const client = await runtime('ext-a');
    expect(
      await client.call('buttons.decorate', { ids: ['open'], badge: 3 })
    ).toEqual({});
    expect(decoration('ext-a', 'open')).toEqual({ style: 'normal', badge: 3 });

    await client.buttons.decorate(['open', 'start'], { style: 'active' });
    expect(decoration('ext-a', 'open')).toEqual({ style: 'active', badge: 3 });
    expect(decoration('ext-a', 'start')).toEqual({
      style: 'active',
      badge: 0
    });
  });

  it('returns a decoration to its manifest value on null', async () => {
    const client = await runtime('ext-a');
    await client.buttons.decorate(['sights'], {
      style: 'alarm',
      colors: { fg: '#000000' },
      badge: 9
    });
    await client.buttons.decorate(['sights'], { style: null, badge: null });
    expect(decoration('ext-a', 'sights')).toEqual({
      style: 'warning',
      colors: { fg: '#000000' },
      badge: 2
    });
    await client.buttons.decorate(['sights'], { colors: null });
    expect(decoration('ext-a', 'sights')?.colors).toEqual({ bg: '#ffd600' });
  });

  it('replaces colors as a whole', async () => {
    const client = await runtime('ext-a');
    await client.buttons.decorate(['sights'], { colors: { fg: '#000000' } });
    expect(decoration('ext-a', 'sights')?.colors).toEqual({ fg: '#000000' });
    await client.buttons.decorate(['sights'], { colors: {} });
    expect(decoration('ext-a', 'sights')?.colors).toBeUndefined();
  });

  it('shows no badge for 0', async () => {
    const client = await runtime('ext-a');
    await client.buttons.decorate(['sights'], { badge: 0 });
    expect(decoration('ext-a', 'sights')?.badge).toBe(0);
  });

  it('lets any of the extension’s contexts set it, and the last call wins', async () => {
    const bg = await runtime('ext-a');
    const view = await panel('ext-a');
    await bg.buttons.decorate(['open'], { style: 'active' });
    await view.buttons.decorate(['open'], { style: 'normal' });
    expect(decoration('ext-a', 'open')?.style).toBe('normal');
  });

  it('changes only the caller’s own buttons', async () => {
    const a = await runtime('ext-a');
    await a.buttons.decorate(['open'], { badge: 1 });
    expect(decoration('ext-b', 'open')?.badge).toBe(0);
    expect(await reason(a.buttons.decorate(['b-only'], { badge: 1 }))).toBe(
      'buttons.unknownId'
    );
    expect(decoration('ext-b', 'b-only')?.badge).toBe(0);
  });

  it('refuses a malformed or unknown decorate and changes nothing', async () => {
    const client = await runtime('ext-a');
    const before = service.toolbarButtons().map((b) => b.decoration);
    for (const params of [
      { ids: 'open', badge: 1 },
      { ids: [1], badge: 1 },
      { ids: ['open'] },
      { ids: ['open'], style: 'flashing' },
      { ids: ['open'], colors: { fg: 'yellow' } },
      { ids: ['open'], colors: { bg: '#fff' } },
      { ids: ['open'], colors: '#000000' },
      { ids: ['open'], badge: -1 },
      { ids: ['open'], badge: 1.5 },
      { ids: ['open'], badge: '3' }
    ]) {
      expect(await reason(client.call('buttons.decorate', params))).toBe(
        'buttons.badRequest'
      );
    }
    expect(
      await reason(
        client.call('buttons.decorate', { ids: ['open', 'nope'], badge: 1 })
      )
    ).toBe('buttons.unknownId');
    expect(service.toolbarButtons().map((b) => b.decoration)).toEqual(before);
  });

  it('treats every id from the embedding host as unknown', async () => {
    const client = await embedder();
    expect(
      await reason(client.call('buttons.decorate', { ids: ['open'], badge: 1 }))
    ).toBe('buttons.unknownId');
  });

  it('keeps a hidden button’s decorations', async () => {
    const client = await runtime('ext-a');
    await client.buttons.decorate(['start'], { style: 'active', badge: 4 });
    await client.buttons.setVisibility(['start'], false);
    expect(decoration('ext-a', 'start')).toBeUndefined();
    await client.buttons.setVisibility(['start'], true);
    expect(decoration('ext-a', 'start')).toEqual({
      style: 'active',
      badge: 4
    });
  });

  it('decorates a button that starts hidden, for when it is shown', async () => {
    const client = await runtime('ext-a');
    await client.buttons.decorate(['stop'], { style: 'alarm' });
    await client.buttons.setVisibility(['stop'], true);
    expect(decoration('ext-a', 'stop')?.style).toBe('alarm');
  });

  it('does not persist: a reload starts from the manifest', async () => {
    const client = await runtime('ext-a');
    await client.buttons.decorate(['open'], { style: 'active', badge: 5 });
    while (clients.length) clients.pop()!.close();
    while (detachers.length) detachers.pop()!();

    load();
    expect(decoration('ext-a', 'open')).toEqual({ style: 'normal', badge: 0 });
  });

  it('forgets the choices of an extension that leaves, keeping the others’', async () => {
    const a = await runtime('ext-a');
    const b = await runtime('ext-b');
    await a.buttons.decorate(['open'], { badge: 1 });
    await b.buttons.decorate(['open'], { badge: 2 });

    const both = service.manifests();
    service.manifests.set({ 'ext-b': both['ext-b'] });
    TestBed.tick();
    expect(decoration('ext-b', 'open')?.badge).toBe(2);
    service.manifests.set(both);
    TestBed.tick();

    expect(decoration('ext-a', 'open')?.badge).toBe(0);
    expect(decoration('ext-b', 'open')?.badge).toBe(2);
  });
});
