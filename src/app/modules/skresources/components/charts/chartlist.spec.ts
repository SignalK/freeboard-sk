import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatDialog } from '@angular/material/dialog';

import { ChartListComponent } from './chartlist';
import { SKResourceService } from '../../resources.service';
import { SKWorkerService } from 'src/app/modules/skstream/skstream.service';
import { AppFacade } from 'src/app/app.facade';
import { SKResourceGroupService } from '../groups/groups.service';
import { FBMapInteractService } from 'src/app/modules/map/fbmap-interact.service';
import type { FBChart, FBCharts } from 'src/app/types';

/**
 * The main chart list presents charts in the user-chosen layer order — top layer
 * first — matching the Re-order (Chart Order) screen. Both derive that order from
 * `skres.arrangeChartLayers(list).reverse()`, so the two screens agree. These
 * tests drive `doFilter()` with a stubbed `arrangeChartLayers` and assert the
 * observable order of the `filteredList` signal.
 *
 * `TestBed.inject` gives a real injection context for the constructor effects
 * without rendering the template.
 */
const chart = (id: string, name: string): FBChart =>
  [id, { name } as never, true] as FBChart;

const fullListOf = (c: ChartListComponent) =>
  (c as unknown as { fullList: FBCharts }).fullList;
const filteredSignalOf = (c: ChartListComponent) =>
  (c as unknown as { filteredList: WritableSignal<FBCharts> }).filteredList;
const doFilterOf = (c: ChartListComponent) =>
  (c as unknown as { doFilter: () => void }).doFilter();
const idsOf = (list: FBCharts) => list.map((c) => c[0]);

describe('ChartListComponent — list ordered by chart layer order (#550)', () => {
  let comp: ChartListComponent;
  let arrangeChartLayers: ReturnType<typeof vi.fn>;
  // Bottom (base layer) → top, as arrangeChartLayers returns it. Mutable so a
  // test can simulate the user re-ordering charts.
  let layerBottomFirst: string[];

  const NAMES: Record<string, string> = {
    a: 'Zulu',
    b: 'Bravo',
    c: 'Alpha',
    osm: 'World'
  };

  const seed = (ids: string[]) => {
    const entries = ids.map((id) => chart(id, NAMES[id]));
    fullListOf(comp).length = 0;
    fullListOf(comp).push(...entries.map((e) => [...e] as FBChart));
  };

  beforeEach(() => {
    // Names are deliberately NOT in this order so an alphabetical sort differs.
    layerBottomFirst = ['osm', 'c', 'b', 'a'];
    arrangeChartLayers = vi.fn((list: FBCharts) =>
      [...list].sort(
        (x, y) =>
          layerBottomFirst.indexOf(x[0]) - layerBottomFirst.indexOf(y[0])
      )
    );
    TestBed.configureTestingModule({
      providers: [
        ChartListComponent,
        { provide: SKResourceService, useValue: { arrangeChartLayers } },
        {
          provide: SKWorkerService,
          useValue: { resourceUpdate: signal({ path: '' }) }
        },
        { provide: AppFacade, useValue: { mapExtent: signal(null) } },
        { provide: MatDialog, useValue: {} },
        { provide: SKResourceGroupService, useValue: {} },
        { provide: FBMapInteractService, useValue: {} }
      ]
    });
    comp = TestBed.inject(ChartListComponent);
  });

  it('presents charts top-layer-first, matching the Re-order screen', () => {
    // Seed in fetch order (not layer order, not alphabetical).
    seed(['osm', 'a', 'b', 'c']);
    doFilterOf(comp);

    // arrangeChartLayers(fullList).reverse() → top layer first.
    expect(idsOf(filteredSignalOf(comp)())).toEqual(['a', 'b', 'c', 'osm']);
    // A copy of fullList is passed, never the original array.
    expect(arrangeChartLayers).toHaveBeenCalled();
    expect(arrangeChartLayers.mock.calls[0][0]).not.toBe(fullListOf(comp));
  });

  it('does not fall back to alphabetical name order', () => {
    seed(['osm', 'a', 'b', 'c']);
    doFilterOf(comp);

    const alphabetical = ['c', 'b', 'osm', 'a']; // Alpha, Bravo, World, Zulu
    expect(idsOf(filteredSignalOf(comp)())).not.toEqual(alphabetical);
  });

  it('preserves layer order when filtering by text', () => {
    seed(['osm', 'a', 'b', 'c']);
    (comp as unknown as { filterText: string }).filterText = 'a';
    doFilterOf(comp);

    // 'a' matches Bravo (b) and Alpha (c); layer order keeps b before c.
    expect(idsOf(filteredSignalOf(comp)())).toEqual(['b', 'c']);
  });
});

