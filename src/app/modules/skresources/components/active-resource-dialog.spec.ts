import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, it, expect } from 'vitest';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA
} from '@angular/material/bottom-sheet';

import { ActiveResourcePropertiesModal } from './active-resource-dialog';
import { AppFacade } from 'src/app/app.facade';
import { CourseService } from '../../course';
import { SKResourceService } from '../resources.service';
import { RouteBufferRegistry } from '../../plotterext/route-buffer.registry';

/**
 * The route points sheet lists the points in the order the route is stored,
 * and flags the one the active route is heading for. The Course API's
 * `pointIndex` counts in the order the route is followed (#871).
 */
describe('ActiveResourcePropertiesModal flagged route point', () => {
  beforeEach(() => TestBed.resetTestingModule());

  const names = ['Alpha', 'Bravo', 'Charlie', 'Delta'];
  const route = {
    name: 'Reverse test',
    feature: {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [24.95, 60.15],
          [24.955, 60.16],
          [24.95, 60.17],
          [24.955, 60.18]
        ]
      },
      properties: { coordinatesMeta: names.map((name) => ({ name })) }
    }
  };

  const flagged = (pointIndex: number, reverse: boolean) => {
    TestBed.configureTestingModule({
      providers: [
        ActiveResourcePropertiesModal,
        {
          provide: AppFacade,
          useValue: {
            data: {
              activeRoute: 'rte-1',
              activeRouteReversed: reverse,
              vessels: { self: { position: [24.95, 60.1712], heading: 0 } }
            },
            formatValueForDisplay: () => ''
          }
        },
        {
          provide: CourseService,
          useValue: { courseData: () => ({ pointIndex }) }
        },
        { provide: SKResourceService, useValue: {} },
        { provide: RouteBufferRegistry, useValue: {} },
        { provide: MatBottomSheetRef, useValue: { dismiss: () => undefined } },
        {
          provide: MAT_BOTTOM_SHEET_DATA,
          useValue: {
            title: 'Route Properties',
            type: 'route',
            resource: ['rte-1', route, false],
            noButtons: true
          }
        }
      ]
    });
    const modal = TestBed.inject(ActiveResourcePropertiesModal);
    modal.ngOnInit();
    const view = modal as unknown as {
      selIndex: () => number;
      pointMeta: Array<{ name: string }>;
    };
    return view.pointMeta[view.selIndex()]?.name;
  };

  it('flags the point being headed for on a route followed in reverse', () => {
    expect(flagged(0, true)).toBe('Delta');
    TestBed.resetTestingModule();
    expect(flagged(1, true)).toBe('Charlie');
  });

  it('flags the point being headed for on a route followed forwards', () => {
    expect(flagged(1, false)).toBe('Bravo');
  });

  it('flags no point when the course has no point index', () => {
    expect(flagged(-1, true)).toBeUndefined();
  });
});
