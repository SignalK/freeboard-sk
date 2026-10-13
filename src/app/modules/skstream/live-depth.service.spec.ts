import { describe, expect, it, vi } from 'vitest';
import { of, Subject } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { SignalKClient } from 'signalk-client-angular';
import { LiveDepthService } from './live-depth.service';
import { SKStreamFacade } from './skstream.facade';
import {
  encodeDepth,
  encodeTile,
  mergeCell,
  type TileCells
} from 'signalk-livedepth-tiles';

const PATH = 'environment.depth.belowTransducer';

const streamStub = { vessels$: () => of(), selfVessel: undefined };

const setup = (get: (v: number, path: string) => unknown = () => undefined) => {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      LiveDepthService,
      { provide: SignalKClient, useValue: { api: { get } } },
      { provide: SKStreamFacade, useValue: streamStub }
    ]
  });
  return TestBed.inject(LiveDepthService);
};

describe('live-depth service config', () => {
  it('applies persisted settings to its signals', () => {
    const svc = setup();
    svc.applyConfig({
      enabled: false,
      source: 'environment.depth.belowKeel',
      historyWindow: 2,
      historyResolution: 0.5,
      safetyDepth: 4,
      shadeLimit: 12,
      contourInterval: 2,
      maxDepth: 60,
      cellPx: 30,
      opacity: 0.5,
      mergeTolerance: 20
    });
    expect(svc.enabled()).toBe(false);
    expect(svc.depthPath()).toBe('environment.depth.belowKeel');
    expect(svc.historyWindowHours()).toBe(2);
    expect(svc.historyResolutionS()).toBe(0.5);
    expect(svc.safetyDepthMetres()).toBe(4);
    expect(svc.maxDepthMetres()).toBe(60);
    expect(svc.cellPx()).toBe(30);
    expect(svc.opacity()).toBe(0.5);
    expect(svc.mergeTolerance()).toBe(0.2);
  });

  it('starts and stops polling with enabled, clearing held samples', () => {
    const svc = setup();
    svc.setEnabled(true);
    expect(svc.enabled()).toBe(true);
    svc.setEnabled(false);
    expect(svc.enabled()).toBe(false);
    expect(svc.samples()).toEqual([]);
  });
});

describe('live-depth service fetch', () => {
  const historyFc = {
    values: [{ path: 'navigation.position' }, { path: PATH }],
    data: [
      ['2026-10-11T13:00:00Z', [-77.63, 8.82], 5],
      ['2026-10-11T14:00:00Z', [-77.63, 8.82], 6],
      // outside the view, must be dropped
      ['2026-10-11T14:00:30Z', [-70, 8.82], 9]
    ]
  };

  it('queries History only (never the Track API) and publishes the whole window', () => {
    vi.useFakeTimers();
    const get = vi.fn((_v: number, _path: string) => of(historyFc));
    const svc = setup(get);
    svc.applyConfig({
      enabled: true,
      source: PATH,
      historyWindow: 1,
      historyResolution: 0.5,
      safetyDepth: 3,
      shadeLimit: 10,
      contourInterval: 1,
      maxDepth: 100,
      cellPx: 24,
      opacity: 0.85,
      mergeTolerance: 15
    });
    vi.advanceTimersByTime(500);
    vi.useRealTimers();

    const paths = get.mock.calls.map((c) => c[1] as string);
    expect(paths.some((p) => p.startsWith('/tracks'))).toBe(false);
    const hist = paths.find((p) => p.startsWith('/history/values'));
    expect(hist).toBeTruthy();
    expect(hist).toContain('resolution=0.5');
    // every row with a position is published (no viewport clipping)
    expect(svc.samples()).toEqual([
      { lon: -77.63, lat: 8.82, depth: 5 },
      { lon: -77.63, lat: 8.82, depth: 6 },
      { lon: -70, lat: 8.82, depth: 9 }
    ]);
  });
});

