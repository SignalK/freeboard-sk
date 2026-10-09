import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
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

/**
 * A route point's `coordinatesMeta` entry may reference a saved waypoint
 * (`{ href }`) instead of naming the point. The sheet lists such a point by the
 * waypoint's name, marked `*`, and names a point that has no name (#875).
 */
describe('ActiveResourcePropertiesModal point names', () => {
  beforeEach(() => TestBed.resetTestingModule());

  const waypoints: Record<
    string,
    [string, { name: string; description: string }]
  > = {
    'wpt-1': ['wpt-1', { name: 'Harbour entrance', description: 'Red buoy' }]
  };

  const listed = (
    coordinatesMeta: Array<{
      name?: string;
      description?: string;
      href?: string;
    }>
  ) => {
    const route = {
      name: 'Harbour run',
      feature: {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [24.95, 60.15],
            [24.955, 60.16],
            [24.95, 60.17]
          ]
        },
        properties: { coordinatesMeta }
      }
    };
    TestBed.configureTestingModule({
      providers: [
        ActiveResourcePropertiesModal,
        {
          provide: AppFacade,
          useValue: {
            data: {
              activeRoute: null,
              activeRouteReversed: false,
              vessels: { self: { position: [24.95, 60.14], heading: 0 } }
            },
            formatValueForDisplay: () => ''
          }
        },
        {
          provide: CourseService,
          useValue: { courseData: () => ({ pointIndex: -1 }) }
        },
        {
          provide: SKResourceService,
          useValue: {
            fromCache: (collection: string, id: string) =>
              collection === 'waypoints' ? waypoints[id] : undefined
          }
        },
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
    return (
      modal as unknown as {
        pointMeta: Array<{ name: string; description: string }>;
      }
    ).pointMeta;
  };

  it('lists a point that references a saved waypoint by the waypoint name', () => {
    const points = listed([
      { name: 'One' },
      { href: '/resources/waypoints/wpt-1' },
      { name: 'Three' }
    ]);
    expect(points.map((p) => p.name)).toEqual([
      'One',
      '* Harbour entrance',
      'Three'
    ]);
    expect(points[1].description).toBe('* Red buoy');
  });

  it('names a point that has no name', () => {
    const points = listed([
      { name: 'One' },
      { description: 'No name here' },
      { name: 'Three' }
    ]);
    expect(points.map((p) => p.name)).toEqual(['One', 'RtePt-002', 'Three']);
  });
});

/**
 * A swipe over the route points has to scroll the list. Each point is a
 * `cdkDrag`; without a live handle a drag starts anywhere on the point and
 * claims the gesture, so on a touchscreen a swipe re-ordered points instead of
 * scrolling. Only the drag indicator may start a re-order.
 */
describe('ActiveResourcePropertiesModal re-order handles', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('re-orders a point only from its drag indicator', () => {
    const coordinates = [
      [24.95, 60.15],
      [24.955, 60.16],
      [24.95, 60.17]
    ];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AppFacade,
          useValue: {
            data: {
              activeRoute: null,
              vessels: { self: { position: [24.95, 60.1712], heading: 0 } }
            },
            formatValueForDisplay: () => ''
          }
        },
        { provide: CourseService, useValue: {} },
        { provide: SKResourceService, useValue: {} },
        { provide: RouteBufferRegistry, useValue: {} },
        { provide: MatBottomSheetRef, useValue: { dismiss: () => undefined } },
        {
          provide: MAT_BOTTOM_SHEET_DATA,
          useValue: {
            title: 'Route Properties',
            type: 'route',
            resource: [
              'rte-1',
              {
                name: 'Handles',
                feature: {
                  type: 'Feature',
                  geometry: { type: 'LineString', coordinates },
                  properties: {
                    coordinatesMeta: coordinates.map((_, i) => ({
                      name: `P${i}`
                    }))
                  }
                }
              },
              false
            ],
            noButtons: true
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(ActiveResourcePropertiesModal);
    fixture.detectChanges();

    const handles = fixture.debugElement.queryAll(By.directive(CdkDragHandle));
    expect(handles).toHaveLength(coordinates.length);
    for (const h of handles) {
      expect(h.nativeElement.textContent).toContain('drag_indicator');
    }
  });
});
