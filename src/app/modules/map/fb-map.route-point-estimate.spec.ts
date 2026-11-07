import { describe, expect, it } from 'vitest';
import { signal } from '@angular/core';

import { FBMapComponent } from './fb-map.component';
import { ActiveRoutePoint } from './route-point-pick';

// The distance to a tapped point of the active route is measured on the
// route the course follows. Exercised on a bare prototype instance, as in
// fb-map.pointer-down.spec.ts.

const NM = 1 / 60;
const ROUTE: [number, number][] = [
  [0, 0],
  [NM, 0],
  [2 * NM, 0],
  [3 * NM, 0]
];

const bareComponent = (opts: {
  cached: [number, number][] | null;
  pointTotal: number;
  sog?: number;
}) => {
  const cmp = Object.create(FBMapComponent.prototype);
  cmp.course = {
    courseData: signal({
      pointIndex: 1,
      pointTotal: opts.pointTotal,
      pointNames: [],
      activeRoutePoints: ROUTE
    })
  };
  cmp.app = {
    data: {
      activeRoute: 'rte-1',
      activeRouteReversed: false,
      vessels: { self: { position: [NM / 2, 0], sog: opts.sog ?? 2.572 } }
    }
  };
  cmp.skres = {
    fromCache: (_c: string, id: string) =>
      opts.cached && id === 'rte-1'
        ? [id, { feature: { geometry: { coordinates: opts.cached } } }]
        : undefined
  };
  return cmp as {
    activeRoutePoint: (index: number) => ActiveRoutePoint;
  };
};

describe('FBMapComponent active route point estimates', () => {
  it('measures along the followed route to the tapped point', () => {
    const point = bareComponent({
      cached: ROUTE,
      pointTotal: 4
    }).activeRoutePoint(3);

    expect(point.distance).toBeCloseTo(926 + 2 * 1853, -2);
    expect(point.timeToGo).toBeGreaterThan(0);
  });

  it('gives no estimate while the followed route is not cached yet', () => {
    const point = bareComponent({
      cached: null,
      pointTotal: 4
    }).activeRoutePoint(3);

    expect(point.distance).toBeUndefined();
    expect(point.timeToGo).toBeUndefined();
  });

  it('gives no estimate when the cached route does not match the course', () => {
    const point = bareComponent({
      cached: ROUTE,
      pointTotal: 6
    }).activeRoutePoint(3);

    expect(point.distance).toBeUndefined();
  });
});
