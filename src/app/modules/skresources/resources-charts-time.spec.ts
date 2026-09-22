import { afterEach, describe, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { SKResourceService } from './resources.service';
import { SKChart } from './resource-classes';
import { ChartTimeDimension, FBChart, FBCharts } from 'src/app/types';

/**
 * A time-varying chart's selected instant is session state held in the chart
 * cache: `chartSetTime` rebuilds the addressed entry so the visible layer
 * retargets, never persists it, and never lets it reach the server. Exercised
 * on a bare prototype instance with a stubbed cache -- no Angular DI needed.
 */
const T0 = '2026-09-18T12:00:00.000Z';
const T1 = '2026-09-18T12:05:00.000Z';

const radar = () =>
  new SKChart({
    name: 'Radar',
    url: 'http://r/{z}/{x}/{y}.png',
    minzoom: 3,
    maxzoom: 12,
    refreshInterval: 300000,
    time: {
      url: 'http://r/{z}/{x}/{y}.png?t={time}',
      current: true,
      from: T0,
      to: T1,
      step: 300000
    }
  });

const cachedCharts = (): FBCharts => [
  ['radar', radar(), true],
  ['static', new SKChart({ name: 'S', url: 'http://s/{z}/{x}/{y}.png' }), true]
];

function svcWithCache() {
  const svc = Object.create(SKResourceService.prototype) as SKResourceService;
  Object.assign(svc as unknown as Record<string, unknown>, {
    chartCacheSignal: signal(cachedCharts()),
    // Field initialisers do not run on a bare prototype instance.
    chartTimeFollowers: new Map()
  });
  return svc;
}

const cache = (svc: SKResourceService) =>
  (svc as unknown as { chartCacheSignal: () => FBCharts }).chartCacheSignal();

describe('chartSetTime', () => {
  it('shows the addressed chart at the instant', () => {
    const svc = svcWithCache();
    svc.chartSetTime('radar', T0);
    expect(cache(svc)[0][1].timeValue).toBe(T0);
  });

  it('rebuilds the entry so the layer re-renders, keeping the rest of the chart', () => {
    const svc = svcWithCache();
    const before = cache(svc)[0];
    svc.chartSetTime('radar', T0);
    const after = cache(svc)[0];
    expect(after).not.toBe(before);
    expect(after[1].minZoom).toBe(3);
    expect(after[1].refreshInterval).toBe(300000);
    expect(after[1].time).toEqual(before[1].time);
  });

  it('returns to live for null', () => {
    const svc = svcWithCache();
    svc.chartSetTime('radar', T0);
    svc.chartSetTime('radar', null);
    expect(cache(svc)[0][1].timeValue).toBeNull();
  });

  it('passes the instant through unchanged rather than snapping it', () => {
    const svc = svcWithCache();
    svc.chartSetTime('radar', '2026-09-18T12:02:30Z');
    expect(cache(svc)[0][1].timeValue).toBe('2026-09-18T12:02:30Z');
  });

  it('leaves the other cached charts untouched', () => {
    const svc = svcWithCache();
    const other = cache(svc)[1];
    svc.chartSetTime('radar', T0);
    expect(cache(svc)[1]).toBe(other);
  });

  it('ignores a chart without a time dimension, an unknown id and a bad instant', () => {
    const svc = svcWithCache();
    const before = cache(svc);
    svc.chartSetTime('static', T0);
    svc.chartSetTime('nope', T0);
    svc.chartSetTime('radar', 'noon');
    expect(cache(svc)).toBe(before);
  });

  it('ignores a tile chart whose dimension has no template to request an instant with', () => {
    const svc = svcWithCache();
    const untargetable = new SKChart({
      name: 'No template',
      url: 'http://n/{z}/{x}/{y}.png',
      type: 'tilelayer',
      time: { current: true, from: T0, to: T1 }
    });
    (
      svc as unknown as { chartCacheSignal: { set: (v: FBCharts) => void } }
    ).chartCacheSignal.set([['nt', untargetable, true]]);
    svc.chartSetTime('nt', T0);
    // Left live: the layer could not have shown the instant, and would have
    // suspended its refresh while still drawing live tiles.
    expect(cache(svc)[0][1].timeValue).toBeNull();
  });

  it('does not rebuild the entry for the instant it already shows', () => {
    const svc = svcWithCache();
    svc.chartSetTime('radar', T0);
    const entry = cache(svc)[0];
    svc.chartSetTime('radar', T0);
    expect(cache(svc)[0]).toBe(entry);
  });
});

describe('chartIsTemporal', () => {
  const svc = svcWithCache();
  const entry = (chart: Partial<SKChart>): FBChart => [
    'x',
    chart as SKChart,
    true
  ];

  it('is true for a raster chart with a usable timeline', () => {
    expect(svc.chartIsTemporal(cache(svc)[0])).toBe(true);
    expect(
      svc.chartIsTemporal(
        entry({ type: 'WMS', time: { current: true, values: [T0, T1] } })
      )
    ).toBe(true);
  });

  it('is false without a time dimension, or with an unusable one', () => {
    expect(svc.chartIsTemporal(cache(svc)[1])).toBe(false);
    expect(
      svc.chartIsTemporal(entry({ type: 'tilelayer', time: { current: true } }))
    ).toBe(false);
  });

  it('needs a time.url template on the URL-template sources, not on WMS/WMTS', () => {
    const noTemplate = { current: true, from: T0, to: T1 };
    const template = {
      ...noTemplate,
      url: 'http://r/{z}/{x}/{y}.png?t={time}'
    };
    for (const type of ['tilelayer', 'tileJSON', undefined]) {
      expect(svc.chartIsTemporal(entry({ type, time: noTemplate }))).toBe(
        false
      );
      expect(svc.chartIsTemporal(entry({ type, time: template }))).toBe(true);
    }
    expect(svc.chartIsTemporal(entry({ type: 'WMS', time: noTemplate }))).toBe(
      true
    );
    expect(svc.chartIsTemporal(entry({ type: 'wmts', time: noTemplate }))).toBe(
      true
    );
  });

  it('is false for a vector chart, which never applies one', () => {
    const time = { current: true, from: T0, to: T1 };
    expect(svc.chartIsTemporal(entry({ type: 'mapstyleJSON', time }))).toBe(
      false
    );
    expect(
      svc.chartIsTemporal(entry({ type: 'tilelayer', format: 'pbf', time }))
    ).toBe(false);
  });
});

describe('sending a chart to the server', () => {
  it('strips the selected instant, which is session state', () => {
    const svc = svcWithCache();
    const chart = radar();
    chart.timeValue = T0;
    const outbound = (
      svc as unknown as {
        withoutLocalState: (c: SKChart) => Record<string, unknown>;
      }
    ).withoutLocalState(chart);
    expect('timeValue' in outbound).toBe(false);
    // The dimension itself is part of the resource and stays.
    expect(outbound.time).toEqual(chart.time);
  });
});

describe('refreshing the chart list', () => {
  it('keeps the instant each scrubbed chart is showing', async () => {
    const svc = svcWithCache();
    svc.chartSetTime('radar', T0);
    // A refresh rebuilds every entry from the server listing (say, after
    // another chart was toggled); the fresh entry knows nothing of the scrub.
    const served: FBCharts = [
      ['radar', radar(), true],
      [
        'static',
        new SKChart({ name: 'S', url: 'http://s/{z}/{x}/{y}.png' }),
        true
      ]
    ];
    Object.assign(svc as unknown as Record<string, unknown>, {
      app: {
        debug: () => undefined,
        uiConfig: () => ({}),
        MAP_ZOOM_EXTENT: {}
      },
      listChartsFromServer: vi.fn(async () => served),
      appendOSM: (l: FBCharts) => l,
      sortByScaleDesc: (l: FBCharts) => l,
      arrangeChartLayers: (l: FBCharts) => l,
      setMapZoomRange: () => undefined,
      migrateAdoptedOverlays: () => undefined
    });

    await svc.refreshCharts();

    expect(cache(svc)[0][1].timeValue).toBe(T0);
    expect(cache(svc)[1][1].timeValue).toBeNull();
  });
});

describe('transformChart', () => {
  const transform = (chart: Record<string, unknown>) => {
    const svc = Object.create(SKResourceService.prototype) as SKResourceService;
    (svc as unknown as { app: unknown }).app = {
      hostDef: { url: 'http://sk.local:3000' },
      config: { selections: { chartOpacity: {}, chartImageAdjustment: {} } }
    };
    return (
      svc as unknown as {
        transformChart: (c: unknown, id: string) => SKChart;
      }
    ).transformChart(chart, 'radar');
  };

  it('resolves a relative time.url against the server, like url', () => {
    const chart = transform({
      name: 'Radar',
      type: 'tilelayer',
      url: '/radar/{z}/{x}/{y}.png',
      time: { url: '/radar/{z}/{x}/{y}.png?t={time}', current: true }
    });
    expect(chart.url).toBe('http://sk.local:3000/radar/{z}/{x}/{y}.png');
    expect(chart.time?.url).toBe(
      'http://sk.local:3000/radar/{z}/{x}/{y}.png?t={time}'
    );
  });

  it('resolves time.url for an untyped chart and joins on exactly one slash', () => {
    const untyped = transform({
      name: 'Radar',
      url: 'http://sk.local:3000/radar/{z}/{x}/{y}.png',
      time: { url: 'radar/{z}/{x}/{y}.png?t={time}', current: true }
    });
    expect(untyped.time?.url).toBe(
      'http://sk.local:3000/radar/{z}/{x}/{y}.png?t={time}'
    );
    const svcSlash = Object.create(
      SKResourceService.prototype
    ) as SKResourceService;
    (svcSlash as unknown as { app: unknown }).app = {
      hostDef: { url: 'http://sk.local:3000/' },
      config: { selections: { chartOpacity: {}, chartImageAdjustment: {} } }
    };
    const chart = (
      svcSlash as unknown as {
        transformChart: (c: unknown, id: string) => SKChart;
      }
    ).transformChart(
      {
        name: 'Radar',
        type: 'tilelayer',
        url: '/radar/{z}/{x}/{y}.png',
        time: { url: '/radar/{z}/{x}/{y}.png?t={time}', current: true }
      },
      'radar'
    );
    expect(chart.time?.url).toBe(
      'http://sk.local:3000/radar/{z}/{x}/{y}.png?t={time}'
    );
  });

  it('leaves an absolute time.url alone', () => {
    const chart = transform({
      name: 'Radar',
      type: 'tilelayer',
      url: 'https://r.test/{z}/{x}/{y}.png',
      time: { url: 'https://r.test/{z}/{x}/{y}.png?t={time}', current: true }
    });
    expect(chart.time?.url).toBe('https://r.test/{z}/{x}/{y}.png?t={time}');
  });
});

/**
 * A chart with a refresh interval follows the timeline head while it shows a
 * past frame: each tick re-reads the chart resource (the frames a provider
 * offers move on) and advances the selected instant by however far the head
 * moved, keeping its offset from it (#795).
 */
describe('timeline head followers', () => {
  const STEP = 300000;
  const NOW = '2026-09-18T12:07:00.000Z';
  const T2 = '2026-09-18T12:10:00.000Z';
  const T3 = '2026-09-18T12:15:00.000Z';
  // IEM-shaped: archival, range running past now.
  const nexrad = (): ChartTimeDimension => ({
    current: false,
    from: '2026-09-01T00:00:00.000Z',
    to: '2026-12-31T00:00:00.000Z',
    step: STEP
  });
  const wms = (time: ChartTimeDimension, refreshInterval?: number) =>
    new SKChart({
      name: 'NEXRAD',
      type: 'wms',
      url: 'http://iem/n0q-t.cgi',
      layers: ['nexrad-n0q-wmst'],
      refreshInterval,
      time
    });

  type Followers = Map<string, { interval: number; head: number }>;
  type Internals = {
    chartCacheSignal: {
      (): FBCharts;
      set: (v: FBCharts) => void;
    };
    chartTimeFollowers: Followers;
    adoptedOverlays: Map<string, string>;
    syncChartTimeFollowers: (charts: FBCharts) => void;
    fromServer: (c: string, id: string) => Promise<SKChart>;
    chartTimeFromMapService: (
      chart: FBChart
    ) => Promise<{ time?: ChartTimeDimension }>;
    putToServer: (c: string, id: string, value: unknown) => Promise<void>;
    absorbChartDelta: (id: string, value: unknown) => boolean;
    processResourceMessage: (msg: unknown[]) => void;
    refreshCharts: () => Promise<void>;
    app: { debug: () => void };
  };

  // `charts` is a factory: a chart opens on the head as of the faked clock.
  function following(
    charts: () => FBCharts,
    fresh?: () => Promise<SKChart>,
    service?: (chart: FBChart) => Promise<{ time?: ChartTimeDimension }>
  ) {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
    const svc = Object.create(SKResourceService.prototype) as SKResourceService;
    const internals = svc as unknown as Internals;
    internals.chartCacheSignal = signal(charts());
    internals.chartTimeFollowers = new Map();
    internals.adoptedOverlays = new Map();
    internals.app = { debug: () => undefined };
    internals.fromServer =
      fresh ??
      ((_c: string, id: string) =>
        Promise.resolve(
          new SKChart(internals.chartCacheSignal().find((c) => c[0] === id)[1])
        ));
    internals.chartTimeFromMapService =
      service ?? (() => Promise.reject(new Error('no worker here')));
    internals.putToServer = vi.fn(() => Promise.resolve());
    // What the constructor's effect does on each cache change.
    internals.syncChartTimeFollowers(internals.chartCacheSignal());
    return { svc, internals };
  }
  const shown = (svc: SKResourceService) => cache(svc)[0][1].timeValue;
  // A tick's re-read is a promise; let it settle after the timer fires.
  const tick = async (ms: number) => {
    await vi.advanceTimersByTimeAsync(ms);
  };

  afterEach(() => vi.useRealTimers());

  it('follows a displayed temporal chart with a refresh interval, and only that', () => {
    const { internals } = following(() => [
      ['nexrad', wms(nexrad(), STEP), true],
      ['manual', wms(nexrad()), true],
      [
        'static',
        new SKChart({
          name: 'S',
          url: 'http://s/{z}/{x}/{y}.png',
          refreshInterval: STEP
        }),
        true
      ]
    ]);
    expect([...internals.chartTimeFollowers.keys()]).toEqual(['nexrad']);
    expect(internals.chartTimeFollowers.get('nexrad').interval).toBe(STEP);
  });

  it('keeps a chart that opened on the head on the head as frames arrive', async () => {
    const { svc } = following(() => [['nexrad', wms(nexrad(), STEP), true]]);
    expect(shown(svc)).toBe('2026-09-18T12:05:00.000Z');
    await tick(STEP); // 12:12 -- 12:10 exists now
    expect(shown(svc)).toBe(T2);
    await tick(STEP); // 12:17
    expect(shown(svc)).toBe(T3);
  });

  it('keeps a scrubbed chart at its offset from the head', async () => {
    const { svc } = following(() => [['nexrad', wms(nexrad(), STEP), true]]);
    svc.chartSetTime('nexrad', '2026-09-18T11:05:00.000Z'); // an hour back
    await tick(STEP);
    expect(shown(svc)).toBe('2026-09-18T11:10:00.000Z');
  });

  it('measures a new selection from the head as it is then, not as last seen', async () => {
    const { svc } = following(() => [
      ['nexrad', wms(nexrad(), 2 * STEP), true]
    ]);
    // The head moved on to 12:10 since the follower last looked (12:05).
    vi.setSystemTime(new Date('2026-09-18T12:11:00.000Z'));
    svc.chartSetTime('nexrad', '2026-09-18T11:10:00.000Z'); // an hour back
    await tick(2 * STEP); // 12:21 -- head 12:20
    expect(shown(svc)).toBe('2026-09-18T11:20:00.000Z');
  });

  it('re-reads the resource so a values list that rolled on is followed', async () => {
    const t = (n: number) =>
      new Date(Date.parse('2026-09-18T12:05:00.000Z') + n * STEP).toISOString();
    const listed = (from: number, to: number): ChartTimeDimension => ({
      current: false,
      values: Array.from({ length: to - from + 1 }, (_, i) => t(from + i))
    });
    const rolled = wms(listed(-9, 1), STEP);
    const { svc, internals } = following(
      () => [['nexrad', wms(listed(-10, 0), STEP), true]],
      () => Promise.resolve(rolled)
    );
    expect(shown(svc)).toBe(t(0));
    await tick(STEP);
    // The cache carries the fresh timeline, and the selection the new head.
    expect(internals.chartCacheSignal()[0][1].time).toEqual(rolled.time);
    expect(shown(svc)).toBe(t(1));
  });

  /**
   * A user-added WMS / WMTS chart lives in the resources-provider store,
   * whose `time` block is the snapshot of GetCapabilities taken when it was
   * saved -- re-reading the resource would return the same frozen list. Its
   * tick re-reads the map service itself instead (#804).
   */
  describe('a user-added WMS chart', () => {
    const t = (n: number) =>
      new Date(Date.parse('2026-09-18T12:05:00.000Z') + n * STEP).toISOString();
    const listed = (from: number, to: number): ChartTimeDimension => ({
      current: true,
      values: Array.from({ length: to - from + 1 }, (_, i) => t(from + i))
    });
    const userAdded = (time: ChartTimeDimension) => {
      const c = wms(time, STEP);
      c.source = 'resources-provider';
      return c;
    };

    it('is brought up to date as soon as it is displayed, then on each tick', async () => {
      const service = vi.fn((_c: FBChart) =>
        Promise.resolve({ time: listed(-9, 1) })
      );
      const { svc, internals } = following(
        () => [['nowcoast', userAdded(listed(-10, 0)), true]],
        undefined,
        service
      );
      // The immediate tick: no interval has passed.
      expect(service).toHaveBeenCalledTimes(1);
      expect(service.mock.calls[0][0][0]).toBe('nowcoast');
      await tick(0);
      expect(internals.chartCacheSignal()[0][1].time).toEqual(listed(-9, 1));
      await tick(STEP);
      expect(service).toHaveBeenCalledTimes(2);
      expect(shown(svc)).toBeNull(); // live: left to the layer refresh
    });

    it('re-reads the map service, not the resource, and follows the head', async () => {
      const resource = vi.fn(() => Promise.resolve(userAdded(listed(-10, 0))));
      let current = listed(-10, 0);
      const { svc, internals } = following(
        () => [['nowcoast', userAdded(listed(-10, 0)), true]],
        resource,
        () => Promise.resolve({ time: current })
      );
      await tick(0);
      svc.chartSetTime('nowcoast', t(0)); // scrubbed onto the head
      current = listed(-9, 1);
      await tick(STEP);
      expect(resource).not.toHaveBeenCalled();
      expect(internals.chartCacheSignal()[0][1].time).toEqual(listed(-9, 1));
      expect(shown(svc)).toBe(t(1));
    });

    it('writes the fresh dimension back to the resource, without session state', async () => {
      const { svc, internals } = following(
        () => [['nowcoast', userAdded(listed(-10, 0)), true]],
        undefined,
        () => Promise.resolve({ time: listed(-9, 1) })
      );
      svc.chartSetTime('nowcoast', t(0));
      await tick(0);
      const put = internals.putToServer as ReturnType<typeof vi.fn>;
      expect(put).toHaveBeenCalledTimes(1);
      const [collection, id, value] = put.mock.calls[0] as [
        string,
        string,
        SKChart
      ];
      expect(collection).toBe('charts');
      expect(id).toBe('nowcoast');
      expect(value.time).toEqual(listed(-9, 1));
      expect('timeValue' in value).toBe(false);
      // Nothing new on the next tick: nothing written.
      await tick(STEP);
      expect(put).toHaveBeenCalledTimes(1);
    });

    it('is still re-read from the resource when served by a plugin, and never written back', async () => {
      const resource = vi.fn(() => Promise.resolve(wms(listed(-9, 1), STEP)));
      const service = vi.fn((_c: FBChart) =>
        Promise.resolve({ time: listed(-9, 1) })
      );
      const { internals } = following(
        () => [['plugin', wms(listed(-10, 0), STEP), true]],
        resource,
        service
      );
      expect(service).not.toHaveBeenCalled(); // no immediate tick
      await tick(STEP);
      expect(resource).toHaveBeenCalledTimes(1);
      expect(service).not.toHaveBeenCalled();
      expect(internals.putToServer).not.toHaveBeenCalled();
    });

    it('refreshes an adopted Overlay in memory only -- it has no resource to write', async () => {
      const service = vi.fn((_c: FBChart) =>
        Promise.resolve({ time: listed(-9, 1) })
      );
      const { internals } = following(
        () => [['overlay-x', userAdded(listed(-10, 0)), true]],
        undefined,
        service
      );
      internals.adoptedOverlays.set('overlay-x', 'x');
      internals.syncChartTimeFollowers([]);
      internals.syncChartTimeFollowers(internals.chartCacheSignal());
      await tick(0);
      expect(service).toHaveBeenCalled();
      expect(internals.chartCacheSignal()[0][1].time).toEqual(listed(-9, 1));
      expect(internals.putToServer).not.toHaveBeenCalled();
    });

    it('keeps its timeline when the service cannot be read', async () => {
      const { svc, internals } = following(
        () => [['nowcoast', userAdded(listed(-10, 0)), true]],
        undefined,
        () => Promise.reject(new Error('offline'))
      );
      await tick(0);
      svc.chartSetTime('nowcoast', t(0));
      await tick(STEP);
      expect(internals.chartCacheSignal()[0][1].time).toEqual(listed(-10, 0));
      expect(shown(svc)).toBe(t(0));
      expect(internals.putToServer).not.toHaveBeenCalled();
    });

    /**
     * The write-back raises a resource delta on every client. One that only
     * carries a new dimension is taken into the displayed chart in place --
     * no full chart re-list -- whether it is the writer's own echo or news
     * to another client.
     */
    describe('the resource delta it raises', () => {
      const withTransform = (internals: Internals) => {
        internals.app = {
          debug: () => undefined,
          hostDef: { url: 'http://sk.local:3000' },
          config: {
            selections: {
              chartOpacity: {},
              chartImageAdjustment: {},
              chartDisplayMinZoom: {}
            }
          }
        } as unknown as Internals['app'];
      };
      const resourceOf = (chart: SKChart) => {
        const r = { ...chart } as Record<string, unknown>;
        delete r.timeValue;
        delete r.displayMinZoom;
        return r;
      };

      it('is absorbed in place when only the dimension changed', () => {
        const { svc, internals } = following(() => [
          ['nowcoast', userAdded(listed(-10, 0)), true]
        ]);
        withTransform(internals);
        svc.chartSetTime('nowcoast', t(0));
        const delta = resourceOf(userAdded(listed(-9, 1)));
        expect(internals.absorbChartDelta('nowcoast', delta)).toBe(true);
        expect(internals.chartCacheSignal()[0][1].time).toEqual(listed(-9, 1));
        expect(shown(svc)).toBe(t(0)); // session state kept
      });

      it('is absorbed as a no-op when it is the echo of what is held', () => {
        const { internals } = following(() => [
          ['nowcoast', userAdded(listed(-10, 0)), true]
        ]);
        withTransform(internals);
        const before = internals.chartCacheSignal()[0];
        const delta = resourceOf(userAdded(listed(-10, 0)));
        expect(internals.absorbChartDelta('nowcoast', delta)).toBe(true);
        expect(internals.chartCacheSignal()[0]).toBe(before);
      });

      it('spares every client the full chart re-list', () => {
        const { internals } = following(() => [
          ['nowcoast', userAdded(listed(-10, 0)), true]
        ]);
        withTransform(internals);
        internals.refreshCharts = vi.fn(() => Promise.resolve());
        const message = (value: unknown) => [
          { path: 'resources.charts.nowcoast', value }
        ];
        internals.processResourceMessage(
          message(resourceOf(userAdded(listed(-9, 1))))
        );
        expect(internals.refreshCharts).not.toHaveBeenCalled();
        expect(internals.chartCacheSignal()[0][1].time).toEqual(listed(-9, 1));
        // Deleted, or changed beyond its dimension: the refresh as before.
        internals.processResourceMessage(message(null));
        expect(internals.refreshCharts).toHaveBeenCalledTimes(1);
      });

      it('is left to the full refresh when anything else changed, or the chart is not shown', () => {
        const { internals } = following(() => [
          ['nowcoast', userAdded(listed(-10, 0)), true]
        ]);
        withTransform(internals);
        const moved = userAdded(listed(-9, 1));
        moved.url = 'https://elsewhere/wms';
        expect(internals.absorbChartDelta('nowcoast', resourceOf(moved))).toBe(
          false
        );
        expect(
          internals.absorbChartDelta(
            'other',
            resourceOf(userAdded(listed(-9, 1)))
          )
        ).toBe(false);
        expect(internals.absorbChartDelta('nowcoast', null)).toBe(false);
      });
    });
  });

  it('still follows the clock when the re-read fails', async () => {
    const { svc } = following(
      () => [['nexrad', wms(nexrad(), STEP), true]],
      () => Promise.reject(new Error('offline'))
    );
    await tick(STEP);
    expect(shown(svc)).toBe(T2);
  });

  it('is not held on a stale frame by a re-read that never returns', async () => {
    const { svc } = following(
      () => [['nexrad', wms(nexrad(), STEP), true]],
      () => new Promise<SKChart>(() => undefined) // hangs
    );
    await tick(STEP); // 12:12 -- the re-read is out; the tick waits on it
    expect(shown(svc)).toBe('2026-09-18T12:05:00.000Z');
    await tick(STEP); // 12:17 -- out for a whole interval: given up on
    expect(shown(svc)).toBe(T3);
  });

  it('leaves a chart on its live frame to the layer refresh', async () => {
    const live = wms({ ...nexrad(), current: true }, STEP);
    const { svc } = following(() => [['nexrad', live, true]]);
    expect(shown(svc)).toBeNull();
    await tick(STEP);
    expect(shown(svc)).toBeNull();
  });

  it('does not rebuild the entry while the head has not moved', async () => {
    const { svc } = following(() => [['nexrad', wms(nexrad(), 60000), true]]);
    const entry = cache(svc)[0];
    await tick(60000); // 12:08 -- still 12:05
    expect(cache(svc)[0]).toBe(entry);
  });

  it('drops the follower of a chart taken off the map, or given a new interval', () => {
    const { internals } = following(() => [
      ['nexrad', wms(nexrad(), STEP), true]
    ]);
    const first = internals.chartTimeFollowers.get('nexrad');
    internals.syncChartTimeFollowers([
      ['nexrad', wms(nexrad(), 2 * STEP), true]
    ]);
    const second = internals.chartTimeFollowers.get('nexrad');
    expect(second).not.toBe(first);
    expect(second.interval).toBe(2 * STEP);
    internals.syncChartTimeFollowers([]);
    expect(internals.chartTimeFollowers.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
