import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { SignalKClient } from 'signalk-client-angular';

import { PlotterExtensionService } from './plotterext.service';
import { RouteBufferRegistry } from './route-buffer.registry';
import { AppFacade } from '../../app.facade';
import { SKResourceService } from '../skresources/resources.service';
import { MapService } from '../map/ol/lib/map.service';
import { SKStreamFacade } from '../skstream/skstream.facade';

// The `nightMode` capability's FSK mapping: get reports the resolved state, and
// set maps { enabled, auto } onto config.display.nightMode (auto) and
// uiCtrl.forceNightMode (force), matching the app-night resolution
// (selfNightMode() || forceNightMode).
describe('PlotterExtensionService nightMode capability', () => {
  let appStub: {
    config: {
      display: { nightMode: boolean };
      plotterExtensions: { widgets: [] };
    };
    uiCtrl: WritableSignal<{ forceNightMode: boolean }>;
    uiConfig: WritableSignal<{ autoNightMode: boolean }>;
    debug: () => void;
  };
  let envMode: 'day' | 'night';
  let nightSig: WritableSignal<boolean>;
  let call: (name: string, params?: unknown) => Promise<unknown>;

  // Mirrors SKStreamFacade.refreshSelfNightMode against the stub's env + config.
  const setEnv = (mode: 'day' | 'night') => {
    envMode = mode;
    nightSig.set(
      mode === 'night' && (appStub.config.display.nightMode ?? false)
    );
  };

  beforeEach(() => {
    envMode = 'day';
    nightSig = signal(false);
    appStub = {
      config: {
        display: { nightMode: false },
        plotterExtensions: { widgets: [] }
      },
      uiCtrl: signal({ forceNightMode: false }),
      uiConfig: signal({ autoNightMode: false }),
      debug: () => {}
    };
    const streamStub = {
      selfNightMode: nightSig,
      refreshSelfNightMode: () =>
        nightSig.set(
          envMode === 'night' && (appStub.config.display.nightMode ?? false)
        )
    } as unknown as SKStreamFacade;

    TestBed.configureTestingModule({
      providers: [
        PlotterExtensionService,
        RouteBufferRegistry,
        { provide: AppFacade, useValue: appStub },
        { provide: SignalKClient, useValue: {} },
        { provide: MatDialog, useValue: {} },
        {
          provide: SKResourceService,
          useValue: { routes: signal([]), charts: signal([]) }
        },
        { provide: MapService, useValue: {} },
        { provide: SKStreamFacade, useValue: streamStub }
      ]
    });
    const service = TestBed.inject(PlotterExtensionService);
    // The capability's handler table, wired to the real read/apply logic.
    const methods = (
      service as unknown as {
        nightModeMethods: () => Record<
          string,
          (p: unknown, c: unknown) => Promise<unknown>
        >;
      }
    ).nightModeMethods();
    call = (name, params) => methods[name](params, {});
  });

  it('force on: enabled:true applies night and clears auto', async () => {
    await call('nightMode.set', { enabled: true });
    expect(await call('nightMode.get')).toEqual({ enabled: true, auto: false });
  });

  it('force off wins even while auto + server say night', async () => {
    setEnv('night');
    await call('nightMode.set', { auto: true });
    expect(await call('nightMode.get')).toEqual({ enabled: true, auto: true });
    await call('nightMode.set', { enabled: false });
    expect(await call('nightMode.get')).toEqual({
      enabled: false,
      auto: false
    });
  });

  it('follow server: auto:true derives enabled from environment.mode', async () => {
    setEnv('day');
    await call('nightMode.set', { auto: true });
    expect(await call('nightMode.get')).toEqual({ enabled: false, auto: true });
    // A server mode flip while auto is on moves the resolved state.
    setEnv('night');
    expect(await call('nightMode.get')).toEqual({ enabled: true, auto: true });
  });

  it('stopping auto without a target holds the current resolved state', async () => {
    setEnv('night');
    await call('nightMode.set', { auto: true });
    expect(await call('nightMode.get')).toEqual({ enabled: true, auto: true });
    await call('nightMode.set', { auto: false });
    expect(await call('nightMode.get')).toEqual({ enabled: true, auto: false });
  });
});
