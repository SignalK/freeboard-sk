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
 * The main chart list must present charts in the user-chosen layer order — top
 * layer first — the same ordering the Re-order (Chart Order) screen uses, rather
 * than the previous alphabetical-by-name sort (#550). The re-order screen derives
 * its order from `skres.arrangeChartLayers(list).reverse()`; `doFilter()` now
 * applies the identical transform, so the two screens agree. These tests drive
 * `doFilter()` with a stubbed `arrangeChartLayers` and assert the observable
 * order of the `filteredList` signal.
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

  it('re-applies the new order when the Re-order screen is closed', () => {
    seed(['osm', 'a', 'b', 'c']);
    doFilterOf(comp);
    expect(idsOf(filteredSignalOf(comp)())).toEqual(['a', 'b', 'c', 'osm']);

    // User re-orders on the Re-order screen (chartOrder changes) then closes it.
    layerBottomFirst = ['osm', 'a', 'b', 'c'];
    (comp as unknown as { showChartLayers: (s?: boolean) => void }).showChartLayers(
      false
    );

    expect(idsOf(filteredSignalOf(comp)())).toEqual(['c', 'b', 'a', 'osm']);
  });
});