describe('ChartListComponent — re-ordering by dragging a row', () => {
  let comp: ChartListComponent;
  let config: { selections: { chartOrder: string[] } };
  let saveConfig: ReturnType<typeof vi.fn>;
  let chartReorder: ReturnType<typeof vi.fn>;
  let layerBottomFirst: string[];

  const seed = (ids: string[]) => {
    fullListOf(comp).length = 0;
    fullListOf(comp).push(...ids.map((id) => chart(id, id.toUpperCase())));
  };
  const dropOf = (c: ChartListComponent, from: number, to: number) =>
    (
      c as unknown as {
        drop: (e: { previousIndex: number; currentIndex: number }) => void;
      }
    ).drop({ previousIndex: from, currentIndex: to });
  const canReorderOf = (c: ChartListComponent) =>
    (c as unknown as { canReorder: () => boolean }).canReorder();

  beforeEach(() => {
    layerBottomFirst = ['osm', 'c', 'b', 'a'];
    config = { selections: { chartOrder: [...layerBottomFirst] } };
    saveConfig = vi.fn();
    chartReorder = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        ChartListComponent,
        {
          provide: SKResourceService,
          useValue: {
            arrangeChartLayers: vi.fn((list: FBCharts) =>
              [...list].sort(
                (x, y) =>
                  layerBottomFirst.indexOf(x[0]) -
                  layerBottomFirst.indexOf(y[0])
              )
            ),
            chartReorder
          }
        },
        {
          provide: SKWorkerService,
          useValue: { resourceUpdate: signal({ path: '' }) }
        },
        {
          provide: AppFacade,
          useValue: { mapExtent: signal(null), config, saveConfig }
        },
        { provide: MatDialog, useValue: {} },
        { provide: SKResourceGroupService, useValue: {} },
        { provide: FBMapInteractService, useValue: {} }
      ]
    });
    comp = TestBed.inject(ChartListComponent);
    seed(['osm', 'a', 'b', 'c']);
    doFilterOf(comp);
  });

  it('lists the charts top layer first', () => {
    expect(idsOf(filteredSignalOf(comp)())).toEqual(['a', 'b', 'c', 'osm']);
  });

  it('stores the new order base layer first when a row is dragged', () => {
    // Drag the top chart (a) down one place.
    dropOf(comp, 0, 1);

    expect(config.selections.chartOrder).toEqual(['osm', 'c', 'a', 'b']);
    expect(saveConfig).toHaveBeenCalledOnce();
    expect(chartReorder).toHaveBeenCalledOnce();
  });

  it('re-renders the list in the new order', () => {
    layerBottomFirst = ['osm', 'c', 'a', 'b'];
    dropOf(comp, 0, 1);

    expect(idsOf(filteredSignalOf(comp)())).toEqual(['b', 'a', 'c', 'osm']);
  });

  it('does nothing when a row is dropped where it started', () => {
    dropOf(comp, 2, 2);

    expect(saveConfig).not.toHaveBeenCalled();
    expect(chartReorder).not.toHaveBeenCalled();
  });

  it('refuses to re-order while the list is filtered', () => {
    // A filtered list is a subset, so a drop within it says nothing about
    // where the hidden charts belong.
    (comp as unknown as { filterText: string }).filterText = 'a';
    expect(canReorderOf(comp)).toBe(false);

    dropOf(comp, 0, 1);
    expect(saveConfig).not.toHaveBeenCalled();
  });

  it('refuses to re-order while the in-view filter is on', () => {
    (comp as unknown as { inViewOnly: boolean }).inViewOnly = true;
    expect(canReorderOf(comp)).toBe(false);

    dropOf(comp, 0, 1);
    expect(saveConfig).not.toHaveBeenCalled();
  });
});

