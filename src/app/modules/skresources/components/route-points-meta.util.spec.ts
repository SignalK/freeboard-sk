import { describe, it, expect } from 'vitest';

import { routePointsMeta } from './route-points-meta.util';
import { SKWaypoint } from '../resource-classes';

describe('routePointsMeta', () => {
  const waypoints: Record<string, SKWaypoint> = {
    named: new SKWaypoint({
      name: 'Harbour entrance',
      description: 'Red buoy',
      feature: {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [24.955, 60.16] },
        properties: {}
      }
    }),
    bare: new SKWaypoint({
      feature: {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [24.95, 60.17] },
        properties: {}
      }
    })
  };
  const lookup = (id: string) => waypoints[id];

  it('lists a referenced waypoint by its name and description', () => {
    expect(
      routePointsMeta(1, [{ href: '/resources/waypoints/named' }], lookup)
    ).toEqual([{ name: '* Harbour entrance', description: '* Red buoy' }]);
  });

  it('names a referenced waypoint that has no name or description', () => {
    expect(
      routePointsMeta(
        2,
        [{ name: 'One' }, { href: '/resources/waypoints/bare' }],
        lookup
      )[1]
    ).toEqual({ name: '* RtePt-002', description: '' });
  });

  it('names a reference to a waypoint that is not loaded', () => {
    expect(
      routePointsMeta(1, [{ href: '/resources/waypoints/unknown' }], lookup)
    ).toEqual([{ name: '* RtePt-001', description: '' }]);
  });

  it('names a point whose name is empty', () => {
    expect(
      routePointsMeta(2, [{ name: 'One' }, { name: '' }], lookup)[1]
    ).toEqual({ name: 'RtePt-002', description: '' });
  });

  it('shows the stored name of a reference to a waypoint that is not loaded', () => {
    expect(
      routePointsMeta(
        1,
        [
          {
            name: 'Outer mark',
            description: 'Green can',
            href: '/resources/waypoints/unknown'
          }
        ],
        lookup
      )
    ).toEqual([{ name: '* Outer mark', description: '* Green can' }]);
  });

  it("prefers a loaded waypoint's current name to the stored one", () => {
    expect(
      routePointsMeta(
        1,
        [{ name: 'Old name', href: '/resources/waypoints/named' }],
        lookup
      )
    ).toEqual([{ name: '* Harbour entrance', description: '* Red buoy' }]);
  });

  it('names a point that has no name', () => {
    expect(
      routePointsMeta(2, [{ name: 'One' }, { description: 'Shoal' }], lookup)
    ).toEqual([
      { name: 'One', description: '' },
      { name: 'RtePt-002', description: 'Shoal' }
    ]);
  });

  it('names every point of a route without point metadata', () => {
    expect(routePointsMeta(2, undefined, lookup)).toEqual([
      { name: 'RtePt-001', description: '' },
      { name: 'RtePt-002', description: '' }
    ]);
  });
});
