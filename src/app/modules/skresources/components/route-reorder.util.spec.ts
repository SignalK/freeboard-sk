import { describe, it, expect } from 'vitest';
import {
  editsRouteBuffer,
  buildRoutePoints,
  coordinatesMetaFromPoints
} from './route-reorder.util';

/**
 * Route Points reorder persistence (#583). Dragging a point in the Points
 * dialog persists the new order. For a stored route it PUTs to the server; for
 * an unsaved draft / dirty route it edits the route buffer instead, leaving
 * persistence deferred to an explicit Save — matching how draft geometry edits
 * already work. These pure helpers carry the decision + the point rebuild; they
 * are unit-tested here rather than through the DI-heavy dialog component (whose
 * import graph perturbs the AppComponent bootstrap spec — see DEV-LESSONS).
 */
describe('editsRouteBuffer (#583)', () => {
  it('edits the buffer for an unsaved draft', () => {
    expect(editsRouteBuffer({ saved: false, dirty: true })).toBe(true);
    expect(editsRouteBuffer({ saved: false, dirty: false })).toBe(true);
  });

  it('edits the buffer for a saved-but-dirty route', () => {
    expect(editsRouteBuffer({ saved: true, dirty: true })).toBe(true);
  });

  it('persists to the server for a stored (clean) route', () => {
    expect(editsRouteBuffer({ saved: true, dirty: false })).toBe(false);
  });

  it('persists to the server when the route has no buffer entry', () => {
    expect(editsRouteBuffer(undefined)).toBe(false);
  });
});

describe('buildRoutePoints (#583)', () => {
  it('preserves per-point name/description alongside the reordered coordinates', () => {
    const points: Array<[number, number]> = [
      [-80.1, 25.1],
      [-80.2, 25.2],
      [-80.0, 25.0]
    ];
    const coordsMeta = [
      { name: 'B' },
      { name: 'C' },
      { name: 'A', description: 'home' }
    ];

    const result = buildRoutePoints(points, coordsMeta);

    expect(result.map((p) => p.position)).toEqual(points);
    expect(result.map((p) => p.name)).toEqual(['B', 'C', 'A']);
    expect(result[2].description).toBe('home');
  });

  it('omits name/description when there is no metadata', () => {
    const result = buildRoutePoints([[-80, 25]]);
    expect(result).toEqual([{ position: [-80, 25] }]);
  });

  it('omits empty name/description entries', () => {
    const result = buildRoutePoints(
      [[-80, 25]],
      [{ name: '', description: '' }]
    );
    expect(result[0].name).toBeUndefined();
    expect(result[0].description).toBeUndefined();
  });

  it('carries a waypoint link through the rebuild (#880)', () => {
    const href = '/resources/waypoints/abc';
    const result = buildRoutePoints(
      [
        [-80, 25],
        [-81, 26]
      ],
      [{ name: 'WP-1', href }, { href }]
    );
    expect(result[0]).toEqual({ position: [-80, 25], name: 'WP-1', href });
    expect(result[1]).toEqual({ position: [-81, 26], href });
  });
});

describe('coordinatesMetaFromPoints (#880)', () => {
  const href = '/resources/waypoints/abc';

  it('stores no metadata when no point has any', () => {
    expect(
      coordinatesMetaFromPoints([{}, { name: '', description: '' }])
    ).toBeUndefined();
  });

  it('gives an unnamed point an empty name, never an empty entry', () => {
    // The server rejects `{}`, so a partly named route has to name every point.
    const meta = coordinatesMetaFromPoints([{ name: 'Start' }, {}, {}]);
    expect(meta).toEqual([{ name: 'Start' }, { name: '' }, { name: '' }]);
  });

  it('keeps the waypoint link alongside the name and description', () => {
    expect(
      coordinatesMetaFromPoints([
        { name: 'Mark', description: 'Red nun', href },
        { href }
      ])
    ).toEqual([
      { name: 'Mark', description: 'Red nun', href },
      { name: '', href }
    ]);
  });

  it('survives a load and save round trip unchanged', () => {
    const stored = [
      { name: 'Mark', description: 'Red nun', href },
      { name: '' },
      { name: 'End' }
    ];
    const points = buildRoutePoints(
      [
        [0, 0],
        [1, 1],
        [2, 2]
      ],
      stored
    );
    expect(coordinatesMetaFromPoints(points)).toEqual(stored);
  });
});
