import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { SignalKClient } from 'signalk-client-angular';
import { type BusPort, type PanelState } from 'signalk-plotterext-bus/host';
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
import { ExtWindowService } from './windows/window.service';
import { PlacedWidget, PlotterExtensionManifest } from './types';

const manifest = (id: string): PlotterExtensionManifest =>
  ({
    name: id,
    apiVersion: '1',
    panels: [
      {
        id: 'kept',
        title: 'Kept',
        type: 'iframe',
        url: `/plotterext/${id}/kept.html`,
        lifecycle: 'keepAlive'
      },
      {
        id: 'other',
        title: 'Other',
        type: 'iframe',
        url: `/plotterext/${id}/other.html`
      },
      {
        id: 'cfg',
        title: 'Config',
        type: 'iframe',
        url: `/plotterext/${id}/cfg.html`
      }
    ],
    widgets: [
      {
        id: 'gauge',
        title: 'Gauge',
        type: 'iframe',
        url: `/plotterext/${id}/gauge.html`,
        configPanel: 'cfg'
      },
      {
        id: 'plain',
        title: 'Plain',
        type: 'iframe',
        url: `/plotterext/${id}/plain.html`
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

const placed = (widget: string, instanceId: string): PlacedWidget => ({
  instanceId,
  extension: 'ext-a',
  widget,
  anchor: 'tr',
  col: 0,
  row: 0
});

const state = (
  panel: string,
  visible: boolean,
  targetInstance?: string
): PanelState => ({
  panel,
  visible,
  collapsed: false,
  ...(targetInstance ? { targetInstance } : {})
});

// The panels.state capability end to end: real extension clients over the bus,
// through jsdom iframes, following the host's drawer and config dialogs.
describe('PlotterExtensionService panel state', () => {
  let service: PlotterExtensionService;
  const dialogs: Array<{ close: () => void }> = [];
  const detachers: Array<() => void> = [];
  const clients: ExtensionClient[] = [];
  const frames: HTMLIFrameElement[] = [];

  beforeEach(() => {
    localStorage.clear();
    dialogs.length = 0;
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
        {
          provide: MatDialog,
          useValue: {
            open: () => {
              const closed = new Subject<void>();
              const ref = {
                afterClosed: () => closed.asObservable(),
                close: () => {
                  closed.next();
                  closed.complete();
                }
              };
              dialogs.push(ref);
              return ref;
            }
          }
        },
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
    TestBed.inject(ExtWindowService).area.set({ w: 1000, h: 800 });
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

  async function runtime(extension: string): Promise<ExtensionClient> {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    frames.push(iframe);
    detachers.push(
      service.attachBackground(iframe, {
        extension,
        runtime: { id: 'runtime', title: 'Runtime', type: 'iframe', url: '' }
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

  /** A runtime of `extension` recording every `panel.state` it receives. */
  async function follower(extension: string) {
    const client = await runtime(extension);
    const seen: PanelState[] = [];
    await client.subscribe(['panel.state'], (_n, p) =>
      seen.push(p as PanelState)
    );
    return { client, seen };
  }

  /** Flush the host's effects, then let the bus deliver what they sent. */
  async function settle() {
    TestBed.tick();
    await new Promise((r) => setTimeout(r, 20));
  }

  it('advertises panels.state and lists nothing before a panel loads', async () => {
    const client = await runtime('ext-a');
    expect(client.hasCapability('panels.state')).toBe(true);
    await expect(client.panels.list()).resolves.toEqual([]);
  });

  it('lists a keepAlive panel while open, closed, and hidden by a switch', async () => {
    const a = await runtime('ext-a');
    const b = await runtime('ext-b');
    service.openPanel('ext-a', 'kept');
    await expect(a.panels.list()).resolves.toEqual([state('kept', true)]);
    service.closeVisiblePanel();
    await expect(a.panels.list()).resolves.toEqual([state('kept', false)]);
    service.openPanel('ext-a', 'kept');
    service.openPanel('ext-a', 'other');
    await expect(a.panels.list()).resolves.toEqual([
      state('kept', false),
      state('other', true)
    ]);
    // another extension's panels are not its business
    await expect(b.panels.list()).resolves.toEqual([]);
  });

  it('reports open, close and switch to the owning extension only', async () => {
    const a = await follower('ext-a');
    const b = await follower('ext-b');
    service.openPanel('ext-a', 'kept');
    await settle();
    expect(a.seen).toEqual([state('kept', true)]);
    service.closeVisiblePanel();
    await settle();
    service.openPanel('ext-a', 'kept');
    await settle();
    service.openPanel('ext-b', 'other');
    await settle();
    expect(a.seen).toEqual([
      state('kept', true),
      state('kept', false),
      state('kept', true),
      state('kept', false)
    ]);
    expect(b.seen).toEqual([state('other', true)]);
  });

  it('reports toggles from a button and from ui.togglePanel', async () => {
    const a = await follower('ext-a');
    const button = {
      id: 'btn',
      title: 'Kept',
      action: { type: 'togglePanel', panel: 'kept' }
    } as Parameters<PlotterExtensionService['handleButtonAction']>[1];
    service.handleButtonAction('ext-a', button);
    await settle();
    service.handleButtonAction('ext-a', button);
    await settle();
    await a.client.call('ui.togglePanel', { panel: 'kept' });
    await settle();
    await a.client.call('ui.togglePanel', { panel: 'kept' });
    await settle();
    expect(a.seen.map((s) => s.visible)).toEqual([true, false, true, false]);
  });

  it('sends nothing for a panel whose state did not change', async () => {
    const a = await follower('ext-a');
    await a.client.call('ui.openPanel', { panel: 'kept' });
    await settle();
    await a.client.call('ui.openPanel', { panel: 'kept' });
    await settle();
    expect(a.seen).toEqual([state('kept', true)]);
  });

  it('reports only the net change when a panel opens and is replaced at once', async () => {
    const a = await follower('ext-a');
    service.openPanel('ext-a', 'kept');
    service.openPanel('ext-a', 'other');
    await settle();
    expect(a.seen).toEqual([state('other', true)]);
  });

  it('reports an onOpen panel replaced by another as hidden, then unlists it', async () => {
    const a = await follower('ext-a');
    service.openPanel('ext-a', 'other');
    await settle();
    service.openPanel('ext-a', 'kept');
    await settle();
    expect(a.seen).toEqual([
      state('other', true),
      state('other', false),
      state('kept', true)
    ]);
    await expect(a.client.panels.list()).resolves.toEqual([
      state('kept', true)
    ]);
  });

  it('reports a config panel with its target instance while its dialog is open', async () => {
    const a = await follower('ext-a');
    service.openConfigPanel(placed('gauge', 'inst-1'));
    await vi.waitFor(() => expect(dialogs.length).toBe(1));
    await settle();
    expect(a.seen).toEqual([state('cfg', true, 'inst-1')]);
    await expect(a.client.panels.list()).resolves.toEqual([
      state('cfg', true, 'inst-1')
    ]);
    dialogs[0].close();
    await settle();
    expect(a.seen).toEqual([
      state('cfg', true, 'inst-1'),
      state('cfg', false, 'inst-1')
    ]);
    await expect(a.client.panels.list()).resolves.toEqual([]);
  });

  it('lists no panel for a config dialog without an iframe panel', async () => {
    const a = await follower('ext-a');
    service.openConfigPanel(placed('plain', 'inst-2'));
    await vi.waitFor(() => expect(dialogs.length).toBe(1));
    await settle();
    expect(a.seen).toEqual([]);
    await expect(a.client.panels.list()).resolves.toEqual([]);
  });

  it('does not list a panel shown in a window', async () => {
    const a = await runtime('ext-a');
    await a.call('ui.openWindow', { panel: 'kept' });
    await expect(a.panels.list()).resolves.toEqual([]);
  });
});
