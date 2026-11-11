import { describe, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { SKResourceService } from './resources.service';
import {
  FBChart,
  FBWaypoint,
  FBWaypoints
} from 'src/app/types/resources/freeboard';

/**
 * `showStored` / `hideStored` back the plotter-extension `resources.show` /
 * `resources.hide` methods for waypoints, routes and regions. They change the
 * selection the resource lists change, so a hide survives a refresh even from
 * the default unfiltered ("show all") state, and a show accepts an id the cache
 * has not fetched yet (a resource an extension has just created).
 *
 * Run on a bare prototype with a mock app and stubbed refreshes, as
 * resources-route-hide.spec does — no Angular DI.
 */
const wpt = (id: string): FBWaypoint => [id, {}, true] as unknown as FBWaypoint;

function svc(selection: string[] | null, cache: string[]) {
  const s = Object.create(SKResourceService.prototype) as SKResourceService;
  const refreshWaypoints = vi.fn(async () => undefined);
  Object.assign(s as unknown as Record<string, unknown>, {
    app: {
      config: { selections: { waypoints: selection } },
      saveConfig: (): void => undefined
    },
    waypointCacheSignal: signal<FBWaypoints>(cache.map(wpt)),
    refreshWaypoints
  });
  const state = s as unknown as {
    app: { config: { selections: { waypoints: string[] | null } } };
    waypointCacheSignal: () => FBWaypoints;
  };
  return {
    s,
    refreshWaypoints,
    selection: () => state.app.config.selections.waypoints,
    cacheIds: () => state.waypointCacheSignal().map((w) => w[0])
  };
}

describe('SKResourceService.showStored', () => {
  it('adds ids, including unfetched ones, to a filtered selection and refreshes', async () => {
    const t = svc(['w1'], ['w1']);
    await t.s.showStored('waypoints', ['w2', 'new']);
    expect(t.selection()).toEqual(['w1', 'w2', 'new']);
    expect(t.refreshWaypoints).toHaveBeenCalledOnce();
  });

  it('leaves an unfiltered collection unfiltered', async () => {
    const t = svc(null, ['w1', 'w2']);
    await t.s.showStored('waypoints', ['w2']);
    expect(t.selection()).toBeNull();
    expect(t.refreshWaypoints).toHaveBeenCalledOnce();
  });
});

describe('SKResourceService.hideStored', () => {
  it('materialises an unfiltered collection, minus the hidden ids', () => {
    const t = svc(null, ['w1', 'w2', 'w3']);
    t.s.hideStored('waypoints', ['w2']);
    expect(t.selection()).toEqual(['w1', 'w3']);
    expect(t.cacheIds()).toEqual(['w1', 'w3']);
  });

  it('removes the ids from a filtered selection', () => {
    const t = svc(['w1', 'w2'], ['w1', 'w2']);
    t.s.hideStored('waypoints', ['w1', 'gone']);
    expect(t.selection()).toEqual(['w2']);
    expect(t.cacheIds()).toEqual(['w2']);
  });

  it('keeps an unfiltered collection unfiltered when none of the ids is shown', () => {
    // Materialising here would freeze the shown set and hide every waypoint
    // created afterwards.
    const t = svc(null, ['w1', 'w2']);
    t.s.hideStored('waypoints', ['unknown']);
    expect(t.selection()).toBeNull();
    expect(t.cacheIds()).toEqual(['w1', 'w2']);
  });
});

describe('SKResourceService.setChartsVisibility with an unlisted id', () => {
  // resources.show accepts a chart id the server list does not have yet (a
  // chart just created). It must not count towards "every chart is shown".
  const chart = (id: string, shown: boolean) =>
    [id, {}, shown] as unknown as FBChart;

  function charts(selection: string[] | null) {
    const s = Object.create(SKResourceService.prototype) as SKResourceService;
    Object.assign(s as unknown as Record<string, unknown>, {
      app: {
        config: { selections: { charts: selection } },
        saveConfig: (): void => undefined,
        debug: (): void => undefined
      },
      listChartsFromServer: async () => [
        chart('osm', true),
        chart('A', true),
        chart('B', false)
      ],
      appendOSM: (list: unknown) => list,
      refreshCharts: async () => undefined
    });
    return {
      s,
      selection: () =>
        (
          s as unknown as {
            app: { config: { selections: { charts: string[] | null } } };
          }
        ).app.config.selections.charts
    };
  }

  it('keeps a chart the user hid hidden', async () => {
    const t = charts(['osm', 'A']);
    await t.s.setChartsVisibility(['C'], true);
    expect(t.selection()).toEqual(['osm', 'A', 'C']);
  });

  it('still returns to show-all once every listed chart is shown', async () => {
    const t = charts(['osm', 'A']);
    await t.s.setChartsVisibility(['B'], true);
    expect(t.selection()).toBeNull();
  });
});
