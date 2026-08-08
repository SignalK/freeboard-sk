import { describe, it, expect, vi } from 'vitest';
import { of, Subject } from 'rxjs';
import { SKResourceService } from './resources.service';
import { FBChart } from 'src/app/types';
import {
  ChartMinZoomDialogData,
  ChartMinZoomDialogResult
} from 'src/app/lib/components';

/**
 * Behaviour tests for the modeless minimum-zoom palette owned by the service.
 * APPLY persists per-chart and updates the render cache, clearing removes the
 * entry entirely, and closing reverts the live preview. `openDisplayMinZoom`
 * only touches `app`, `dialog` and `chartSetDisplayMinZoom`, so exercise it on
 * a bare prototype instance with those stubbed -- no Angular DI needed.
 */
function svcWithResult(
  result: ChartMinZoomDialogResult | undefined,
  stored: Record<string, number> = {}
) {
  const svc = Object.create(SKResourceService.prototype) as SKResourceService;
  const saveConfig = vi.fn();
  const config = {
    selections: { chartDisplayMinZoom: stored },
    map: { zoomLevel: 11 }
  };
  (svc as unknown as { app: unknown }).app = {
    config,
    saveConfig,
    mapZoom: () => 11
  };
  let openedData: ChartMinZoomDialogData;
  const closeSpy = vi.fn();
  (svc as unknown as { dialog: unknown }).dialog = {
    open: (_cmp: unknown, cfg: { data: ChartMinZoomDialogData }) => {
      openedData = cfg.data;
      return { afterClosed: () => of(result), close: closeSpy };
    }
  };
  const setSpy = vi.fn();
  svc.chartSetDisplayMinZoom = setSpy;
  return {
    svc,
    saveConfig,
    stored,
    setSpy,
    closeSpy,
    getData: () => openedData
  };
}

const chart = (displayMinZoom?: number): FBChart =>
  [
    'c1',
    { name: 'Rannikkokartat', minZoom: 5, maxZoom: 15, displayMinZoom },
    true
  ] as unknown as FBChart;

describe('openDisplayMinZoom', () => {
  it('APPLY persists the level to config and applies it to the cache', () => {
    const { svc, saveConfig, stored, setSpy } = svcWithResult({
      apply: true,
      value: 12
    });

    svc.openDisplayMinZoom(chart());

    expect(stored['c1']).toBe(12);
    expect(setSpy).toHaveBeenLastCalledWith('c1', 12);
    expect(saveConfig).toHaveBeenCalledOnce();
  });

  it('APPLY with no level removes the entry rather than storing undefined', () => {
    // A left-behind key is re-injected by transformChart on the next refresh,
    // so a cleared minimum would come back.
    const { svc, stored, setSpy } = svcWithResult(
      { apply: true, value: undefined },
      { c1: 12 }
    );

    svc.openDisplayMinZoom(chart(12));

    expect('c1' in stored).toBe(false);
    expect(setSpy).toHaveBeenLastCalledWith('c1', undefined);
  });

  it('closing without applying reverts the preview and writes nothing', () => {
    const { svc, saveConfig, stored, setSpy } = svcWithResult(
      { apply: false, value: 16 },
      { c1: 12 }
    );

    svc.openDisplayMinZoom(chart(12));

    expect(stored['c1']).toBe(12);
    expect(setSpy).toHaveBeenLastCalledWith('c1', 12);
    expect(saveConfig).not.toHaveBeenCalled();
  });

  it('reports the applied level back to the caller', () => {
    // The chart list keeps its own copy of the chart and needs the applied
    // value to keep its row honest.
    const { svc } = svcWithResult({ apply: true, value: 12 });
    const applied = vi.fn();

    svc.openDisplayMinZoom(chart(), applied);

    expect(applied).toHaveBeenCalledWith(12);
  });

  it('does not report back when the dialog was closed without applying', () => {
    const { svc } = svcWithResult({ apply: false, value: 12 });
    const applied = vi.fn();

    svc.openDisplayMinZoom(chart(), applied);

    expect(applied).not.toHaveBeenCalled();
  });

  it('seeds the dialog from config, falling back to the chart', () => {
    const fromConfig = svcWithResult(undefined, { c1: 9 });
    fromConfig.svc.openDisplayMinZoom(chart(12));
    expect(fromConfig.getData().value).toBe(9);

    const fromChart = svcWithResult(undefined);
    fromChart.svc.openDisplayMinZoom(chart(12));
    expect(fromChart.getData().value).toBe(12);
  });

  describe('single-instance guard', () => {
    /**
     * `afterClosed` emits asynchronously in Angular Material -- the container
     * defers it -- so a stub that emits synchronously would never reproduce the
     * ordering that matters here. Each palette gets a subject the test closes
     * by hand.
     */
    function svcWithOpenPalettes() {
      const svc = Object.create(
        SKResourceService.prototype
      ) as SKResourceService;
      (svc as unknown as { app: unknown }).app = {
        config: { selections: { chartDisplayMinZoom: {} } },
        saveConfig: vi.fn(),
        mapZoom: () => 11
      };
      const opened: Array<{
        close: ReturnType<typeof vi.fn>;
        emit: () => void;
      }> = [];
      (svc as unknown as { dialog: unknown }).dialog = {
        open: () => {
          const subject = new Subject<ChartMinZoomDialogResult>();
          const ref = {
            afterClosed: () => subject,
            close: vi.fn(),
            emit: () => {
              subject.next({ apply: false });
              subject.complete();
            }
          };
          opened.push(ref);
          return ref;
        }
      };
      svc.chartSetDisplayMinZoom = vi.fn();
      return { svc, opened };
    }

    it('closes the open palette before opening another', () => {
      const { svc, opened } = svcWithOpenPalettes();

      svc.openDisplayMinZoom(chart());
      svc.openDisplayMinZoom(chart());

      expect(opened).toHaveLength(2);
      expect(opened[0].close).toHaveBeenCalled();
    });

    it('keeps tracking the replacement when the replaced palette closes late', () => {
      // The replaced palette's afterClosed fires after its replacement has
      // already been stored; clearing the reference blindly there would leave
      // the replacement untracked and let a third palette stack on top of it.
      const { svc, opened } = svcWithOpenPalettes();

      svc.openDisplayMinZoom(chart());
      svc.openDisplayMinZoom(chart());
      opened[0].emit();
      svc.openDisplayMinZoom(chart());

      expect(opened).toHaveLength(3);
      expect(opened[1].close).toHaveBeenCalled();
    });
  });
});
