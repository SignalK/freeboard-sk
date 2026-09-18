import { describe, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { SKResourceService } from './resources.service';
import { SKChart } from './resource-classes';
import { FBChart, FBCharts } from 'src/app/types';

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
  (svc as unknown as { chartCacheSignal: unknown }).chartCacheSignal =
    signal(cachedCharts());
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
      listFromServer: vi.fn(async () => served),
      appendOSM: (l: FBCharts) => l,
      sortByScaleDesc: (l: FBCharts) => l,
      arrangeChartLayers: (l: FBCharts) => l,
      setMapZoomRange: () => undefined
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
