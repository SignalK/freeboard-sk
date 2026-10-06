import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

// Each iframe context kind (widget, panel, background) gets the shared host API
// plus its own handshake context, state scope and kind-specific methods. These
// drive a real extension client through the public attach* methods.
describe('PlotterExtensionService iframe contexts', () => {
  let service: PlotterExtensionService;
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
  });

  afterEach(() => {
    while (clients.length) clients.pop()!.close();
    while (detachers.length) detachers.pop()!();
    while (frames.length) frames.pop()!.remove();
  });

  function frame(): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    frames.push(iframe);
    return iframe;
  }

  // The extension end of an iframe connection: the host's windowPort accepts
  // only messages whose source is the iframe's window, so post as that window.
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
    const iframe = frame();
    detachers.push(attach(iframe));
    const client = await connectExtension({
      port: extensionPort(iframe),
      timeoutMs: 2000,
      onError: () => {}
    });
    clients.push(client);
    return client;
  }

  async function reason(p: Promise<unknown>): Promise<unknown> {
    const err = await p.catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RpcError);
    return (err as RpcError).code;
  }

  const METHOD_NOT_FOUND = -32601;

  function stored(): Record<string, unknown> {
    return JSON.parse(localStorage.getItem('fb-plotterext-state') ?? '{}');
  }

  it('gives a widget its instance context, instance state and config-panel methods', async () => {
    const client = await connect((iframe) =>
      service.attachWidget(iframe, {
        extension: 'ext-a',
        widget: 'gauge',
        instanceId: 'inst-1'
      } as Parameters<PlotterExtensionService['attachWidget']>[1])
    );
    expect(client.context).toMatchObject({
      kind: 'widget',
      id: 'gauge',
      instanceId: 'inst-1',
      targetInstance: null
    });
    await client.state.set({ v: 1 });
    expect(stored()).toMatchObject({
      'ext-a': { instances: { 'inst-1': { v: 1 } } }
    });
    expect(await reason(client.call('ui.closePanel'))).toBe(METHOD_NOT_FOUND);
  });

  it('gives a panel its target context, target-instance state and ui.closePanel', async () => {
    const close = vi.fn();
    const client = await connect((iframe) =>
      service.attachPanel(iframe, {
        extension: 'ext-a',
        panel: { id: 'cfg', title: 'Config', type: 'iframe', url: '' },
        targetInstance: 'inst-1',
        targetWidget: 'gauge',
        close
      })
    );
    expect(client.context).toMatchObject({
      kind: 'panel',
      id: 'cfg',
      instanceId: null,
      targetInstance: 'inst-1',
      targetWidget: 'gauge'
    });
    await client.state.set({ w: 2 });
    expect(stored()).toMatchObject({
      'ext-a': { instances: { 'inst-1': { w: 2 } } }
    });
    await client.call('ui.closePanel');
    expect(close).toHaveBeenCalledTimes(1);
    expect(await reason(client.call('ui.openConfigPanel'))).toBe(
      METHOD_NOT_FOUND
    );
  });

  it('gives a background runtime extension-scoped state and no panel methods', async () => {
    const client = await connect((iframe) =>
      service.attachBackground(iframe, {
        extension: 'ext-a',
        runtime: { id: 'svc', title: 'Service', type: 'iframe', url: '' }
      })
    );
    expect(client.context).toMatchObject({
      kind: 'background',
      id: 'svc',
      instanceId: null
    });
    await client.state.set({ x: 3 });
    expect(stored()).toMatchObject({ 'ext-a': { extension: { x: 3 } } });
    expect(await reason(client.call('ui.closePanel'))).toBe(METHOD_NOT_FOUND);
    expect(await reason(client.call('ui.openConfigPanel'))).toBe(
      METHOD_NOT_FOUND
    );
  });

  it('serves the shared host API to every kind', async () => {
    const client = await connect((iframe) =>
      service.attachBackground(iframe, {
        extension: 'ext-a',
        runtime: { id: 'svc', title: 'Service', type: 'iframe', url: '' }
      })
    );
    await expect(client.call('nightMode.get')).resolves.toEqual({
      enabled: false,
      auto: expect.any(Boolean)
    });
  });

  it('closes the connection on detach', async () => {
    const client = await connect((iframe) =>
      service.attachBackground(iframe, {
        extension: 'ext-a',
        runtime: { id: 'svc', title: 'Service', type: 'iframe', url: '' }
      })
    );
    detachers.pop()!();
    const err = await client
      .call('nightMode.get', undefined, { timeoutMs: 200 })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RpcError);
  });
});
