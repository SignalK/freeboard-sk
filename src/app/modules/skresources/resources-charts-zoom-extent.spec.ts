import { describe, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { SKResourceService } from './resources.service';
import { FBCharts } from 'src/app/types';

/**
 * Regression tests for "constrain map zoom" not being applied on startup (#552).
 *
 * `setMapZoomRange` derives the extent from the chart cache signal, so
 * `refreshCharts` must populate that cache *before* calling it — otherwise the
 * first refresh computes from an empty list and the constraint silently never
 * takes effect, while the toolbar button still reports itself as active.
 *
 * `setMapZoomRange` / `refreshCharts` only touch `this.app`, the cache signal and
 * a few list helpers, so exercise them on a bare prototype instance with a mock
 * app — no Angular DI needed (same approach as the chart opacity specs). Class
 * field initializers don't run under `Object.create`, so the cache signal is
 * supplied explicitly.
 */
const DEFAULT_EXTENT = { min: 2, max: 28 };

/** Minimal stand-in for a chart cache entry: [id, chart, selected]. */
function chartEntry(id: string, minZoom: number, maxZoom: number) {
  return [id, { minZoom, maxZoom }, true] as unknown as FBCharts[0];
}

function svcWithCharts(mapConstrainZoom: boolean, cache: FBCharts = []) {
  const svc = Object.create(SKResourceService.prototype) as SKResourceService;
  (svc as unknown as { app: unknown }).app = {
    uiConfig: () => ({ mapConstrainZoom }),
    MAP_ZOOM_EXTENT: { ...DEFAULT_EXTENT },
    debug: () => undefined
  };
  (svc as unknown as { chartCacheSignal: unknown }).chartCacheSignal =
    signal<FBCharts>(cache);
  return svc;
}

const extentOf = (svc: SKResourceService) =>
  (svc as unknown as { app: { MAP_ZOOM_EXTENT: { min: number; max: number } } })
    .app.MAP_ZOOM_EXTENT;

describe('map zoom extent (#552)', () => {
  it('derives the extent on the first refresh, when the cache starts empty', async () => {
    const svc = svcWithCharts(true);
    const served = [chartEntry('limited', 0, 16)] as FBCharts;
    // identity list helpers keep the fixture deterministic — the built-in OSM
    // charts would otherwise widen the union to their own 0..24 range.
    Object.assign(svc as unknown as Record<string, unknown>, {
      listFromServer: vi.fn(async () => served),
      appendOSM: (l: FBCharts) => l,
      sortByScaleDesc: (l: FBCharts) => l,
      arrangeChartLayers: (l: FBCharts) => l
    });

    await svc.refreshCharts();

    // pre-fix this stayed at the unconstrained default, because the extent was
    // computed before the cache was populated
    expect(extentOf(svc)).toEqual({ min: 0, max: 16 });
  });

  it('takes the widest range across selected charts', () => {
    const svc = svcWithCharts(true, [
      chartEntry('a', 4, 16),
      chartEntry('b', 1, 12)
    ] as FBCharts);

    svc.setMapZoomRange();

    expect(extentOf(svc)).toEqual({ min: 1, max: 16 });
  });

  it('falls back to the default extent when no chart supplies a bound', () => {
    const svc = svcWithCharts(true);
    extentOf(svc).min = 5;
    extentOf(svc).max = 15;

    svc.setMapZoomRange();

    expect(extentOf(svc)).toEqual(DEFAULT_EXTENT);
  });

  it('uses the default extent when constrain is off', () => {
    const svc = svcWithCharts(false, [
      chartEntry('limited', 0, 16)
    ] as FBCharts);

    svc.setMapZoomRange();

    expect(extentOf(svc)).toEqual(DEFAULT_EXTENT);
  });

  it('uses the default extent when explicitly asked to, despite constrain', () => {
    const svc = svcWithCharts(true, [chartEntry('limited', 0, 16)] as FBCharts);

    svc.setMapZoomRange(true);

    expect(extentOf(svc)).toEqual(DEFAULT_EXTENT);
  });
});
