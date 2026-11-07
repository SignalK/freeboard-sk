import { describe, it, expect } from 'vitest';
import {
  distanceAlongRoute,
  followedPointIndex,
  pickRoutePoints,
  preferredRoutePoint,
  timeToGo
} from './route-point-pick';

// EPSG:3857 world width in metres.
const W = 2 * Math.PI * 6378137;
const ROUTE = [
  [0, 0],
  [1000, 0],
  [2000, 0]
];
// 10 m per pixel: the route points are 100 px apart.
const RES = 10;

describe('pickRoutePoints', () => {
  it('picks the point under the click', () => {
    expect(pickRoutePoints(ROUTE, [1000, 0], RES, 10, W)).toEqual([1]);
  });

  it('picks the nearest point within the tolerance', () => {
    expect(pickRoutePoints(ROUTE, [1060, 50], RES, 10, W)).toEqual([1]); // ~7.8 px
    expect(pickRoutePoints(ROUTE, [1950, 0], RES, 10, W)).toEqual([2]); // 5 px
  });

  it('picks nothing on a leg between points', () => {
    expect(pickRoutePoints(ROUTE, [500, 0], RES, 10, W)).toEqual([]);
  });

  it('picks nothing just outside the tolerance', () => {
    expect(pickRoutePoints(ROUTE, [1101, 0], RES, 10, W)).toEqual([]); // 10.1 px
  });

  it('finds the point in another world copy', () => {
    expect(pickRoutePoints(ROUTE, [W + 2000, 30], RES, 10, W)).toEqual([2]);
    expect(pickRoutePoints(ROUTE, [-W, 0], RES, 10, W)).toEqual([0]);
  });

  it('finds a point stored past ±180°', () => {
    // a route crossing the antimeridian, stored unwrapped
    const east = [
      [W / 2 - 1000, 0],
      [W / 2 + 1000, 0]
    ];
    // the second point, clicked where it is drawn in the primary world
    expect(pickRoutePoints(east, [-W / 2 + 1000, 0], RES, 10, W)).toEqual([1]);
  });
});

describe('pickRoutePoints on a loop', () => {
  // starts and ends at the same marina
  const LOOP = [
    [0, 0],
    [1000, 0],
    [1000, 1000],
    [0, 0]
  ];

  it('returns every point at the clicked spot', () => {
    expect(pickRoutePoints(LOOP, [30, 0], RES, 10, W)).toEqual([0, 3]);
  });

  it('returns only the nearest spot when two are within the tolerance', () => {
    const close = [
      [0, 0],
      [50, 0]
    ];
    expect(pickRoutePoints(close, [10, 0], RES, 10, W)).toEqual([0]);
  });
});

describe('preferredRoutePoint', () => {
  it('prefers the point being headed for', () => {
    expect(preferredRoutePoint([0, 3], 0)).toBe(0);
    expect(preferredRoutePoint([0, 3], 3)).toBe(3);
  });

  it('otherwise prefers the next one ahead', () => {
    // under way on the loop: the marina ahead is the end
    expect(preferredRoutePoint([0, 3], 2)).toBe(3);
  });

  it('otherwise takes the first', () => {
    expect(preferredRoutePoint([0, 3], 5)).toBe(0);
    expect(preferredRoutePoint([2], 1)).toBe(2);
  });
});

describe('followedPointIndex', () => {
  it('is the stored index when the route is followed forwards', () => {
    expect(followedPointIndex(1, 5, false)).toBe(1);
  });

  it('counts from the end when the route is followed in reverse', () => {
    expect(followedPointIndex(0, 5, true)).toBe(4);
    expect(followedPointIndex(4, 5, true)).toBe(0);
  });
});

describe('distanceAlongRoute', () => {
  // About 1 nmi (1852 m) between neighbours along the equator.
  const NM = 1 / 60;
  const followed: [number, number][] = [
    [0, 0],
    [NM, 0],
    [2 * NM, 0],
    [3 * NM, 0]
  ];

  it('goes straight to the point headed for, then along the legs', () => {
    const vessel: [number, number] = [NM / 2, 0];
    expect(distanceAlongRoute(vessel, followed, 1, 1)).toBeCloseTo(926, -1);
    expect(distanceAlongRoute(vessel, followed, 1, 3)).toBeCloseTo(
      926 + 2 * 1853,
      -2
    );
  });

  it('has no distance to a point already passed', () => {
    expect(distanceAlongRoute([NM, 0], followed, 2, 1)).toBeUndefined();
  });
});

describe('timeToGo', () => {
  it('divides the distance by the speed over ground', () => {
    expect(timeToGo(1852, 2.572)).toBeCloseTo(720, 0);
  });

  it('gives no estimate when stopped or without a distance', () => {
    expect(timeToGo(1852, 0.1)).toBeUndefined();
    expect(timeToGo(1852, null)).toBeUndefined();
    expect(timeToGo(undefined, 3)).toBeUndefined();
  });
});
