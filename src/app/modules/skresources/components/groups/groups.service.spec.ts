import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { SignalKClient } from 'signalk-client-angular';
import { AppFacade } from '../../../../app.facade';
import { SKResourceService } from '../../resources.service';
import { SKResourceGroupService } from './groups.service';

describe('SKResourceGroupService.applyGroup', () => {
  let service: SKResourceGroupService;
  let app: {
    config: { selections: Record<string, unknown> };
    saveConfig: () => void;
  };
  let skres: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    app = {
      config: {
        selections: {
          routes: ['r0'],
          waypoints: ['w0'],
          regions: null,
          charts: ['c0']
        }
      },
      saveConfig: vi.fn()
    };
    skres = {
      refreshRoutes: vi.fn(),
      refreshWaypoints: vi.fn(),
      refreshRegions: vi.fn(),
      refreshCharts: vi.fn()
    };
    TestBed.configureTestingModule({
      providers: [
        SKResourceGroupService,
        { provide: AppFacade, useValue: app },
        { provide: SKResourceService, useValue: skres },
        { provide: SignalKClient, useValue: {} },
        { provide: MatDialog, useValue: {} }
      ]
    });
    service = TestBed.inject(SKResourceGroupService);
  });

  it('writes the selections, refreshes only the applied types and saves', () => {
    const applied = service.applyGroup('g1', {
      name: 'g',
      description: '',
      routes: ['r1'],
      charts: []
    });
    expect(applied).toEqual(['routes', 'charts']);
    expect(app.config.selections).toEqual({
      routes: ['r1'],
      waypoints: ['w0'],
      regions: null,
      charts: []
    });
    expect(skres.refreshRoutes).toHaveBeenCalledTimes(1);
    expect(skres.refreshCharts).toHaveBeenCalledTimes(1);
    expect(skres.refreshWaypoints).not.toHaveBeenCalled();
    expect(skres.refreshRegions).not.toHaveBeenCalled();
    expect(app.saveConfig).toHaveBeenCalledTimes(1);
  });

  it('announces every apply on applied$, including a repeat of the same group', () => {
    const events: unknown[] = [];
    service.applied$.subscribe((e) => events.push(e));
    const group = { name: 'g', description: '', waypoints: [] };
    service.applyGroup('g1', group);
    service.applyGroup('g1', group);
    expect(events).toEqual([
      { id: 'g1', applied: ['waypoints'] },
      { id: 'g1', applied: ['waypoints'] }
    ]);
  });
});
