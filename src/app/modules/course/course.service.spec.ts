import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { CourseService } from './course.service';
import { SignalKClient } from 'signalk-client-angular';
import { AppFacade } from 'src/app/app.facade';
import { SKResourceService, SKVessel } from '../skresources';
import { Convert } from 'src/app/lib/convert';
import { DistanceUnitDef, SKCourseApi } from 'src/app/types';
import type { CoursePointType } from '@signalk/server-api';

/**
 * Minimal harness to drive parseSelf() with a chosen distance unit. The course
 * calc fields used are `distance` (to next point) and `route.distance`
 * (remaining along the whole route); they must map to courseData.dtg and
 * courseData.route.dtg respectively.
 */
function setup(distanceUnit: DistanceUnitDef) {
  const app = {
    config: { units: { distance: distanceUnit } },
    useMagnetic: false
  };
  TestBed.configureTestingModule({
    providers: [
      CourseService,
      { provide: SignalKClient, useValue: {} },
      { provide: AppFacade, useValue: app },
      { provide: SKResourceService, useValue: { routes: signal(null) } }
    ]
  });
  return TestBed.inject(CourseService);
}

function vesselWith(distance: number, routeDistance: number): SKVessel {
  return {
    courseCalcs: { distance, 'route.distance': routeDistance }
  } as unknown as SKVessel;
}

describe('CourseService route DTG (#414)', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('derives route.dtg from route.distance, not the next-point distance (km)', () => {
    const service = setup('kilometer');
    // 200 m to next point, 5000 m remaining on the route.
    service.parseSelf(vesselWith(200, 5000));

    const c = service.courseData();
    expect(c.dtg).toBeCloseTo(0.2, 6); // next-point DTG: 200 m
    expect(c.route.dtg).toBeCloseTo(5.0, 6); // route DTG: 5000 m — not 0.2
    expect(c.route.dtg).not.toBeCloseTo(c.dtg as number, 6);
  });

  it('derives route.dtg from route.distance (nautical miles)', () => {
    const service = setup('naut-mile');
    service.parseSelf(vesselWith(200, 5000));

    const c = service.courseData();
    expect(c.dtg).toBeCloseTo(Convert.transform(200, 'm', 'naut-mile'), 6);
    expect(c.route.dtg).toBeCloseTo(
      Convert.transform(5000, 'm', 'naut-mile'),
      6
    );
  });
});

/**
 * parseSelf() also folds the vessel's Course API state (`navigation.course.*`
 * deltas, typed as SKCourseApi — #755) and the ISO ETA strings from
 * `calcValues` into courseData.
 */
describe('CourseService course API data (#755)', () => {
  beforeEach(() => TestBed.resetTestingModule());

  const point = (lon: number, lat: number, href?: string) => ({
    href,
    type: 'Location' as CoursePointType,
    position: { longitude: lon, latitude: lat }
  });

  function setupWithData() {
    const app = {
      config: { units: { distance: 'naut-mile' } },
      useMagnetic: false,
      data: { activeWaypoint: null, activeRoute: null }
    };
    TestBed.configureTestingModule({
      providers: [
        CourseService,
        { provide: SignalKClient, useValue: {} },
        { provide: AppFacade, useValue: app },
        {
          provide: SKResourceService,
          useValue: {
            routes: signal(null),
            fromCache: () => undefined,
            waypointAddFromServer: () => undefined,
            routeAddFromServer: () => undefined
          }
        }
      ]
    });
    return { service: TestBed.inject(CourseService), app };
  }

  const vesselWithCourse = (courseApi: SKCourseApi): SKVessel =>
    ({ courseApi, courseCalcs: {} }) as unknown as SKVessel;

  it('maps next / previous point positions and the active waypoint href', () => {
    const { service, app } = setupWithData();
    service.parseSelf(
      vesselWithCourse({
        arrivalCircle: 250,
        activeRoute: null,
        nextPoint: point(-80.1, 25.1, '/resources/waypoints/wpt-1'),
        previousPoint: point(-80.2, 25.2)
      })
    );

    const c = service.courseData();
    expect(c.arrivalCircle).toBe(250);
    expect(c.position).toEqual([-80.1, 25.1]);
    expect(c.startPosition).toEqual([-80.2, 25.2]);
    expect(app.data.activeWaypoint).toBe('wpt-1');
    expect(c.pointIndex).toBe(-1); // no active route
  });

  it('takes the active route point index / total and clears the waypoint', () => {
    const { service, app } = setupWithData();
    service.parseSelf(
      vesselWithCourse({
        arrivalCircle: 250,
        activeRoute: {
          href: '/resources/routes/rte-1',
          pointIndex: 2,
          pointTotal: 5,
          reverse: true,
          name: 'Home'
        },
        nextPoint: point(-80.1, 25.1, '/resources/routes/rte-1'),
        previousPoint: point(-80.2, 25.2)
      })
    );

    const c = service.courseData();
    expect(app.data.activeRoute).toBe('rte-1');
    expect(app.data.activeWaypoint).toBeNull();
    expect(c.pointIndex).toBe(2);
    expect(c.pointTotal).toBe(5);
  });

  it('clears the course when the destination is removed', () => {
    const { service, app } = setupWithData();
    service.parseSelf(
      vesselWithCourse({
        arrivalCircle: 250,
        activeRoute: null,
        nextPoint: point(-80.1, 25.1, '/resources/waypoints/wpt-1'),
        previousPoint: point(-80.2, 25.2)
      })
    );
    service.parseSelf(
      vesselWithCourse({
        arrivalCircle: 250,
        activeRoute: null,
        nextPoint: null,
        previousPoint: null
      })
    );

    const c = service.courseData();
    expect(c.position).toBeNull();
    expect(c.startPosition).toBeNull();
    expect(app.data.activeWaypoint).toBeNull();
  });

  it('parses ISO ETA strings and rejects unparseable ones', () => {
    const { service } = setupWithData();
    service.parseSelf({
      courseCalcs: {
        estimatedTimeOfArrival: '2026-09-18T12:00:00.000Z',
        'route.estimatedTimeOfArrival': 'not-a-date'
      }
    } as unknown as SKVessel);

    const c = service.courseData();
    expect(c.eta).toBeInstanceOf(Date);
    expect(c.eta.toISOString()).toBe('2026-09-18T12:00:00.000Z');
    expect(c.route.eta).toBeNull();
  });
});

