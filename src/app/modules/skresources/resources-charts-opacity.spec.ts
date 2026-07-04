import { describe, it, expect } from 'vitest';
import { SKResourceService } from './resources.service';
import { FBCharts } from 'src/app/types';

/**
 * Regression tests for chart opacity persistence (the `chart.setOpacity` host
 * method promises the value survives a refresh). Both paths that build chart
 * objects must read `chartOpacity` config with a *defined* check, not a truthy
 * one, so a fully-transparent `0` isn't dropped — and the built-in OSM charts,
 * which bypass `transformChart`, must honor it too.
 *
 * `appendOSM` / `transformChart` only read `this.app`, so exercise them on a bare
 * prototype instance with a mock app — no Angular DI needed.
 */
function svcWithOpacity(chartOpacity: Record<string, number>) {
  const svc = Object.create(SKResourceService.prototype) as SKResourceService;
  (svc as unknown as { app: unknown }).app = {
    config: { selections: { charts: null, chartOpacity } }
  };
  return svc;
}

describe('chart opacity persistence (#454)', () => {
  it('appendOSM applies a stored opacity to the built-in OSM charts', () => {
    const svc = svcWithOpacity({ openstreetmap: 0.3, openseamap: 0.6 });
    const list = svc.appendOSM([]) as FBCharts;
    const byId = Object.fromEntries(
      list.map((c) => [c[0], c[1].defaultOpacity])
    );
    expect(byId['openstreetmap']).toBe(0.3);
    expect(byId['openseamap']).toBe(0.6);
  });

  it('appendOSM honors a fully-transparent 0 (not dropped as falsy)', () => {
    const svc = svcWithOpacity({ openstreetmap: 0 });
    const osm = (svc.appendOSM([]) as FBCharts).find(
      (c) => c[0] === 'openstreetmap'
    );
    expect(osm?.[1].defaultOpacity).toBe(0);
  });

  it('appendOSM leaves the default opacity when config has none', () => {
    const osm = (svcWithOpacity({}).appendOSM([]) as FBCharts).find(
      (c) => c[0] === 'openstreetmap'
    );
    expect(osm?.[1].defaultOpacity).toBe(1);
  });

  it('transformChart honors a stored opacity of 0 on a server chart', () => {
    const svc = svcWithOpacity({ 'my-chart': 0 });
    const result = (
      svc as unknown as {
        transformChart: (c: unknown, id: string) => { defaultOpacity: number };
      }
    ).transformChart(
      { name: 'X', url: 'http://x/{z}/{x}/{y}.png' },
      'my-chart'
    );
    expect(result.defaultOpacity).toBe(0);
  });
});