describe('live-depth service tiles', () => {
  const tileBuf = (depth: number) => {
    const cells: TileCells = new Map();
    mergeCell(cells, 0, encodeDepth(depth));
    return encodeTile(cells).buffer;
  };

  const tilesSetup = (
    vessels$: Subject<void>,
    self: () => unknown,
    metaDepthPath?: string,
    transducer?: { forward: number; starboard: number }
  ) => {
    const httpGet = vi.fn((url: string) => {
      if (url.includes('/bathymetry/meta')) {
        return of({
          format: 'sparse-v1',
          baseZoom: 20,
          minZoom: 10,
          tileSize: 256,
          recordBytes: 5,
          ...(metaDepthPath ? { depthPath: metaDepthPath } : {}),
          ...(transducer ? { transducer } : {})
        });
      }
      return of(tileBuf(50));
    });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        LiveDepthService,
        {
          provide: SignalKClient,
          useValue: {
            api: { get: () => undefined },
            server: {
              endpoints: {
                v1: {
                  'signalk-http': 'http://localhost:3000/signalk/v1/api/'
                }
              }
            }
          }
        },
        {
          provide: SKStreamFacade,
          useValue: {
            vessels$: () => vessels$,
            get selfVessel() {
              return self();
            }
          }
        },
        { provide: HttpClient, useValue: { get: httpGet } }
      ]
    });
    const svc = TestBed.inject(LiveDepthService);
    svc.applyConfig({
      enabled: true,
      mode: 'tiles',
      source: PATH,
      historyWindow: 1,
      historyResolution: 1,
      safetyDepth: 3,
      shadeLimit: 10,
      contourInterval: 1,
      maxDepth: 100,
      cellPx: 24,
      opacity: 0.85,
      mergeTolerance: 15
    });
    return { svc, httpGet };
  };

  it('fetches LiveDepth tiles for the view and decodes them', () => {
    vi.useFakeTimers();
    const { svc, httpGet } = tilesSetup(new Subject(), () => undefined);
    svc.setView([0.0008, 0.0008, 0.0012, 0.0012], 0.15);
    vi.advanceTimersByTime(500);
    vi.useRealTimers();

    const urls = httpGet.mock.calls.map((c) => c[0] as string);
    expect(urls.some((u) => u.endsWith('/bathymetry/meta'))).toBe(true);
    expect(
      urls.some((u) =>
        u.includes('/plugins/signalk-livedepth-plugin/bathymetry/tiles/20/')
      )
    ).toBe(true);
    expect(svc.samples().some((s) => s.depth === 50)).toBe(true);
  });

  it('folds live own-vessel position+depth into the tiles', () => {
    vi.useFakeTimers();
    const vessels$ = new Subject<void>();
    const { svc } = tilesSetup(vessels$, () => ({
      position: [0.001, 0.001],
      properties: { [PATH]: 7 }
    }));
    svc.setView([0.0008, 0.0008, 0.0012, 0.0012], 0.15);
    vi.advanceTimersByTime(500); // tile fetch
    vessels$.next(); // a live update
    vi.advanceTimersByTime(1000); // live flush
    vi.useRealTimers();

    expect(svc.samples().some((s) => s.depth === 7)).toBe(true);
  });

  it('reads the plugin-supplied depth path in tile mode', () => {
    vi.useFakeTimers();
    const vessels$ = new Subject<void>();
    const pluginPath = 'environment.depth.belowSurface';
    const { svc } = tilesSetup(
      vessels$,
      () => ({
        position: [0.001, 0.001],
        properties: { [pluginPath]: 7 }
      }),
      pluginPath
    );
    svc.setView([0.0008, 0.0008, 0.0012, 0.0012], 0.15);
    vi.advanceTimersByTime(500); // tile fetch loads the plugin meta
    expect(svc.effectiveDepthPath()).toBe(pluginPath);

    vessels$.next(); // a live update
    vi.advanceTimersByTime(1000); // live flush
    vi.useRealTimers();

    // the live extension read the plugin's path, not the FSK setting
    expect(svc.samples().some((s) => s.depth === 7)).toBe(true);
  });

  it('shifts live soundings to the transducer from the plugin meta', () => {
    vi.useFakeTimers();
    const vessels$ = new Subject<void>();
    const { svc } = tilesSetup(
      vessels$,
      () => ({
        position: [0, 0],
        headingTrue: 0, // north
        properties: { [PATH]: 7 }
      }),
      undefined,
      { forward: 100, starboard: 0 }
    );
    svc.setView([-0.002, -0.002, 0.002, 0.002], 0.15);
    vi.advanceTimersByTime(500); // tile fetch loads the meta
    vessels$.next();
    vi.advanceTimersByTime(1000); // live flush
    vi.useRealTimers();

    const live = svc.samples().find((s) => s.depth === 7);
    expect(live).toBeTruthy();
    // forward 100 m at heading 0 = north of the reported (0, 0); the published
    // position is the base-level cell centre, so it is only approximate.
    expect(live!.lat).toBeGreaterThan(8e-4);
    expect(Math.abs(live!.lon)).toBeLessThan(1e-4);
  });

  it('fetches nothing for a view too large to cover in a bounded number of tiles', () => {
    vi.useFakeTimers();
    const { svc, httpGet } = tilesSetup(new Subject(), () => undefined);
    // A world-scale view at the coarsest level would need hundreds of tiles.
    svc.setView([-170, -80, 170, 80], 40000);
    vi.advanceTimersByTime(500);
    vi.useRealTimers();

    const urls = httpGet.mock.calls.map((c) => c[0] as string);
    expect(urls.some((u) => u.includes('/bathymetry/tiles/'))).toBe(false);
    expect(svc.samples()).toEqual([]);
  });
});