/**
 * The destination flag and its popover are labelled with the name of the point
 * the route is heading for. Point names are in the order the route is stored,
 * while the Course API's `pointIndex` counts in the order it is followed (#871).
 */
describe('CourseService destination point name', () => {
  const names = ['Alpha', 'Bravo', 'Charlie', 'Delta'];
  const route = [
    'rte-1',
    {
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
    }
  ];
  const point = (lon: number, lat: number) => ({
    type: 'RoutePoint' as CoursePointType,
    position: { longitude: lon, latitude: lat }
  });

  const destinationName = (pointIndex: number, reverse: boolean) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        CourseService,
        { provide: SignalKClient, useValue: {} },
        {
          provide: AppFacade,
          useValue: {
            config: { units: { distance: 'naut-mile' } },
            useMagnetic: false,
            data: {
              activeWaypoint: null,
              activeRoute: null,
              activeRouteReversed: false
            }
          }
        },
        {
          provide: SKResourceService,
          useValue: {
            routes: signal(null),
            fromCache: () => route,
            routeAddFromServer: () => undefined
          }
        }
      ]
    });
    const service = TestBed.inject(CourseService);
    service.parseSelf({
      courseApi: {
        arrivalCircle: 100,
        activeRoute: {
          href: '/resources/routes/rte-1',
          pointIndex,
          pointTotal: names.length,
          reverse,
          name: 'Reverse test'
        },
        nextPoint: point(24.95, 60.17),
        previousPoint: point(24.955, 60.18)
      },
      courseCalcs: {}
    } as unknown as SKVessel);
    return service.courseData().destPointName;
  };

  it('names the point being headed for on a route followed in reverse', () => {
    expect(destinationName(0, true)).toBe('Delta');
    expect(destinationName(1, true)).toBe('Charlie');
    expect(destinationName(3, true)).toBe('Alpha');
  });

  it('names the point being headed for on a route followed forwards', () => {
    expect(destinationName(0, false)).toBe('Alpha');
    expect(destinationName(1, false)).toBe('Bravo');
    expect(destinationName(3, false)).toBe('Delta');
  });
});

/**
 * Rejoin the route at a point: the Course API measures cross-track error along
 * the route's leg into the new point, so the course is restarted from the
 * vessel afterwards to head straight for it.
 */
describe('CourseService rejoin the route at a point', () => {
  beforeEach(() => TestBed.resetTestingModule());

  const setup = (failPointIndex = false) => {
    const puts: Array<{ path: string; body: unknown }> = [];
    const putWithContext = vi.fn(
      (_version: number, _context: string, path: string, body: unknown) => {
        puts.push({ path, body });
        return failPointIndex && path.endsWith('pointIndex')
          ? throwError(() => ({ status: 400 }))
          : of({});
      }
    );
    const parseHttpErrorResponse = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        CourseService,
        { provide: SignalKClient, useValue: { api: { putWithContext } } },
        {
          provide: AppFacade,
          useValue: { skApiVersion: 2, parseHttpErrorResponse }
        },
        { provide: SKResourceService, useValue: { routes: signal(null) } }
      ]
    });
    return {
      service: TestBed.inject(CourseService),
      puts,
      parseHttpErrorResponse
    };
  };

  it('sets the point, then restarts the course from the vessel', async () => {
    const { service, puts } = setup();

    expect(await service.rejoinRouteAt(3)).toBe(true);

    expect(puts).toEqual([
      {
        path: 'navigation/course/activeRoute/pointIndex',
        body: { value: 3 }
      },
      { path: 'navigation/course/restart', body: null }
    ]);
  });

  it('does not restart when the point is refused', async () => {
    const { service, puts, parseHttpErrorResponse } = setup(true);

    expect(await service.rejoinRouteAt(3)).toBe(false);

    expect(puts.map((p) => p.path)).toEqual([
      'navigation/course/activeRoute/pointIndex'
    ]);
    expect(parseHttpErrorResponse).toHaveBeenCalled();
  });

  it('skips to the point after the one shown', async () => {
    const { service, puts } = setup();

    await service.skipRoutePoint(1);

    expect(puts[0]).toEqual({
      path: 'navigation/course/activeRoute/pointIndex',
      body: { value: 2 }
    });
  });

  it('only re-targets when the course moved on before the skip landed', async () => {
    const { service, puts } = setup();
    // SKIP shown on point 1, but the vessel arrived and the course advanced
    (
      service as unknown as {
        _courseData: { update: (fn: (c: object) => object) => void };
      }
    )._courseData.update((c) => ({ ...c, pointIndex: 2 }));

    await service.skipRoutePoint(1);

    // point 2 again, not point 3: the new target is not skipped too
    expect(puts[0].body).toEqual({ value: 2 });
  });
});
