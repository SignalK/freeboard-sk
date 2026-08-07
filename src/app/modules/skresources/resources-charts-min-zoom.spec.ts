import { describe, it, expect } from 'vitest';
import { signal } from '@angular/core';
import { SKResourceService } from './resources.service';
import { FBCharts } from 'src/app/types';

/**
 * A chart's display minimum zoom is a local preference: it stops the chart
 * being drawn below that zoom, and is stored per chart id in config rather
 * than on the server's chart resource. Both paths that build chart objects
 * must apply it -- `transformChart` for server charts and `appendOSM` for the
 * built-in ones -- and it must never reach the server on the chart-properties
 * PUT.
 *
 * `appendOSM` / `transformChart` only read `this.app`, so exercise them on a
 * bare prototype instance with a mock app -- no Angular DI needed.
 */
function svcWithDisplayMinZoom(chartDisplayMinZoom: Record<string, number>) {
  const svc = Object.create(SKResourceService.prototype) as SKResourceService;
  (svc as unknown as { app: unknown }).app = {
    config: {
      selections: { charts: null, chartOpacity: {}, chartDisplayMinZoom }
    }
  };
  return svc;
}

function transform(svc: SKResourceService, id: string) {
  return (
    svc as unknown as {
      transformChart: (c: unknown, id: string) => { displayMinZoom?: number };
    }
  ).transformChart({ name: 'X', url: 'http://x/{z}/{x}/{y}.png' }, id);
}

describe('chart display minimum zoom', () => {
  it('transformChart applies a stored minimum to a server chart', () => {
    const svc = svcWithDisplayMinZoom({ 'my-chart': 9 });
    expect(transform(svc, 'my-chart').displayMinZoom).toBe(9);
  });

  it('appendOSM applies a stored minimum to the built-in OSM charts', () => {
    const svc = svcWithDisplayMinZoom({ openstreetmap: 10 });
    const osm = (svc.appendOSM([]) as FBCharts).find(
      (c) => c[0] === 'openstreetmap'
    );
    expect(osm?.[1].displayMinZoom).toBe(10);
  });

  it('honours a minimum of 0 (not dropped as falsy)', () => {
    const svc = svcWithDisplayMinZoom({ 'my-chart': 0 });
    expect(transform(svc, 'my-chart').displayMinZoom).toBe(0);
  });

  it('leaves charts untouched when config holds no minimum for them', () => {
    const svc = svcWithDisplayMinZoom({ 'other-chart': 5 });
    expect(transform(svc, 'my-chart').displayMinZoom).toBeUndefined();
  });

  it('tolerates a config saved before the feature existed', () => {
    const svc = Object.create(SKResourceService.prototype) as SKResourceService;
    (svc as unknown as { app: unknown }).app = {
      config: { selections: { charts: null, chartOpacity: {} } }
    };
    expect(transform(svc, 'my-chart').displayMinZoom).toBeUndefined();
    expect(() => svc.appendOSM([])).not.toThrow();
  });

  describe('live update', () => {
    // Two cached charts; the setter should rebuild only the one addressed.
    const cachedCharts = () =>
      [
        [
          'chart-a',
          {
            name: 'A',
            url: 'http://a/{z}/{x}/{y}.png',
            minZoom: 5,
            maxZoom: 15
          },
          true
        ],
        ['chart-b', { name: 'B', url: 'http://b/{z}/{x}/{y}.png' }, true]
      ] as unknown as FBCharts;

    function svcWithCache() {
      const svc = Object.create(
        SKResourceService.prototype
      ) as SKResourceService;
      (svc as unknown as { chartCacheSignal: unknown }).chartCacheSignal =
        signal(cachedCharts());
      return svc;
    }

    const cache = (svc: SKResourceService) =>
      (
        svc as unknown as {
          chartCacheSignal: () => FBCharts;
        }
      ).chartCacheSignal();

    it('applies a minimum to the addressed chart', () => {
      const svc = svcWithCache();
      svc.chartSetDisplayMinZoom('chart-a', 9);
      expect(cache(svc)[0][1].displayMinZoom).toBe(9);
    });

    it('keeps the declared zoom range of the chart it rebuilds', () => {
      const svc = svcWithCache();
      svc.chartSetDisplayMinZoom('chart-a', 9);
      expect(cache(svc)[0][1].minZoom).toBe(5);
      expect(cache(svc)[0][1].maxZoom).toBe(15);
    });

    it('leaves the other cached charts untouched', () => {
      const svc = svcWithCache();
      const before = cache(svc)[1];
      svc.chartSetDisplayMinZoom('chart-a', 9);
      expect(cache(svc)[1]).toBe(before);
    });

    it('clears the minimum when passed nothing', () => {
      const svc = svcWithCache();
      svc.chartSetDisplayMinZoom('chart-a', 9);
      svc.chartSetDisplayMinZoom('chart-a', undefined);
      expect(cache(svc)[0][1].displayMinZoom).toBeUndefined();
    });

    it('ignores an unknown chart id', () => {
      const svc = svcWithCache();
      const before = cache(svc);
      svc.chartSetDisplayMinZoom('nope', 9);
      expect(cache(svc)).toBe(before);
    });
  });

  it('strips the minimum from the chart sent back to the server', () => {
    const svc = svcWithDisplayMinZoom({});
    const chart = transform(
      svcWithDisplayMinZoom({ 'my-chart': 9 }),
      'my-chart'
    );
    const outbound = (
      svc as unknown as {
        withoutDisplayMinZoom: (c: unknown) => Record<string, unknown>;
      }
    ).withoutDisplayMinZoom(chart);

    expect('displayMinZoom' in outbound).toBe(false);
    expect(outbound.url).toBe('http://x/{z}/{x}/{y}.png');
  });
});
