import { describe, it, expect, vi } from 'vitest';
import { SKResourceService } from './resources.service';

/**
 * `setChartsOrder` takes a topmost-first list and stores `chartOrder` bottom-first.
 * The list it is given only ever covers the charts the caller can see, while
 * `chartOrder` is a preference that outlives any one session — a chart whose
 * provider is down, or that has not loaded yet, is absent from the caller's list
 * but must keep its place in the stack. Dropping those ids does not merely lose
 * the position: `arrangeChartLayers` appends ids it finds no entry for, so a chart
 * that was at the bottom comes back on top of the stack when it reappears.
 *
 * `setChartsOrder` only reads `this.app` and calls `chartReorder`, so exercise it
 * on a bare prototype instance — no Angular DI needed.
 */
function svcWithOrder(chartOrder: unknown) {
  const svc = Object.create(SKResourceService.prototype) as SKResourceService;
  const app = {
    config: { selections: { chartOrder } },
    saveConfig: vi.fn()
  };
  (svc as unknown as { app: unknown }).app = app;
  (svc as unknown as { chartReorder: unknown }).chartReorder = vi.fn();
  return { svc, app };
}

const storedOrder = (app: {
  config: { selections: { chartOrder: unknown } };
}) => app.config.selections.chartOrder;

describe('setChartsOrder', () => {
  it('stores a topmost-first request bottom-first', () => {
    const { svc, app } = svcWithOrder(['osm', 'c', 'b', 'a']);

    svc.setChartsOrder(['b', 'a', 'c', 'osm']);

    expect(storedOrder(app)).toEqual(['osm', 'c', 'a', 'b']);
  });

  it('keeps ids the caller omitted, below the ones it named', () => {
    const { svc, app } = svcWithOrder(['world', 'offline-chart', 'b', 'a']);

    // 'offline-chart' and 'world' are absent from the request — their provider
    // is not answering this session.
    svc.setChartsOrder(['b', 'a']);

    expect(storedOrder(app)).toEqual(['world', 'offline-chart', 'a', 'b']);
  });

  it('keeps the omitted ids in their existing relative order', () => {
    const { svc, app } = svcWithOrder(['x', 'y', 'z', 'a']);

    svc.setChartsOrder(['a']);

    expect(storedOrder(app)).toEqual(['x', 'y', 'z', 'a']);
  });

  it('re-seats an id that moves, rather than leaving a stale copy behind', () => {
    const { svc, app } = svcWithOrder(['osm', 'a', 'b']);

    svc.setChartsOrder(['a', 'b']);

    expect(storedOrder(app)).toEqual(['osm', 'b', 'a']);
  });

  it('applies the order and persists it', () => {
    const { svc, app } = svcWithOrder(['a', 'b']);

    svc.setChartsOrder(['a', 'b']);

    expect(app.saveConfig).toHaveBeenCalledOnce();
    expect(
      (svc as unknown as { chartReorder: ReturnType<typeof vi.fn> })
        .chartReorder
    ).toHaveBeenCalledOnce();
  });

  it('starts from an empty order when config holds no list yet', () => {
    const { svc, app } = svcWithOrder(undefined);

    svc.setChartsOrder(['a', 'b']);

    expect(storedOrder(app)).toEqual(['b', 'a']);
  });

  it('ignores a request that is not a list', () => {
    const { svc, app } = svcWithOrder(['a', 'b']);

    svc.setChartsOrder(undefined as unknown as string[]);

    expect(storedOrder(app)).toEqual(['a', 'b']);
    expect(app.saveConfig).not.toHaveBeenCalled();
  });
});