/**
 * Two constructor effects — one on `selectedCharts`, one on `app.mapExtent()` —
 * both end in `doFilter()`, which writes the `filteredList` signal and then reads
 * it back (via `alignSelections()`). Tracked, that read made each effect a
 * dependent of the other's write: with the "In view" filter on, a single map move
 * ping-ponged them forever and Freeboard locked up on zoom/pan (#617).
 *
 * Both inputs must be present to reproduce it, so these tests use a real
 * component fixture (`setInput` needs a `ComponentRef`) with the template
 * overridden away — the loop is in the effects, not the view.
 *
 * `arrangeChartLayers` trips after a small number of calls so a regression fails
 * as an assertion rather than running the vitest worker out of memory.
 */
describe('ChartListComponent — "In view" filter does not loop on map move (#617)', () => {
  const RUNAWAY = 25;
  let filterRuns: number;
  let mapExtent: WritableSignal<number[]>;

  const makeComponent = () => {
    const fixture = TestBed.createComponent(ChartListComponent);
    fixture.componentRef.setInput('selectedCharts', ['a']);
    const comp = fixture.componentInstance;
    (comp as unknown as { fullList: FBCharts }).fullList.push(
      chart('a', 'Alpha'),
      chart('b', 'Bravo')
    );
    fixture.detectChanges();
    return { fixture, comp };
  };

  const setInViewOnly = (comp: ChartListComponent, on: boolean) =>
    (
      comp as unknown as { toggleInViewOnly: (c: boolean) => void }
    ).toggleInViewOnly(on);

  beforeEach(() => {
    filterRuns = 0;
    mapExtent = signal<number[]>([0, 0, 1, 1]);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SKResourceService,
          useValue: {
            arrangeChartLayers: (list: FBCharts) => {
              if (++filterRuns > RUNAWAY) {
                throw new Error('doFilter() ran away — effect feedback loop');
              }
              return [...list];
            }
          }
        },
        {
          provide: SKWorkerService,
          useValue: { resourceUpdate: signal({ path: '' }) }
        },
        {
          provide: AppFacade,
          useValue: {
            mapExtent,
            // true → initItems() bails out, leaving the seeded fullList alone
            sIsFetching: signal(true),
            debug: vi.fn(),
            data: { chartBounds: { show: false, charts: [] } }
          }
        },
        { provide: MatDialog, useValue: {} },
        { provide: SKResourceGroupService, useValue: {} },
        { provide: FBMapInteractService, useValue: {} }
      ]
    });
    // The loop lives in the constructor effects; the view is not needed.
    TestBed.overrideComponent(ChartListComponent, { set: { template: '' } });
  });

  it('re-filters once, not forever, when the map view changes', () => {
    const { fixture, comp } = makeComponent();
    // Charts carry no bounds, so they are treated as global and stay in view —
    // this is about how often the filter runs, not what it keeps.
    setInViewOnly(comp, true);
    fixture.detectChanges();
    filterRuns = 0;

    mapExtent.set([1, 1, 2, 2]);
    fixture.detectChanges();

    expect(filterRuns).toBe(1);
  });

  it('does not re-filter on a map view change while the filter is off', () => {
    const { fixture, comp } = makeComponent();
    setInViewOnly(comp, false);
    fixture.detectChanges();
    filterRuns = 0;

    mapExtent.set([1, 1, 2, 2]);
    fixture.detectChanges();

    expect(filterRuns).toBe(0);
  });
});
