import { describe, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { SKResourceService } from './resources.service';
import { ChartImageAdjustment, FBChart } from 'src/app/types';
import { ImageAdjustmentDialogResult } from 'src/app/lib/components';

/**
 * Behaviour tests for the modeless Image Adjustment palette owned by the service
 * (#457). SAVE persists per-chart and updates the render cache; cancelling
 * reverts the live preview to the pre-edit value. `openImageAdjustment` only
 * touches `app`, `dialog` and `chartSetImageAdjustment`, so exercise it on a bare
 * prototype instance with those three stubbed — no Angular DI needed.
 */
function svcWithResult(result: ImageAdjustmentDialogResult | undefined) {
  const svc = Object.create(SKResourceService.prototype) as SKResourceService;
  const saveConfig = vi.fn();
  const chartImageAdjustment: Record<string, ChartImageAdjustment> = {};
  (svc as unknown as { app: unknown }).app = {
    config: { selections: { chartImageAdjustment } },
    saveConfig
  };
  (svc as unknown as { dialog: unknown }).dialog = {
    open: () => ({ afterClosed: () => of(result) })
  };
  const setSpy = vi.fn();
  svc.chartSetImageAdjustment = setSpy;
  return { svc, saveConfig, chartImageAdjustment, setSpy };
}

const chart = (): FBChart =>
  ['c1', { name: 'Aerial' }, true] as unknown as FBChart;

describe('openImageAdjustment (#457)', () => {
  it('SAVE persists the value to config and applies it to the cache', () => {
    const value: ChartImageAdjustment = { brightness: 1.3, contrast: 0.8 };
    const { svc, saveConfig, chartImageAdjustment, setSpy } = svcWithResult({
      apply: true,
      value
    });

    svc.openImageAdjustment(chart());

    expect(chartImageAdjustment['c1']).toEqual(value);
    expect(saveConfig).toHaveBeenCalledOnce();
    expect(setSpy).toHaveBeenLastCalledWith('c1', value);
  });

  it('cancel reverts to the pre-edit adjustment and persists nothing', () => {
    const { svc, saveConfig, chartImageAdjustment, setSpy } = svcWithResult({
      apply: false,
      value: { brightness: 1.9, contrast: 0.2 }
    });
    chartImageAdjustment['c1'] = { brightness: 1.1, contrast: 1.2 };

    svc.openImageAdjustment(chart());

    // config untouched, no save, live preview restored to the stored value
    expect(chartImageAdjustment['c1']).toEqual({
      brightness: 1.1,
      contrast: 1.2
    });
    expect(saveConfig).not.toHaveBeenCalled();
    expect(setSpy).toHaveBeenLastCalledWith('c1', {
      brightness: 1.1,
      contrast: 1.2
    });
  });

  it('cancel falls back to the chart adjustment when config has no entry', () => {
    const { svc, saveConfig, chartImageAdjustment, setSpy } = svcWithResult({
      apply: false,
      value: { brightness: 1.9, contrast: 0.2 }
    });
    // no chartImageAdjustment['c2'] entry -> original comes from the chart itself
    const chartWithAdj = (): FBChart =>
      [
        'c2',
        { name: 'Bathy', imageAdjustment: { brightness: 1.4, contrast: 0.6 } },
        true
      ] as unknown as FBChart;

    svc.openImageAdjustment(chartWithAdj());

    expect(chartImageAdjustment['c2']).toBeUndefined();
    expect(saveConfig).not.toHaveBeenCalled();
    expect(setSpy).toHaveBeenLastCalledWith('c2', {
      brightness: 1.4,
      contrast: 0.6
    });
  });
});
