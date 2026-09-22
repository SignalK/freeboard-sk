import { describe, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { SKResourceService } from './resources.service';
import { SKChart } from './resource-classes';
import {
  FBChart,
  FBCharts,
  InfoLayerResource,
  InfoLayers
} from 'src/app/types';

/**
 * #784: Overlays were folded into charts. An existing `infolayers` entry is
 * adopted as a chart at read time (no write, no auth) and migrated to a real
 * chart resource when the session can write one. Exercised on a bare
 * prototype instance with the server calls stubbed -- no Angular DI needed.
 */
const OV1 = 'e2b5a6d0-1111-4222-8333-444455556666';
const OV2 = 'f3c6b7e1-2222-4333-9444-555566667777';
const CH1 = `overlay-${OV1}`;
const CH2 = `overlay-${OV2}`;

const overlay = (name: string, refreshInterval = 0): InfoLayerResource => ({
  name,
  description: '',
  type: 'InfoLayer',
  values: {
    url: 'https://wms.example/radar',
    sourceType: 'WMS',
    layers: [name],
    opacity: 0.5,
    minZoom: 3,
    maxZoom: 15,
    refreshInterval
  }
});

const served = (): FBCharts => [
  [
    'noaa',
    new SKChart({
      identifier: 'noaa',
      name: 'NOAA',
      type: 'tilelayer',
      url: 'http://sk.local:3000/charts/noaa/{z}/{x}/{y}',
      scale: 80000
    }),
    true
  ]
];

type Private = {
  adoptedOverlays: Map<string, string>;
  leftoverOverlays: Map<string, string>;
  overlaysToTop: Set<string>;
  overlayMigrationTried: boolean;
  chartCacheSignal: { (): FBCharts; set: (v: FBCharts) => void };
  chartTimeRefreshers: Map<string, unknown>;
  migrateAdoptedOverlays: () => Promise<void>;
  chartTimeFromMapService: (chart: FBChart) => Promise<{ time?: unknown }>;
  putToServer: (c: string, id: string, value: unknown) => Promise<void>;
};

function harness(opts: {
  charts?: FBCharts;
  overlays?: InfoLayers | 'missing';
  chartsSelection?: string[] | null;
  overlaySelection?: string[] | null;
  chartOrder?: string[];
  confirm?: boolean;
  dialogResult?: { save: boolean; chart: SKChart };
}) {
  const svc = Object.create(SKResourceService.prototype) as SKResourceService;
  const overlays = opts.overlays ?? {};
  const app = {
    hostDef: { url: 'http://sk.local:3000' },
    skApiVersion: 2,
    config: {
      selections: {
        charts: opts.chartsSelection === undefined ? [] : opts.chartsSelection,
        infolayers:
          opts.overlaySelection === undefined ? [] : opts.overlaySelection,
        chartOrder: opts.chartOrder ?? ['openstreetmap', 'noaa', 'openseamap'],
        chartOpacity: {},
        chartImageAdjustment: {},
        chartDisplayMinZoom: {},
        chartTimeLoop: {}
      }
    },
    saveConfig: vi.fn(),
    debug: vi.fn(),
    uiConfig: () => ({}),
    MAP_ZOOM_EXTENT: {},
    sIsFetching: signal(false),
    showConfirm: () => of({ ok: opts.confirm ?? true }),
    parseHttpErrorResponse: vi.fn()
  };
  const get = vi.fn((_v: string, path: string) => {
    if (overlays === 'missing') {
      return throwError(() => ({ status: 404 }));
    }
    if (path === '/resources/infolayers') {
      return of(overlays);
    }
    const id = path.replace('/resources/infolayers/', '');
    return overlays[id]
      ? of(overlays[id])
      : throwError(() => ({ status: 404 }));
  });
  const listFromServer = vi.fn(async () => opts.charts ?? served());
  const postToServer = vi.fn(async (_c: string, chart: SKChart) => ({
    state: 'COMPLETED',
    statusCode: 201,
    id: chart.identifier
  }));
  const deleteFromServer = vi.fn(async () => undefined);
  const fromServer = vi.fn(async () => undefined);
  const refreshCharts = vi.fn(async () => undefined);
  const dialog = {
    open: () => ({ afterClosed: () => of(opts.dialogResult) })
  };
  Object.assign(svc as unknown as Record<string, unknown>, {
    app,
    dialog,
    signalk: { api: { get } },
    // Field initialisers do not run on a bare prototype instance.
    adoptedOverlays: new Map(),
    leftoverOverlays: new Map(),
    overlaysToTop: new Set(),
    overlaysUnavailable: false,
    overlayMigrationTried: false,
    chartCacheSignal: signal<FBCharts>([]),
    chartTimeRefreshers: new Map(),
    listFromServer,
    postToServer,
    deleteFromServer,
    fromServer
  });
  const priv = svc as unknown as Private;
  return {
    svc,
    priv,
    app,
    get,
    postToServer,
    deleteFromServer,
    fromServer,
    refreshCharts,
    // swap the real refresh for a spy where a test only wants to see it fire
    stubRefresh: () =>
      Object.assign(svc as unknown as Record<string, unknown>, {
        refreshCharts
      })
  };
}

const ids = (charts: FBCharts) => charts.map((c: FBChart) => c[0]);
const settled = () => new Promise((resolve) => setTimeout(resolve));

describe('adopting Overlays as charts', () => {
  it('lists each infolayers entry as a chart under its adopted id', async () => {
    const { svc } = harness({
      overlays: { [OV1]: overlay('nexrad', 300000) }
    });

    const charts = await svc.listChartsFromServer();

    expect(ids(charts)).toEqual(['noaa', CH1]);
    const adopted = charts[1][1];
    expect(adopted).toBeInstanceOf(SKChart);
    expect(adopted).toMatchObject({
      identifier: CH1,
      name: 'nexrad',
      type: 'WMS',
      layers: ['nexrad'],
      defaultOpacity: 0.5,
      minZoom: 3,
      maxZoom: 15,
      refreshInterval: 300000,
      source: 'resources-provider'
    });
  });

  it('carries a shown Overlay over to the chart selection on first sighting', async () => {
    const { svc, app } = harness({
      overlays: { [OV1]: overlay('shown'), [OV2]: overlay('hidden') },
      chartsSelection: ['noaa'],
      overlaySelection: [OV1]
    });

    const charts = await svc.listChartsFromServer();

    expect(charts.find((c) => c[0] === CH1)?.[2]).toBe(true);
    expect(charts.find((c) => c[0] === CH2)?.[2]).toBe(false);
    expect(app.config.selections.charts).toEqual(['noaa', CH1]);
    expect(app.saveConfig).toHaveBeenCalledOnce();
  });

  it('respects the chart selection once the Overlay has been seen', async () => {
    // The user hid the adopted chart (it is in chartOrder, not in the chart
    // selection): the Overlay's old selection must not resurrect it.
    const { svc, app } = harness({
      overlays: { [OV1]: overlay('shown') },
      chartsSelection: ['noaa'],
      overlaySelection: [OV1],
      chartOrder: ['openstreetmap', 'noaa', 'openseamap', CH1]
    });

    const charts = await svc.listChartsFromServer();

    expect(charts.find((c) => c[0] === CH1)?.[2]).toBe(false);
    expect(app.config.selections.charts).toEqual(['noaa']);
    expect(app.saveConfig).not.toHaveBeenCalled();
  });

  it('lets an existing chart win over an Overlay with the same adopted id', async () => {
    const migrated = served();
    migrated.push([
      CH1,
      new SKChart({ identifier: CH1, name: 'already a chart', type: 'WMS' }),
      true
    ]);
    const { svc, priv } = harness({
      charts: migrated,
      overlays: { [OV1]: overlay('nexrad') }
    });

    const charts = await svc.listChartsFromServer();

    expect(ids(charts)).toEqual(['noaa', CH1]);
    expect(charts[1][1].name).toBe('already a chart');
    expect(priv.adoptedOverlays.size).toBe(0);
    expect(priv.leftoverOverlays.get(CH1)).toBe(OV1);
  });

  it('skips malformed entries', async () => {
    const { svc } = harness({
      overlays: {
        [OV1]: {
          type: 'ResourceSet',
          values: {}
        } as unknown as InfoLayerResource,
        [OV2]: overlay('good')
      }
    });
    expect(ids(await svc.listChartsFromServer())).toEqual(['noaa', CH2]);
  });

  it('stops asking for a collection the server does not have', async () => {
    const { svc, get } = harness({ overlays: 'missing' });

    expect(ids(await svc.listChartsFromServer())).toEqual(['noaa']);
    expect(ids(await svc.listChartsFromServer())).toEqual(['noaa']);

    expect(get).toHaveBeenCalledOnce();
  });

  it('places a newly adopted Overlay above every chart', async () => {
    // Overlays rendered above the chart stack; the adopted chart starts there.
    const { svc, priv, app } = harness({
      overlays: { [OV1]: overlay('nexrad') },
      chartsSelection: null, // all charts shown
      overlaySelection: null
    });
    Object.assign(svc as unknown as Record<string, unknown>, {
      migrateAdoptedOverlays: () => undefined
    });

    await svc.refreshCharts();

    const rendered = ids(priv.chartCacheSignal());
    expect(rendered[rendered.length - 1]).toBe(CH1);
    const order = app.config.selections.chartOrder;
    expect(order[order.length - 1]).toBe(CH1);
    expect(priv.overlaysToTop.size).toBe(0);
  });
});

describe('migrating adopted Overlays', () => {
  it('creates the chart under the adopted id, then deletes the Overlay', async () => {
    const { svc, priv, postToServer, deleteFromServer, refreshCharts } =
      harness({ overlays: { [OV1]: overlay('nexrad', 300000) } });
    await svc.listChartsFromServer();
    Object.assign(svc as unknown as Record<string, unknown>, {
      refreshCharts
    });

    await priv.migrateAdoptedOverlays();

    expect(postToServer).toHaveBeenCalledOnce();
    const [collection, chart] = postToServer.mock.calls[0] as unknown as [
      string,
      SKChart
    ];
    expect(collection).toBe('charts');
    expect(chart).toMatchObject({
      identifier: CH1,
      name: 'nexrad',
      type: 'WMS',
      refreshInterval: 300000
    });
    // local state never reaches the server
    expect('timeValue' in chart).toBe(false);
    expect(deleteFromServer).toHaveBeenCalledWith('infolayers', OV1);
    expect(refreshCharts).toHaveBeenCalledOnce();
  });

  it('does nothing when charts cannot be written, and keeps the adopted entry', async () => {
    const { svc, priv, postToServer, deleteFromServer, refreshCharts } =
      harness({ overlays: { [OV1]: overlay('a'), [OV2]: overlay('b') } });
    postToServer.mockRejectedValue({ status: 401 });
    await svc.listChartsFromServer();
    Object.assign(svc as unknown as Record<string, unknown>, {
      refreshCharts
    });

    await priv.migrateAdoptedOverlays();

    // the first refusal is enough: no point trying the second
    expect(postToServer).toHaveBeenCalledOnce();
    expect(deleteFromServer).not.toHaveBeenCalled();
    expect(refreshCharts).not.toHaveBeenCalled();
    expect(priv.adoptedOverlays.size).toBe(2);
    expect(priv.overlayMigrationTried).toBe(true);
  });

  it('only deletes an Overlay whose chart already exists', async () => {
    const migrated = served();
    migrated.push([
      CH1,
      new SKChart({ identifier: CH1, name: 'nexrad', type: 'WMS' }),
      true
    ]);
    const { svc, priv, postToServer, deleteFromServer, refreshCharts } =
      harness({ charts: migrated, overlays: { [OV1]: overlay('nexrad') } });
    await svc.listChartsFromServer();
    Object.assign(svc as unknown as Record<string, unknown>, {
      refreshCharts
    });

    await priv.migrateAdoptedOverlays();

    expect(postToServer).not.toHaveBeenCalled();
    expect(deleteFromServer).toHaveBeenCalledWith('infolayers', OV1);
    // nothing new was adopted, so the listing is not rebuilt
    expect(refreshCharts).not.toHaveBeenCalled();
  });

  it('treats an Overlay another client already deleted as migrated', async () => {
    const { svc, priv, deleteFromServer, app } = harness({
      overlays: { [OV1]: overlay('nexrad') }
    });
    deleteFromServer.mockRejectedValue({ status: 404 });
    await svc.listChartsFromServer();
    Object.assign(svc as unknown as Record<string, unknown>, {
      refreshCharts: async () => undefined
    });

    await priv.migrateAdoptedOverlays();

    expect(app.debug).toHaveBeenCalledWith(
      `** overlay ${OV1}: migrated to chart ${CH1}`
    );
  });

  it('is attempted once per session', async () => {
    const { svc, priv, postToServer } = harness({
      overlays: { [OV1]: overlay('nexrad') }
    });
    await svc.listChartsFromServer();
    Object.assign(svc as unknown as Record<string, unknown>, {
      refreshCharts: async () => undefined
    });

    await priv.migrateAdoptedOverlays();
    await priv.migrateAdoptedOverlays();

    expect(postToServer).toHaveBeenCalledOnce();
  });

  it('is a no-op with nothing adopted', async () => {
    const { svc, priv, postToServer, deleteFromServer } = harness({});
    await svc.listChartsFromServer();

    await priv.migrateAdoptedOverlays();

    expect(postToServer).not.toHaveBeenCalled();
    expect(deleteFromServer).not.toHaveBeenCalled();
    expect(priv.overlayMigrationTried).toBe(false);
  });
});

describe('removing an adopted Overlay from the chart list', () => {
  it('deletes the infolayers entry, not a chart resource', async () => {
    const { svc, deleteFromServer, stubRefresh, refreshCharts } = harness({
      overlays: { [OV1]: overlay('nexrad') }
    });
    await svc.listChartsFromServer();
    stubRefresh();

    svc.deleteChart(CH1);
    await settled();

    expect(deleteFromServer).toHaveBeenCalledOnce();
    expect(deleteFromServer).toHaveBeenCalledWith('infolayers', OV1);
    expect(refreshCharts).toHaveBeenCalled();
  });

  it('removes both records for a migrated Overlay chart', async () => {
    // A leftover infolayers entry would otherwise be adopted right back.
    const migrated = served();
    migrated.push([
      CH1,
      new SKChart({ identifier: CH1, name: 'nexrad', type: 'WMS' }),
      true
    ]);
    const { svc, deleteFromServer, stubRefresh } = harness({
      charts: migrated,
      overlays: { [OV1]: overlay('nexrad') }
    });
    await svc.listChartsFromServer();
    stubRefresh();

    svc.deleteChart(CH1);
    await settled();

    expect(deleteFromServer).toHaveBeenCalledWith(
      'charts',
      CH1,
      'resources-provider'
    );
    expect(deleteFromServer).toHaveBeenCalledWith('infolayers', OV1);
  });

  it('deletes an ordinary chart as before', async () => {
    const { svc, deleteFromServer, stubRefresh, refreshCharts } = harness({});
    await svc.listChartsFromServer();
    stubRefresh();

    svc.deleteChart('noaa');
    await settled();

    expect(deleteFromServer).toHaveBeenCalledOnce();
    expect(deleteFromServer).toHaveBeenCalledWith(
      'charts',
      'noaa',
      'resources-provider'
    );
    expect(refreshCharts).not.toHaveBeenCalled();
  });
});

describe('editing an adopted Overlay', () => {
  it('opens the properties dialog from the Overlay and migrates it on Save', async () => {
    const edited = new SKChart({
      identifier: CH1,
      name: 'NEXRAD (renamed)',
      type: 'WMS',
      url: 'https://wms.example/radar',
      layers: ['nexrad']
    });
    const { svc, postToServer, deleteFromServer, stubRefresh, refreshCharts } =
      harness({
        overlays: { [OV1]: overlay('nexrad') },
        chartsSelection: ['noaa'],
        dialogResult: { save: true, chart: edited }
      });
    await svc.listChartsFromServer();
    stubRefresh();

    await svc.editChartInfo(CH1);
    await settled();

    expect(postToServer).toHaveBeenCalledOnce();
    const [, chart] = postToServer.mock.calls[0] as unknown as [
      string,
      SKChart
    ];
    expect(chart.identifier).toBe(CH1);
    expect(chart.name).toBe('NEXRAD (renamed)');
    expect(deleteFromServer).toHaveBeenCalledWith('infolayers', OV1);
    expect(refreshCharts).toHaveBeenCalled();
  });

  it('re-reads an adopted WMS entry from its map service on a timeline refresh tick, and writes nothing', async () => {
    // The follower re-reads a chart's time dimension each tick (#799). An
    // adopted WMS / WMTS entry is a user-added source, so like any other it
    // is read from GetCapabilities (#804) -- its Overlay record is only the
    // snapshot taken when it was saved -- and, having no chart resource until
    // it migrates, the fresh dimension is never written back.
    const T1 = '2026-09-21T12:00:00.000Z';
    const T2 = '2026-09-21T12:05:00.000Z';
    const timed = overlay('nexrad', 300000);
    timed.values.time = { current: T1, from: T1, to: T1, values: [T1] };
    const { svc, priv, get, fromServer } = harness({
      overlays: { [OV1]: timed }
    });
    const charts = await svc.listChartsFromServer();
    priv.chartCacheSignal.set(charts.filter((c) => c[0] === CH1));
    priv.chartTimeRefreshers.set(CH1, {
      interval: 300000,
      timer: undefined,
      pending: null
    });
    const service = vi.fn((_c: FBChart) =>
      Promise.resolve({ time: { current: true, values: [T1, T2] } })
    );
    priv.chartTimeFromMapService = service;
    priv.putToServer = vi.fn(() => Promise.resolve());
    get.mockClear();

    await svc.chartRefreshTimeDimension(CH1);

    expect(service).toHaveBeenCalledTimes(1);
    expect(service.mock.calls[0][0][0]).toBe(CH1);
    expect(fromServer).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
    expect(priv.chartCacheSignal()[0][1].time).toEqual({
      current: true,
      values: [T1, T2]
    });
    expect(priv.putToServer).not.toHaveBeenCalled();
  });

  it('writes nothing when the dialog is cancelled', async () => {
    const { svc, postToServer, deleteFromServer, stubRefresh } = harness({
      overlays: { [OV1]: overlay('nexrad') },
      dialogResult: { save: false, chart: undefined }
    });
    await svc.listChartsFromServer();
    stubRefresh();

    await svc.editChartInfo(CH1);
    await settled();

    expect(postToServer).not.toHaveBeenCalled();
    expect(deleteFromServer).not.toHaveBeenCalled();
  });
});
