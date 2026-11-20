import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

const SOG = 'navigation.speedOverGround';
const DEPTH = 'environment.depth.belowKeel';

class FakeWebSocket {
  static readonly OPEN = 1;
  static sockets: FakeWebSocket[] = [];
  readyState = 0;
  sent: Array<Record<string, unknown>> = [];
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {
    FakeWebSocket.sockets.push(this);
  }

  send(data: string) {
    this.sent.push(JSON.parse(data));
  }

  close() {
    this.readyState = 3;
  }

  open(capabilities?: string[]) {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
    this.onmessage?.({
      data: JSON.stringify({ name: 'signalk-server', capabilities })
    });
  }
}

describe('PlotterExtensionService Signal K relay', () => {
  let service: PlotterExtensionService;
  const detachers: Array<() => void> = [];
  const clients: ExtensionClient[] = [];

  beforeEach(() => {
    FakeWebSocket.sockets = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
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
            data: { server: {} },
            getFBToken: () => null,
            mapExtent: signal([]),
            saveConfig: () => {},
            debug: () => {},
            isTopWindow: () => false,
            uiCtrl: signal({ forceNightMode: false })
          }
        },
        {
          provide: SignalKClient,
          useValue: {
            server: {
              endpoints: { v1: { 'signalk-ws': 'ws://sk/signalk/v1/stream' } }
            }
          }
        },
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
    vi.unstubAllGlobals();
  });

  async function connect(): Promise<ExtensionClient> {
    const channel = new MessageChannel();
    detachers.push(service.attachEmbeddingHost(messagePort(channel.port1)));
    const client = await connectExtension({
      port: messagePort(channel.port2),
      id: 'widget',
      timeoutMs: 2000,
      onError: () => {}
    });
    clients.push(client);
    return client;
  }

  async function subscribe(client: ExtensionClient, paths: string[]) {
    const { subscriptionId } = (await client.call('signalk.subscribe', {
      paths
    })) as { subscriptionId: string };
    return subscriptionId;
  }

  const unsubscribe = (client: ExtensionClient, subscriptionId: string) =>
    client.call('signalk.unsubscribe', { subscriptionId });

  const subscribedPaths = (socket: FakeWebSocket) =>
    socket.sent
      .filter((msg) => msg['subscribe'])
      .map((msg) => msg['subscriptionId']);

  it('subscribes each path under its own subscriptionId', async () => {
    const client = await connect();
    await subscribe(client, [SOG]);
    const socket = FakeWebSocket.sockets[0];
    socket.open(['subscriptionIds']);
    await subscribe(client, [DEPTH]);

    expect(socket.sent).toEqual([
      {
        context: 'vessels.self',
        subscriptionId: SOG,
        subscribe: [
          { path: SOG, period: 1000, policy: 'instant', minPeriod: 200 }
        ]
      },
      {
        context: 'vessels.self',
        subscriptionId: DEPTH,
        subscribe: [
          { path: DEPTH, period: 1000, policy: 'instant', minPeriod: 200 }
        ]
      }
    ]);
  });

  it('ends a released path by its subscriptionId and keeps the socket', async () => {
    const client = await connect();
    const sog = await subscribe(client, [SOG]);
    await subscribe(client, [DEPTH]);
    const socket = FakeWebSocket.sockets[0];
    socket.open(['subscriptionIds']);

    await unsubscribe(client, sog);

    expect(socket.sent.at(-1)).toEqual({
      context: '*',
      unsubscribe: [{ subscriptionId: SOG }]
    });
    expect(socket.readyState).toBe(FakeWebSocket.OPEN);
    expect(FakeWebSocket.sockets).toHaveLength(1);
  });

  it('subscribes a released path again after its unsubscribe', async () => {
    const client = await connect();
    const sog = await subscribe(client, [SOG]);
    await subscribe(client, [DEPTH]);
    const socket = FakeWebSocket.sockets[0];
    socket.open(['subscriptionIds']);
    await unsubscribe(client, sog);

    await subscribe(client, [SOG]);

    expect(subscribedPaths(socket)).toEqual([SOG, DEPTH, SOG]);
  });

  it('sends no unsubscribe to a server without subscription ids', async () => {
    const client = await connect();
    const sog = await subscribe(client, [SOG]);
    await subscribe(client, [DEPTH]);
    const socket = FakeWebSocket.sockets[0];
    socket.open();

    await unsubscribe(client, sog);
    await subscribe(client, [SOG]);

    expect(socket.sent.some((msg) => msg['unsubscribe'])).toBe(false);
    expect(subscribedPaths(socket)).toEqual([SOG, DEPTH]);
  });
});
