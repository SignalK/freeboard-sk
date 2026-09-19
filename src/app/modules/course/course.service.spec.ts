import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, it, expect } from 'vitest';

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
