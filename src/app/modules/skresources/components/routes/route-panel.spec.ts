import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, it, expect } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { MatBottomSheet } from '@angular/material/bottom-sheet';

import { RoutePanel } from './route-panel';
import { AppFacade } from 'src/app/app.facade';
import { SKResourceService } from '../../resources.service';
import { RouteBufferRegistry } from 'src/app/modules/plotterext/route-buffer.registry';
import { InfoPanelFacade } from 'src/app/modules/info-panel/info-panel.facade';
import { CourseService } from 'src/app/modules/course';
import { TemporaryRouteService } from 'src/app/modules/course/temporary-route.service';
import { SKResourceGroupService } from '../groups/groups.service';
import { SKRoute } from '../../resource-classes';

/**
 * The route panel lists a route's points in the order it is followed: reversed
 * while it is the active route followed in reverse, and in its stored order
 * otherwise, including while a different route is followed in reverse.
 */
describe('RoutePanel point order', () => {
  let courseData: ReturnType<typeof signal<{ pointIndex: number }>>;
  let data: { activeRoute: string; activeRouteReversed: boolean };

  beforeEach(() => {
    TestBed.resetTestingModule();
    courseData = signal({ pointIndex: 0 });
    data = { activeRoute: 'rte-other', activeRouteReversed: true };
    TestBed.overrideComponent(RoutePanel, {
      set: { template: '', imports: [] }
    });
    TestBed.configureTestingModule({
      imports: [RoutePanel],
      providers: [
        {
          provide: AppFacade,
          useValue: {
            data: Object.assign(data, {
              vessels: { self: { position: [24.95, 60.14] } }
            }),
            formatValueForDisplay: () => ''
          }
        },
        {
          provide: SKResourceService,
          useValue: {
            getRelatedNotes: async () => [],
            fromCache: () => undefined
          }
        },
        {
          provide: RouteBufferRegistry,
          useValue: {
            live: signal(0),
            get: () => undefined,
            getForRoute: () => undefined
          }
        },
        { provide: InfoPanelFacade, useValue: {} },
        { provide: CourseService, useValue: { courseData } },
        { provide: TemporaryRouteService, useValue: {} },
        { provide: SKResourceGroupService, useValue: { with: async () => [] } },
        { provide: MatDialog, useValue: {} },
        { provide: MatBottomSheet, useValue: {} }
      ]
    });
  });

  const open = () => {
    const fixture = TestBed.createComponent(RoutePanel);
    fixture.componentRef.setInput('id', 'rte-1');
    fixture.componentRef.setInput(
      'route',
      new SKRoute({
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
          properties: {
            coordinatesMeta: [
              { name: 'One' },
              { name: 'Two' },
              { name: 'Three' }
            ]
          }
        }
      })
    );
    fixture.detectChanges();
    const listed = () =>
      (
        fixture.componentInstance as unknown as {
          points: () => Array<{ name: string }>;
        }
      )
        .points()
        .map((p) => p.name);
    return { fixture, listed };
  };

  it('lists a route in its own order while another route is followed in reverse', () => {
    const { listed } = open();
    expect(listed()).toEqual(['One', 'Two', 'Three']);
  });

  it('lists the active route in reverse when it is followed in reverse', () => {
    data.activeRoute = 'rte-1';
    const { listed } = open();
    expect(listed()).toEqual(['Three', 'Two', 'One']);
  });

  it('re-orders the list when the route becomes, or stops being, the active one', () => {
    const { fixture, listed } = open();

    data.activeRoute = 'rte-1';
    courseData.set({ pointIndex: 0 });
    fixture.detectChanges();
    expect(listed()).toEqual(['Three', 'Two', 'One']);

    data.activeRoute = 'rte-other';
    courseData.set({ pointIndex: 0 });
    fixture.detectChanges();
    expect(listed()).toEqual(['One', 'Two', 'Three']);
  });

  it('re-orders the list when the active route is reversed', () => {
    data.activeRoute = 'rte-1';
    data.activeRouteReversed = false;
    const { fixture, listed } = open();
    expect(listed()).toEqual(['One', 'Two', 'Three']);

    data.activeRouteReversed = true;
    courseData.set({ pointIndex: 0 });
    fixture.detectChanges();
    expect(listed()).toEqual(['Three', 'Two', 'One']);
  });
});

/**
 * A route point's `coordinatesMeta` entry may reference a saved waypoint
 * (`{ href }`) instead of naming the point. The panel lists such a point by the
 * waypoint's name, marked `*`, and names a point that has no name (#875).
 */
describe('RoutePanel point names', () => {
  const waypoints: Record<
    string,
    [string, { name: string; description: string }]
  > = {
    'wpt-1': ['wpt-1', { name: 'Harbour entrance', description: 'Red buoy' }]
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.overrideComponent(RoutePanel, {
      set: { template: '', imports: [] }
    });
    TestBed.configureTestingModule({
      imports: [RoutePanel],
      providers: [
        {
          provide: AppFacade,
          useValue: {
            data: {
              activeRoute: null,
              activeRouteReversed: false,
              vessels: { self: { position: [24.95, 60.14] } }
            },
            formatValueForDisplay: () => ''
          }
        },
        {
          provide: SKResourceService,
          useValue: {
            getRelatedNotes: async () => [],
            fromCache: (collection: string, id: string) =>
              collection === 'waypoints' ? waypoints[id] : undefined
          }
        },
        {
          provide: RouteBufferRegistry,
          useValue: {
            live: signal(0),
            get: () => undefined,
            getForRoute: () => undefined
          }
        },
        { provide: InfoPanelFacade, useValue: {} },
        {
          provide: CourseService,
          useValue: { courseData: signal({ pointIndex: -1 }) }
        },
        { provide: TemporaryRouteService, useValue: {} },
        { provide: SKResourceGroupService, useValue: { with: async () => [] } },
        { provide: MatDialog, useValue: {} },
        { provide: MatBottomSheet, useValue: {} }
      ]
    });
  });

  const listed = (
    coordinatesMeta: Array<{
      name?: string;
      description?: string;
      href?: string;
    }>
  ) => {
    const fixture = TestBed.createComponent(RoutePanel);
    fixture.componentRef.setInput('id', 'rte-1');
    fixture.componentRef.setInput(
      'route',
      new SKRoute({
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
      })
    );
    fixture.detectChanges();
    return (
      fixture.componentInstance as unknown as {
        points: () => Array<{ name: string; description: string }>;
      }
    ).points();
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

  it('names a reference to a waypoint that is not loaded', () => {
    const points = listed([
      { name: 'One' },
      { href: '/resources/waypoints/wpt-unknown' },
      { name: 'Three' }
    ]);
    expect(points[1].name).toBe('* RtePt-002');
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
