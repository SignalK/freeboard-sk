import { describe, it, expect } from 'vitest';
import { SKResourceService } from './resources.service';
import { ChartImageAdjustment, FBCharts } from 'src/app/types';

/**
 * Regression tests for per-chart image adjustment (#457) persistence. Both paths
 * that build chart objects — `transformChart` for server charts and `appendOSM`
 * for the built-in OSM charts — must copy a stored brightness/contrast so the
 * adjustment survives a refresh.
 *
 * `appendOSM` / `transformChart` only read `this.app`, so exercise them on a bare
 * prototype instance with a mock app — no Angular DI needed.
 */
function svcWithAdjustment(
  chartImageAdjustment: Record<string, ChartImageAdjustment>
) {
  const svc = Object.create(SKResourceService.prototype) as SKResourceService;
  (svc as unknown as { app: unknown }).app = {
    config: {
      selections: { charts: null, chartOpacity: {}, chartImageAdjustment }
    }
  };
  return svc;
}

describe('chart image adjustment persistence (#457)', () => {
  it('appendOSM applies a stored adjustment to the built-in OSM charts', () => {
    const svc = svcWithAdjustment({
      openstreetmap: { brightness: 1.2, contrast: 0.8 }
    });
    const osm = (svc.appendOSM([]) as FBCharts).find(
      (c) => c[0] === 'openstreetmap'
    );
    expect(osm?.[1].imageAdjustment).toEqual({
      brightness: 1.2,
      contrast: 0.8
    });
  });

  it('appendOSM leaves the adjustment undefined when config has none', () => {
    const osm = (svcWithAdjustment({}).appendOSM([]) as FBCharts).find(
      (c) => c[0] === 'openstreetmap'
    );
    expect(osm?.[1].imageAdjustment).toBeUndefined();
  });

  it('transformChart copies a stored adjustment onto a server chart', () => {
    const svc = svcWithAdjustment({
      'my-chart': { brightness: 1.5, contrast: 1.1 }
    });
    const result = (
      svc as unknown as {
        transformChart: (
          c: unknown,
          id: string
        ) => { imageAdjustment?: ChartImageAdjustment };
      }
    ).transformChart(
      { name: 'X', url: 'http://x/{z}/{x}/{y}.png' },
      'my-chart'
    );
    expect(result.imageAdjustment).toEqual({ brightness: 1.5, contrast: 1.1 });
  });
});
