import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, it, expect } from 'vitest';

import { CourseService } from './course.service';
import { SignalKClient } from 'signalk-client-angular';
import { AppFacade } from 'src/app/app.facade';
import { SKResourceService, SKVessel } from '../skresources';
import { Convert } from 'src/app/lib/convert';
import { DistanceUnitDef } from 'src/app/types';

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
