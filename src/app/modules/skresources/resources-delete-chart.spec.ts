import { describe, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { SKResourceService } from './resources.service';

/**
 * Deleting a chart is the one moment the app knows a chart is gone rather than
 * merely absent, so it is where the per-chart settings held for it are dropped.
 * `deleteChart` only touches `app` and `deleteFromServer`, so exercise it on a
 * bare prototype instance with those stubbed -- no Angular DI needed.
 */
function svcWithCharts(confirm: boolean, deleteResult: Promise<void>) {
  const svc = Object.create(SKResourceService.prototype) as SKResourceService;
  const saveConfig = vi.fn();
  const parseHttpErrorResponse = vi.fn();
  const selections = {
    chartOpacity: { c1: 0.5, c2: 0.8 },
    chartImageAdjustment: { c1: { brightness: 1.2, contrast: 1 } },
    chartDisplayMinZoom: { c1: 14, c2: 9 }
  };
  (svc as unknown as { app: unknown }).app = {
    config: { selections },
    saveConfig,
    parseHttpErrorResponse,
    showConfirm: () => of({ ok: confirm })
  };
  const deleteFromServer = vi.fn(() => deleteResult);
  svc.deleteFromServer = deleteFromServer;
  return { svc, selections, saveConfig, deleteFromServer, parseHttpErrorResponse };
}

// deleteChart hands the settings cleanup to the delete promise, so let the
// microtask queue drain before asserting.
const settled = () => new Promise((resolve) => setTimeout(resolve));

describe('deleteChart', () => {
  it('drops every per-chart setting held for the deleted chart', async () => {
    const { svc, selections, saveConfig } = svcWithCharts(
      true,
      Promise.resolve()
    );

    svc.deleteChart('c1');
    await settled();

    expect(selections.chartOpacity).not.toHaveProperty('c1');
    expect(selections.chartImageAdjustment).not.toHaveProperty('c1');
    expect(selections.chartDisplayMinZoom).not.toHaveProperty('c1');
    expect(saveConfig).toHaveBeenCalledOnce();
  });

  it('leaves the other charts’ settings alone', async () => {
    const { svc, selections } = svcWithCharts(true, Promise.resolve());

    svc.deleteChart('c1');
    await settled();

    expect(selections.chartOpacity['c2']).toBe(0.8);
    expect(selections.chartDisplayMinZoom['c2']).toBe(9);
  });

  it('keeps the settings when the server delete fails', async () => {
    const { svc, selections, saveConfig, parseHttpErrorResponse } =
      svcWithCharts(true, Promise.reject(new Error('offline')));

    svc.deleteChart('c1');
    await settled();

    expect(selections.chartDisplayMinZoom['c1']).toBe(14);
    expect(saveConfig).not.toHaveBeenCalled();
    expect(parseHttpErrorResponse).toHaveBeenCalledOnce();
  });

  it('keeps the settings when the delete is not confirmed', async () => {
    const { svc, selections, deleteFromServer, saveConfig } = svcWithCharts(
      false,
      Promise.resolve()
    );

    svc.deleteChart('c1');
    await settled();

    expect(deleteFromServer).not.toHaveBeenCalled();
    expect(selections.chartDisplayMinZoom['c1']).toBe(14);
    expect(saveConfig).not.toHaveBeenCalled();
  });

  it('does not write the config when the chart held no settings', async () => {
    const { svc, saveConfig } = svcWithCharts(true, Promise.resolve());

    svc.deleteChart('never-configured');
    await settled();

    expect(saveConfig).not.toHaveBeenCalled();
  });
});
