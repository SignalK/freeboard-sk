import { describe, it, expect } from 'vitest';
import { editsRouteBuffer, buildRoutePoints } from './route-reorder.util';

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

  it('does not synthesize an href for waypoint-referenced points', () => {
    // coordinatesMeta can carry an href (a route point that references a stored
    // waypoint), but RoutePoint / the route buffer don't model waypoint refs.
    // buildRoutePoints only runs on buffer-derived meta, which never carries
    // href; href-bearing routes persist through the server path, which keeps the
    // full coordinatesMeta. Assert the rebuild carries position/name/description
    // and never invents an href field.
    const meta: Array<{ name?: string; description?: string; href?: string }> =
      [{ name: 'WP-1', href: '/resources/waypoints/abc' }];
    const result = buildRoutePoints([[-80, 25]], meta);
    expect(result[0].position).toEqual([-80, 25]);
    expect(result[0].name).toBe('WP-1');
    expect('href' in result[0]).toBe(false);
  });
});
