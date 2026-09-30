import { describe, it, expect } from 'vitest';
import { followedPointIndex, pickRoutePoint } from './route-point-pick';

// EPSG:3857 world width in metres.
const W = 2 * Math.PI * 6378137;
const ROUTE = [
  [0, 0],
  [1000, 0],
  [2000, 0]
];
// 10 m per pixel: the route points are 100 px apart.
const RES = 10;

describe('pickRoutePoint', () => {
  it('picks the point under the click', () => {
    expect(pickRoutePoint(ROUTE, [1000, 0], RES, 10, W)).toBe(1);
  });

  it('picks the nearest point within the tolerance', () => {
    expect(pickRoutePoint(ROUTE, [1060, 50], RES, 10, W)).toBe(1); // ~7.8 px
    expect(pickRoutePoint(ROUTE, [1950, 0], RES, 10, W)).toBe(2); // 5 px
  });

  it('picks nothing on a leg between points', () => {
    expect(pickRoutePoint(ROUTE, [500, 0], RES, 10, W)).toBeNull();
  });

  it('picks nothing just outside the tolerance', () => {
    expect(pickRoutePoint(ROUTE, [1101, 0], RES, 10, W)).toBeNull(); // 10.1 px
  });

  it('finds the point in another world copy', () => {
    expect(pickRoutePoint(ROUTE, [W + 2000, 30], RES, 10, W)).toBe(2);
    expect(pickRoutePoint(ROUTE, [-W, 0], RES, 10, W)).toBe(0);
  });

  it('finds a point stored past ±180°', () => {
    // a route crossing the antimeridian, stored unwrapped
    const east = [
      [W / 2 - 1000, 0],
      [W / 2 + 1000, 0]
    ];
    // the second point, clicked where it is drawn in the primary world
    expect(pickRoutePoint(east, [-W / 2 + 1000, 0], RES, 10, W)).toBe(1);
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
