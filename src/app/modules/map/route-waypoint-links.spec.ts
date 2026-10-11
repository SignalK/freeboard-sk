import { describe, expect, it } from 'vitest';
import { Position } from 'src/app/types';
import {
  drawnRouteMeta,
  linkPointOnWaypoint,
  touchedVertex,
  WaypointLookup
} from './route-waypoint-links';

/**
 * A route point snapped onto a waypoint is saved as `{ name, description,
 * href }`, so it shows the waypoint's name and keeps the link (#881).
 */

const WPS = [
  { id: 'a', coordinate: [100, 50] },
  { id: 'b', coordinate: [300, 70] }
];
const lookup: WaypointLookup = (id) =>
  ({
    a: { name: 'Alpha', description: 'Fuel dock' },
    b: { name: 'Bravo' }
  })[id];

const ALPHA = {
  name: 'Alpha',
  description: 'Fuel dock',
  href: '/resources/waypoints/a'
};
const BRAVO = { name: 'Bravo', href: '/resources/waypoints/b' };

describe('drawnRouteMeta', () => {
  it('links each drawn point lying on a waypoint and names every other', () => {
    const coords: Position[] = [
      [100, 50],
      [200, 60],
      [300, 70]
    ];
    expect(drawnRouteMeta(coords, WPS, lookup)).toEqual([
      ALPHA,
      { name: '' },
      BRAVO
    ]);
  });

  it('adds no metadata to a route drawn away from every waypoint', () => {
    expect(
      drawnRouteMeta(
        [
          [0, 0],
          [10, 10]
        ],
        WPS,
        lookup
      )
    ).toBeUndefined();
  });

  it('keeps the link when the waypoint is not in the cache', () => {
    expect(drawnRouteMeta([[100, 50]], WPS, () => undefined)).toEqual([
      { name: '', href: '/resources/waypoints/a' }
    ]);
  });
});

describe('touchedVertex', () => {
  const before: Position[] = [
    [0, 0],
    [10, 0],
    [20, 0]
  ];

  it('is the vertex a move changed', () => {
    expect(
      touchedVertex(before, [
        [0, 0],
        [10, 5],
        [20, 0]
      ])
    ).toBe(1);
  });

  it('is the vertex an insert added', () => {
    expect(
      touchedVertex(before, [
        [0, 0],
        [5, 5],
        [10, 0],
        [20, 0]
      ])
    ).toBe(1);
  });

  it('is the new end point of an extension', () => {
    expect(touchedVertex(before, [...before, [30, 0]])).toBe(3);
  });

  it('is none for a delete, or when nothing moved', () => {
    expect(
      touchedVertex(before, [
        [0, 0],
        [20, 0]
      ])
    ).toBe(-1);
    expect(touchedVertex(before, before)).toBe(-1);
  });
});

describe('linkPointOnWaypoint', () => {
  it('links a point dropped on a waypoint, in place', () => {
    const meta = [{ name: 'Start' }, { name: '' }];
    const out = linkPointOnWaypoint(
      [
        [0, 0],
        [100, 50]
      ],
      1,
      meta,
      WPS,
      lookup
    );
    expect(out).toBe(meta);
    expect(meta).toEqual([{ name: 'Start' }, ALPHA]);
  });

  it('gives a route without metadata an entry for every point', () => {
    expect(
      linkPointOnWaypoint(
        [
          [0, 0],
          [300, 70],
          [400, 0]
        ],
        1,
        undefined,
        WPS,
        lookup
      )
    ).toEqual([{ name: '' }, BRAVO, { name: '' }]);
  });

  it('leaves the metadata alone for a point on no waypoint', () => {
    expect(
      linkPointOnWaypoint([[0, 0]], 0, undefined, WPS, lookup)
    ).toBeUndefined();
    const meta = [{ name: 'x' }];
    expect(linkPointOnWaypoint([[0, 0]], -1, meta, WPS, lookup)).toBe(meta);
  });
});
