import { describe, it, expect, vi } from 'vitest';
import { of, Subject } from 'rxjs';
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
  const config: {
    selections: { chartImageAdjustment: Record<string, ChartImageAdjustment> };
    imageAdjustPalettePos: { x: number; y: number } | null;
  } = {
    selections: { chartImageAdjustment },
    imageAdjustPalettePos: null
  };
  (svc as unknown as { app: unknown }).app = { config, saveConfig };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let openedData: any;
  (svc as unknown as { dialog: unknown }).dialog = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    open: (_cmp: unknown, cfg: any) => {
      openedData = cfg.data;
      return { afterClosed: () => of(result) };
    }
  };
  const setSpy = vi.fn();
  svc.chartSetImageAdjustment = setSpy;
  return {
    svc,
    saveConfig,
    chartImageAdjustment,
    config,
    setSpy,
    getData: () => openedData
  };
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

  it('opens the palette at the remembered position', () => {
    const { svc, config, getData } = svcWithResult({
      apply: false,
      value: { brightness: 1, contrast: 1 }
    });
    config.imageAdjustPalettePos = { x: 120, y: 40 };

    svc.openImageAdjustment(chart());

    expect(getData().position).toEqual({ x: 120, y: 40 });
  });

  describe('keeping a remembered position on screen', () => {
    // The palette now opens clear of the chart list, so an offset saved against
    // the old origin can put the drag handle -- the only way to move it back --
    // past the viewport edge.
    const withViewport = (
      width: number,
      height: number | undefined,
      fn: () => void
    ) => {
      const original = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      const set = (w: number, h: number) => {
        Object.defineProperty(window, 'innerWidth', {
          value: w,
          configurable: true
        });
        Object.defineProperty(window, 'innerHeight', {
          value: h,
          configurable: true
        });
      };
      set(width, height ?? original.height);
      try {
        fn();
      } finally {
        set(original.width, original.height);
      }
    };

    const openWith = (
      pos: { x: number; y: number } | null,
      viewportWidth: number,
      viewportHeight?: number
    ) => {
      const { svc, config, getData } = svcWithResult({
        apply: false,
        value: { brightness: 1, contrast: 1 }
      });
      config.imageAdjustPalettePos = pos;
      withViewport(viewportWidth, viewportHeight, () =>
        svc.openImageAdjustment(chart())
      );
      return getData().position;
    };

    it('pulls a position past the right edge back into view', () => {
      const position = openWith({ x: 4000, y: 40 }, 1024);
      expect(position.x).toBeLessThan(4000);
      // Still far enough left that the whole 290px palette fits.
      expect(position.x).toBeLessThanOrEqual(1024 - 290);
    });

    it('pulls a negative vertical offset back to the top', () => {
      expect(openWith({ x: 0, y: -500 }, 1024).y).toBe(0);
    });

    it('pulls an offset below the bottom edge back into view', () => {
      // Saved on a tall window, restored on a short one: without a downward
      // clamp the palette opens past the fold, taking its drag handle with it.
      const y = openWith({ x: 0, y: 900 }, 1024, 600).y;
      expect(y).toBeLessThan(900);
      // Its header still sits above the bottom of the 600px viewport.
      expect(70 + y).toBeLessThanOrEqual(600 - 40);
    });

    it('does not push the palette above the top on a very short viewport', () => {
      expect(openWith({ x: 0, y: 300 }, 1024, 60).y).toBe(0);
    });

    it('leaves a position that already fits alone', () => {
      expect(openWith({ x: 40, y: 40 }, 1600)).toEqual({ x: 40, y: 40 });
    });

    it('passes through when no position was ever saved', () => {
      expect(openWith(null, 1024)).toBeNull();
    });

    it('keeps the palette on screen on a viewport too narrow for both', () => {
      // Clamped to the gap rather than pushed off to the right of the list.
      const position = openWith({ x: 0, y: 0 }, 420);
      expect(position.x).toBeLessThanOrEqual(420 - 290);
    });
  });

  it('persists the palette position when dragged', () => {
    const { svc, config, saveConfig, getData } = svcWithResult({
      apply: false,
      value: { brightness: 1, contrast: 1 }
    });

    svc.openImageAdjustment(chart());
    getData().onMoved({ x: 200, y: 90 });

    expect(config.imageAdjustPalettePos).toEqual({ x: 200, y: 90 });
    expect(saveConfig).toHaveBeenCalledOnce();
  });
});

/**
 * A replaced palette closes an exit animation after its replacement is already
 * on screen, so its cancel path runs late. On a slow client that is long enough
 * for a queued click to have opened the replacement and moved the value, and a
 * revert landing then would put the pre-edit adjustment back over it.
 */
describe('openImageAdjustment — a palette closing after it was replaced', () => {
  const svcWithLateClose = () => {
    const svc = Object.create(SKResourceService.prototype) as SKResourceService;
    const closes: Subject<ImageAdjustmentDialogResult | undefined>[] = [];
    const chartImageAdjustment: Record<string, ChartImageAdjustment> = {
      c1: { brightness: 1.1, contrast: 1.2 },
      c2: { brightness: 0.9, contrast: 1 }
    };
    (svc as unknown as { app: unknown }).app = {
      config: {
        selections: { chartImageAdjustment },
        imageAdjustPalettePos: null
      },
      saveConfig: vi.fn()
    };
    (svc as unknown as { dialog: unknown }).dialog = {
      open: () => {
        const closed = new Subject<ImageAdjustmentDialogResult | undefined>();
        closes.push(closed);
        return { afterClosed: () => closed, close: vi.fn() };
      }
    };
    const setSpy = vi.fn();
    svc.chartSetImageAdjustment = setSpy;
    return { svc, closes, setSpy };
  };

  const chartNamed = (id: string): FBChart =>
    [id, { name: id }, true] as unknown as FBChart;

  it('leaves the preview to a replacement over the same chart', () => {
    const { svc, closes, setSpy } = svcWithLateClose();

    svc.openImageAdjustment(chartNamed('c1'));
    svc.openImageAdjustment(chartNamed('c1'));
    setSpy.mockClear();
    closes[0].next(undefined);

    expect(setSpy).not.toHaveBeenCalled();
  });

  it('still reverts its own chart when the replacement is for another', () => {
    const { svc, closes, setSpy } = svcWithLateClose();

    svc.openImageAdjustment(chartNamed('c1'));
    svc.openImageAdjustment(chartNamed('c2'));
    setSpy.mockClear();
    closes[0].next(undefined);

    expect(setSpy).toHaveBeenCalledWith('c1', {
      brightness: 1.1,
      contrast: 1.2
    });
  });
});
