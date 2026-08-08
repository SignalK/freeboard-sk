import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { CdkDrag, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
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

/**
 * Dragging a row hands the whole visible order to `skres.setChartsOrder()`, which
 * owns persistence. The stub here stands in for that method with its documented
 * behaviour (takes topmost-first, stores bottom-first), and `arrangeChartLayers`
 * derives the layer order from what was stored — so a test that asserts the
 * re-rendered list is reading back the drop's own effect rather than an order the
 * test seeded. `resources-charts-order.spec.ts` covers the real method.
 */
describe('ChartListComponent — re-ordering by dragging a row', () => {
  let comp: ChartListComponent;
  let config: { selections: { chartOrder: string[] } };
  let setChartsOrder: ReturnType<typeof vi.fn>;

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
    config = { selections: { chartOrder: ['osm', 'c', 'b', 'a'] } };
    setChartsOrder = vi.fn((topmostFirst: string[]) => {
      config.selections.chartOrder = topmostFirst.slice().reverse();
    });
    TestBed.configureTestingModule({
      providers: [
        ChartListComponent,
        {
          provide: SKResourceService,
          useValue: {
            arrangeChartLayers: vi.fn((list: FBCharts) =>
              [...list].sort(
                (x, y) =>
                  config.selections.chartOrder.indexOf(x[0]) -
                  config.selections.chartOrder.indexOf(y[0])
              )
            ),
            setChartsOrder
          }
        },
        {
          provide: SKWorkerService,
          useValue: { resourceUpdate: signal({ path: '' }) }
        },
        {
          provide: AppFacade,
          useValue: { mapExtent: signal(null), config }
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

  it('hands the whole visible order over, topmost first', () => {
    // Drag the top chart (a) down one place.
    dropOf(comp, 0, 1);

    // Every listed chart is named, not just the moved one — that is what lets
    // setChartsOrder() tell a chart the user left alone from one it cannot see.
    expect(setChartsOrder).toHaveBeenCalledExactlyOnceWith([
      'b',
      'a',
      'c',
      'osm'
    ]);
  });

  it('stores the new order base layer first when a row is dragged', () => {
    dropOf(comp, 0, 1);

    expect(config.selections.chartOrder).toEqual(['osm', 'c', 'a', 'b']);
  });

  it('re-renders the list in the new order', () => {
    dropOf(comp, 0, 1);

    expect(idsOf(filteredSignalOf(comp)())).toEqual(['b', 'a', 'c', 'osm']);
  });

  it('does nothing when a row is dropped where it started', () => {
    dropOf(comp, 2, 2);

    expect(setChartsOrder).not.toHaveBeenCalled();
  });

  it('refuses to re-order while the list is filtered', () => {
    // A filtered list is a subset, so a drop within it says nothing about
    // where the hidden charts belong.
    (comp as unknown as { filterText: string }).filterText = 'a';
    expect(canReorderOf(comp)).toBe(false);

    dropOf(comp, 0, 1);
    expect(setChartsOrder).not.toHaveBeenCalled();
  });

  it('refuses to re-order while the in-view filter is on', () => {
    (comp as unknown as { inViewOnly: boolean }).inViewOnly = true;
    expect(canReorderOf(comp)).toBe(false);

    dropOf(comp, 0, 1);
    expect(setChartsOrder).not.toHaveBeenCalled();
  });
});

/**
 * The drag tests above call `drop()` directly, which proves the handler and
 * nothing about the template that has to reach it. These render the real view and
 * assert the CDK directives are instantiated on it, so removing `cdkDropList`,
 * `cdkDrag` or `cdkDragHandle` from the markup fails here rather than shipping a
 * list whose rows cannot be dragged at all.
 */
describe('ChartListComponent — drag wiring in the rendered list', () => {
  const CHARTS = ['osm', 'a', 'b'];

  const makeFixture = () => {
    const fixture = TestBed.createComponent(ChartListComponent);
    const comp = fixture.componentInstance;
    fullListOf(comp).push(...CHARTS.map((id) => chart(id, id.toUpperCase())));
    doFilterOf(comp);
    fixture.detectChanges();
    return { fixture, comp };
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SKResourceService,
          useValue: {
            arrangeChartLayers: (list: FBCharts) => [...list],
            setChartsOrder: vi.fn()
          }
        },
        {
          provide: SKWorkerService,
          useValue: { resourceUpdate: signal({ path: '' }) }
        },
        {
          provide: AppFacade,
          useValue: {
            mapExtent: signal(null),
            // true → initItems() bails out, leaving the seeded fullList alone
            sIsFetching: signal(true),
            featureFlags: signal({ resourceGroups: false }),
            debug: vi.fn(),
            hostDef: { name: 'localhost' },
            data: { chartBounds: { show: false, charts: [] } }
          }
        },
        { provide: MatDialog, useValue: {} },
        { provide: SKResourceGroupService, useValue: {} },
        { provide: FBMapInteractService, useValue: {} }
      ]
    });
  });

  it('renders a drop list holding one draggable row per chart', () => {
    const { fixture } = makeFixture();

    expect(
      fixture.debugElement.queryAll(By.directive(CdkDropList))
    ).toHaveLength(1);
    expect(fixture.debugElement.queryAll(By.directive(CdkDrag))).toHaveLength(
      CHARTS.length
    );
  });

  it('gives every row a drag handle', () => {
    const { fixture } = makeFixture();

    expect(
      fixture.debugElement.queryAll(By.directive(CdkDragHandle))
    ).toHaveLength(CHARTS.length);
  });

  it('withdraws the handles and disables the drop list while filtered', () => {
    const { fixture, comp } = makeFixture();
    (comp as unknown as { filterText: string }).filterText = 'a';
    doFilterOf(comp);
    fixture.detectChanges();

    expect(
      fixture.debugElement.queryAll(By.directive(CdkDragHandle))
    ).toHaveLength(0);
    expect(
      fixture.debugElement
        .query(By.directive(CdkDropList))
        .injector.get(CdkDropList).disabled
    ).toBe(true);
  });

  it('labels which end of the list draws on top', () => {
    const { fixture } = makeFixture();
    const captions = fixture.nativeElement.querySelectorAll('.stack-caption');

    expect(captions).toHaveLength(2);
    expect(captions[0].textContent).toContain('Top Layer');
    expect(captions[1].textContent).toContain('Base Layer');
  });

  it('says why the handles are gone rather than dropping them silently', () => {
    const { fixture, comp } = makeFixture();
    expect(
      fixture.nativeElement.querySelector('.stack-caption-hint').textContent
    ).toContain('drag to re-order');

    (comp as unknown as { filterText: string }).filterText = 'a';
    doFilterOf(comp);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.stack-caption-hint').textContent
    ).toContain('clear the filter');
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
