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
import { FBMapInteractService } from '../map/fbmap-interact.service';
import { PlotterExtensionManifest } from './types';
import type { MapTarget } from './actions';

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
    ]
  }) as PlotterExtensionManifest;

const fuelDock: MapTarget = {
  kind: 'waypoint',
  position: [-80.11, 25.76],
  featurePosition: [-80.12, 25.77],
  id: 'w1',
  href: '/resources/waypoints/w1',
  name: 'Fuel dock'
};

// The map.pick capability end to end: real extension clients over the bus,
// through jsdom iframes, as in plotterext.actions.spec.ts. The user's side of
// a pick is the map's (FBMapInteractService), driven here directly.
describe('PlotterExtensionService map picks', () => {
  let service: PlotterExtensionService;
  let mapInteract: FBMapInteractService;
  const detachers: Array<() => void> = [];
  const clients: ExtensionClient[] = [];
  const frames: HTMLIFrameElement[] = [];

  beforeEach(() => {
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
    mapInteract = TestBed.inject(FBMapInteractService);
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

  /** A connected context and everything it heard as `map.picked`. */
  interface Ctx {
    client: ExtensionClient;
    picked: unknown[];
    detach: () => void;
  }

  async function connect(
    attach: (iframe: HTMLIFrameElement) => () => void
  ): Promise<Ctx> {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    frames.push(iframe);
    const detach = attach(iframe);
    detachers.push(detach);
    const client = await connectExtension({
      port: extensionPort(iframe),
      timeoutMs: 2000,
      onError: () => {}
    });
    clients.push(client);
    const picked: unknown[] = [];
    await client.subscribe(['map.picked'], (_name, p) => picked.push(p));
    return { client, picked, detach };
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

  const reason = async (p: Promise<unknown>) => {
    const err = await p.catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RpcError);
    return (err as RpcError).reason;
  };

  const tick = () => new Promise((r) => setTimeout(r, 20));

  it('advertises the map.pick capability', async () => {
    const { client } = await runtime('ext-a');
    expect(client.hasCapability('map.pick')).toBe(true);
  });

  it('puts the map into a pick and returns its id at once', async () => {
    const { client } = await runtime('ext-a');
    const { pickId } = await client.map.pick({
      prompt: 'Select the waypoint to route to',
      targets: ['waypoint']
    });
    expect(typeof pickId).toBe('string');
    expect(mapInteract.pick()).toEqual({
      pickId,
      extensionName: 'Ext ext-a',
      prompt: 'Select the waypoint to route to',
      rules: [{ kind: 'waypoint' }]
    });
  });

  it('delivers the picked target only to the context that asked', async () => {
    const asker = await panel('ext-a');
    const sibling = await runtime('ext-a');
    const other = await runtime('ext-b');
    const { pickId } = await asker.client.map.pick({ targets: ['waypoint'] });
    mapInteract.endPick(pickId, { target: fuelDock });
    await tick();
    expect(asker.picked).toEqual([{ pickId, target: fuelDock }]);
    expect(sibling.picked).toEqual([]);
    expect(other.picked).toEqual([]);
    expect(mapInteract.pick()).toBeNull();
  });

  it('reports a pick the user cancels with reason user', async () => {
    const asker = await runtime('ext-a');
    const { pickId } = await asker.client.map.pick();
    mapInteract.cancelPick('user');
    await tick();
    expect(asker.picked).toEqual([{ pickId, cancelled: true, reason: 'user' }]);
  });

  it('ends the caller’s pick on map.cancelPick with reason extension', async () => {
    const asker = await runtime('ext-a');
    const { pickId } = await asker.client.map.pick();
    await asker.client.map.cancelPick(pickId);
    await tick();
    expect(mapInteract.pick()).toBeNull();
    expect(asker.picked).toEqual([
      { pickId, cancelled: true, reason: 'extension' }
    ]);
    // Already over: resolves all the same, and says nothing more.
    await asker.client.map.cancelPick(pickId);
    await tick();
    expect(asker.picked).toHaveLength(1);
  });

  it('does not let a context cancel another context’s pick', async () => {
    const asker = await runtime('ext-a');
    const other = await runtime('ext-b');
    const { pickId } = await asker.client.map.pick();
    await expect(other.client.map.cancelPick(pickId)).resolves.toBeUndefined();
    expect(mapInteract.pick()?.pickId).toBe(pickId);
    expect(asker.picked).toEqual([]);
  });

  it('supersedes the pick that is on with a new one, from any context', async () => {
    const first = await runtime('ext-a');
    const second = await runtime('ext-b');
    const a = await first.client.map.pick();
    const b = await second.client.map.pick({ targets: ['note'] });
    await tick();
    expect(first.picked).toEqual([
      { pickId: a.pickId, cancelled: true, reason: 'superseded' }
    ]);
    expect(mapInteract.pick()?.pickId).toBe(b.pickId);
    mapInteract.endPick(b.pickId, { target: fuelDock });
    await tick();
    expect(second.picked).toEqual([{ pickId: b.pickId, target: fuelDock }]);
    expect(first.picked).toHaveLength(1);
  });

  it('reports a pick the host ends with reason host', async () => {
    const asker = await runtime('ext-a');
    const { pickId } = await asker.client.map.pick();
    mapInteract.startDrawing('route');
    await tick();
    expect(asker.picked).toEqual([{ pickId, cancelled: true, reason: 'host' }]);
  });

  it('refuses a pick during a modal interaction with map.pickBusy', async () => {
    const { client } = await runtime('ext-a');
    mapInteract.startMeasuring();
    expect(await reason(client.map.pick())).toBe('map.pickBusy');
    mapInteract.stopMeasuring();
    mapInteract.setZoneEditing(true);
    expect(await reason(client.map.pick())).toBe('map.pickBusy');
    expect(mapInteract.pick()).toBeNull();
  });

  it('refuses malformed targets with map.badRequest and keeps the pick that is on', async () => {
    const { client } = await runtime('ext-a');
    const { pickId } = await client.map.pick();
    expect(await reason(client.call('map.pick', { targets: 'waypoint' }))).toBe(
      'map.badRequest'
    );
    expect(
      await reason(client.call('map.pick', { targets: ['overlayFeature'] }))
    ).toBe('map.badRequest');
    expect(await reason(client.call('map.cancelPick', {}))).toBe(
      'map.badRequest'
    );
    expect(mapInteract.pick()?.pickId).toBe(pickId);
  });

  it('ends the pick of a context that unloads, without an event', async () => {
    const asker = await panel('ext-a');
    const sibling = await runtime('ext-a');
    await asker.client.map.pick();
    asker.detach();
    await tick();
    expect(mapInteract.pick()).toBeNull();
    expect(sibling.picked).toEqual([]);
  });
});
