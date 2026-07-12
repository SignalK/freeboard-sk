import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { SignalKClient } from 'signalk-client-angular';
import { messagePort } from 'signalk-plotterext-bus/host';
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

// #507: reverse embedding. When Freeboard is embedded in another app's iframe,
// attachEmbeddingHost() exposes the full host API to that parent — the plotter
// stays the API host, the embedder is the caller and initiates the handshake.
describe('PlotterExtensionService embedding host (reverse embedding, #507)', () => {
  let service: PlotterExtensionService;
  const detachers: Array<() => void> = [];
  const clients: ExtensionClient[] = [];

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        PlotterExtensionService,
        RouteBufferRegistry,
        {
          provide: AppFacade,
          useValue: {
            // Deep enough for the constructor effects (which an async test
            // flushes, unlike a synchronous spec): readNightMode() reads
            // uiCtrl() and config.display.nightMode.
            config: {
              plotterExtensions: { widgets: [] },
              display: { nightMode: false }
            },
            debug: () => {},
            isTopWindow: () => false,
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
  });

  // Drive a real caller against the service's embedding-host connection over a
  // MessageChannel — the same seam the bus's own conformance suite uses.
  async function connect(id?: string): Promise<ExtensionClient> {
    const channel = new MessageChannel();
    detachers.push(service.attachEmbeddingHost(messagePort(channel.port1)));
    const client = await connectExtension({
      port: messagePort(channel.port2),
      id,
      timeoutMs: 2000,
      onError: () => {}
    });
    clients.push(client);
    return client;
  }

  it('hands the embedder an embedding-host context and adopts its asserted id', async () => {
    const client = await connect('kip');
    expect(client.context.kind).toBe('embedding-host');
    expect(client.context.id).toBe('kip');
    expect(client.context.instanceId).toBe(null);
  });

  it('defaults context.id to embedding-host when the caller asserts none', async () => {
    const client = await connect();
    expect(client.context.id).toBe('embedding-host');
  });

  it('exposes the full host API surface to the embedder', async () => {
    const client = await connect('kip');
    for (const cap of [
      'signalk.stream',
      'signalk.put',
      'units',
      'map',
      'resources',
      'routes',
      'charts',
      'nightMode',
      'ui'
    ]) {
      expect(client.hasCapability(cap)).toBe(true);
    }
  });

  it('serves host state methods over the connection', async () => {
    const client = await connect('kip');
    await client.state.set({ demo: 42 });
    await expect(client.state.get(['demo'])).resolves.toEqual({ demo: 42 });
  });
});
