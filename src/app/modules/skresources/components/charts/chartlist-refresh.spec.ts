import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
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
 * A chart missing from a listing has not necessarily been deleted — a provider
 * that is down this session takes its charts out of the list and brings them
 * back later. The per-chart settings have to survive that, so a refresh must
 * not touch them; `deleteChart` drops them on a confirmed delete instead
 * (`resources-delete-chart.spec.ts`).
 */
const chart = (id: string): FBChart => [id, { name: id } as never, true];

describe('ChartListComponent — refreshing the list keeps per-chart settings', () => {
  let listed: FBCharts;
  let selections: {
    chartOpacity: Record<string, number>;
    chartImageAdjustment: Record<string, unknown>;
    chartDisplayMinZoom: Record<string, number>;
  };
  let saveConfig: ReturnType<typeof vi.fn>;

  const refresh = async (c: ChartListComponent) => {
    await (c as unknown as { initItems: () => Promise<void> }).initItems();
  };

  beforeEach(() => {
    // The provider serving 'b' is down, so the listing carries 'a' alone.
    listed = [chart('a')];
    selections = {
      chartOpacity: { a: 0.5, b: 0.7 },
      chartImageAdjustment: { b: { brightness: 1.4, contrast: 1 } },
      chartDisplayMinZoom: { a: 12, b: 14 }
    };
    saveConfig = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SKResourceService,
          useValue: {
            listFromServer: async () => listed,
            appendOSM: (list: FBCharts) => list,
            arrangeChartLayers: (list: FBCharts) => [...list],
            selectionClean: vi.fn()
          }
        },
        {
          provide: SKWorkerService,
          useValue: { resourceUpdate: signal({ path: '' }) }
        },
        {
          provide: AppFacade,
          useValue: {
            mapExtent: signal<number[]>([0, 0, 1, 1]),
            sIsFetching: signal(false),
            debug: vi.fn(),
            config: { selections },
            saveConfig,
            parseHttpErrorResponse: vi.fn(),
            data: { chartBounds: { show: false, charts: [] } }
          }
        },
        { provide: MatDialog, useValue: {} },
        { provide: SKResourceGroupService, useValue: {} },
        { provide: FBMapInteractService, useValue: {} }
      ]
    });
    TestBed.overrideComponent(ChartListComponent, { set: { template: '' } });
  });

  it('keeps the settings of a chart the listing left out', async () => {
    const fixture = TestBed.createComponent(ChartListComponent);
    fixture.componentRef.setInput('selectedCharts', ['a']);

    await refresh(fixture.componentInstance);

    expect(selections.chartOpacity['b']).toBe(0.7);
    expect(selections.chartImageAdjustment['b']).toBeDefined();
    expect(selections.chartDisplayMinZoom['b']).toBe(14);
  });

  it('does not write the config on a refresh', async () => {
    const fixture = TestBed.createComponent(ChartListComponent);
    fixture.componentRef.setInput('selectedCharts', ['a']);

    await refresh(fixture.componentInstance);

    expect(saveConfig).not.toHaveBeenCalled();
  });
});
