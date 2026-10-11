import { describe, it, expect } from 'vitest';
import VectorSource from 'ol/source/Vector';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { Style, Stroke } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import { FBRoutes, FBWaypoints } from 'src/app/types';
import { LightTheme } from '../themes';
import { FreeboardRouteLayerComponent } from './layer-routes.component';
import { FreeboardWaypointLayerComponent } from './layer-waypoints.component';
import { drawnTogether, linkedWaypointId } from './route-waypoint-overlap';

/**
 * Where a route point is linked to a waypoint drawn on the same spot, the
 * routes layer and the waypoints layer used to both draw a marker there
 * (#991). Now only one does: the route's own marker at its start and end, the
 * waypoint's icon at every other point. Either marker comes back as soon as
 * the other one isn't drawn there.
 *
 * Both layers are exercised as bare prototype instances with a real
 * `VectorSource` (same approach as layer-aistargets-track.component.spec);
 * `ngOnChanges` is driven by hand to feed the inputs.
 */
type Lonlat = [number, number];
type Meta = Array<{ href?: string; name?: string }> | undefined;

const A: Lonlat = [-80.5, 24.9];
const B: Lonlat = [-80.4, 25.0];
const C: Lonlat = [-80.3, 25.1];
const D: Lonlat = [-80.2, 25.2];

const href = (id: string) => `/resources/waypoints/${id}`;
const at = (lonlat: Lonlat) => fromLonLat(lonlat);

function route(coords: Lonlat[], meta: Meta, drawn = true): FBRoutes[number] {
  return [
    'r1',
    {
      name: 'r1',
      feature: {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords },
        properties: meta ? { coordinatesMeta: meta } : {}
      }
    },
    drawn
  ] as unknown as FBRoutes[number];
}

function waypoint(
  id: string,
  coords: Lonlat,
  drawn = true
): FBWaypoints[number] {
  return [
    id,
    {
      name: id,
      feature: {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coords },
        properties: {}
      }
    },
    drawn
  ] as unknown as FBWaypoints[number];
}

function routeLayer(routes: FBRoutes, waypoints: FBWaypoints = []) {
  const c = Object.create(
    FreeboardRouteLayerComponent.prototype
  ) as FreeboardRouteLayerComponent;
  Object.assign(c, {
    source: new VectorSource(),
    routes,
    waypoints,
    drawnWaypoints: new Map(),
    labelPrefixes: ['route'],
    routeStyles: {
      default: new Style({ stroke: new Stroke({ color: 'blue', width: 2 }) })
    },
    mapImages: { getExternalSymbol: () => null },
    // label handling needs the real map; not under test here
    updateLabels: () => undefined
  });
  c.ngOnChanges({
    waypoints: { currentValue: waypoints },
    routes: { currentValue: routes }
  } as never);
  return c as FreeboardRouteLayerComponent & { source: VectorSource };
}

function waypointLayer(waypoints: FBWaypoints, routes: FBRoutes = []) {
  const c = Object.create(
    FreeboardWaypointLayerComponent.prototype
  ) as FreeboardWaypointLayerComponent;
  Object.assign(c, {
    source: new VectorSource(),
    waypoints,
    routes,
    routeEnds: new Map(),
    labelPrefixes: ['waypoint'],
    theme: LightTheme,
    mapZoom: 14,
    labelMinZoom: 10,
    mapImages: { getWaypoint: () => null }
  });
  c.ngOnChanges({
    routes: { currentValue: routes },
    waypoints: { currentValue: waypoints }
  } as never);
  return c as FreeboardWaypointLayerComponent & { source: VectorSource };
}

/** Positions of the route-point markers drawn at `resolution` (m/px). */
function routeMarkers(
  c: ReturnType<typeof routeLayer>,
  resolution = 10
): number[][] {
  const f = c.source.getFeatureById('route.r1') as Feature;
  const styles = f.getStyleFunction()(f, resolution) as Style[];
  return styles
    .map((s) => s.getGeometry())
    .filter((g): g is Point => g instanceof Point)
    .map((g) => g.getCoordinates());
}

/** The style a waypoint is drawn with at `resolution` (m/px). */
function waypointStyle(
  c: ReturnType<typeof waypointLayer>,
  id: string,
  resolution = 10
): Style {
  const f = c.source.getFeatureById('waypoint.' + id) as Feature;
  return f.getStyleFunction()(f, resolution) as Style;
}

describe('route-waypoint overlap helpers (#991)', () => {
  it('reads the waypoint id from a route point link', () => {
    expect(linkedWaypointId({ href: href('w1') })).toBe('w1');
    expect(linkedWaypointId({})).toBeUndefined();
    expect(linkedWaypointId(null)).toBeUndefined();
  });

  it('counts positions as drawn together only within a few pixels', () => {
    expect(drawnTogether([0, 0], [20, 0], 10)).toBe(true); // 2 px
    expect(drawnTogether([0, 0], [50, 0], 10)).toBe(false); // 5 px
    expect(drawnTogether([0, 0], [0, 0], 0)).toBe(false);
  });

  it('compares across a world copy', () => {
    const world = 2 * 20037508.342789244;
    expect(drawnTogether([world + 5, 0], [0, 0], 10)).toBe(true);
  });
});

describe('route markers at waypoint-linked points (#991)', () => {
  it('draws every marker on a route with no waypoint links', () => {
    const c = routeLayer([route([A, B, C], undefined)], [waypoint('wb', B)]);
    expect(routeMarkers(c)).toEqual([at(A), at(B), at(C)]);
  });

  it('draws only the start and end markers when every point is a drawn waypoint', () => {
    const c = routeLayer(
      [
        route(
          [A, B, C],
          [{ href: href('wa') }, { href: href('wb') }, { href: href('wc') }]
        )
      ],
      [waypoint('wa', A), waypoint('wb', B), waypoint('wc', C)]
    );
    expect(routeMarkers(c)).toEqual([at(A), at(C)]);
  });

  it('skips only the linked intermediate points on a mixed route', () => {
    const c = routeLayer(
      [route([A, B, C, D], [{}, { href: href('wb') }, { name: 'plain' }, {}])],
      [waypoint('wb', B)]
    );
    expect(routeMarkers(c)).toEqual([at(A), at(C), at(D)]);
  });

  it('keeps the marker when the linked waypoint is not drawn or missing', () => {
    const c = routeLayer(
      [
        route(
          [A, B, C, D],
          [{}, { href: href('wb') }, { href: href('missing') }, {}]
        )
      ],
      [waypoint('wb', B, false)]
    );
    expect(routeMarkers(c)).toEqual([at(A), at(B), at(C), at(D)]);
  });

  it('keeps the marker when the waypoint has moved away from the point', () => {
    // ~110 m away: drawn apart at 10 m/px, on top of each other at 100 m/px
    const moved: Lonlat = [B[0], B[1] + 0.001];
    const c = routeLayer(
      [route([A, B, C], [{}, { href: href('wb') }, {}])],
      [waypoint('wb', moved)]
    );
    expect(routeMarkers(c, 10)).toEqual([at(A), at(B), at(C)]);
    expect(routeMarkers(c, 100)).toEqual([at(A), at(C)]);
  });

  it('matches a waypoint on a route drawn across the antimeridian', () => {
    const c = routeLayer(
      [
        route(
          [
            [179.5, -17],
            [-179.9, -17],
            [-179.5, -17]
          ],
          [{}, { href: href('wx') }, {}]
        )
      ],
      [waypoint('wx', [-179.9, -17])]
    );
    // the route is drawn unwrapped (past +180); the waypoint is not
    expect(routeMarkers(c)).toEqual([at([179.5, -17]), at([180.5, -17])]);
  });

  it('brings markers back when the waypoints stop being drawn', () => {
    const c = routeLayer(
      [route([A, B, C], [{}, { href: href('wb') }, {}])],
      [waypoint('wb', B)]
    );
    expect(routeMarkers(c)).toEqual([at(A), at(C)]);

    const before = c.source.getRevision();
    c.ngOnChanges({
      waypoints: { currentValue: [waypoint('wb', B, false)] }
    } as never);
    expect(c.source.getRevision()).toBeGreaterThan(before);
    expect(routeMarkers(c)).toEqual([at(A), at(B), at(C)]);
  });
});

describe('waypoint icons at route starts and ends (#991)', () => {
  const linked = route(
    [A, B, C],
    [{ href: href('wa') }, { href: href('wb') }, { href: href('wc') }]
  );
  const all = () => [waypoint('wa', A), waypoint('wb', B), waypoint('wc', C)];

  it('draws the icon for a waypoint on no route', () => {
    const c = waypointLayer(all());
    expect(waypointStyle(c, 'wa').getImage()).toBeTruthy();
  });

  it('drops the icon where a drawn route starts or ends, keeping the label', () => {
    const c = waypointLayer(all(), [linked]);
    for (const id of ['wa', 'wc']) {
      const s = waypointStyle(c, id);
      expect(s.getImage()).toBeFalsy();
      expect(s.getText()?.getText()).toBe(id);
    }
    // an intermediate point keeps its icon (the route marker gives way there)
    expect(waypointStyle(c, 'wb').getImage()).toBeTruthy();
  });

  it('keeps the icon when the route is not drawn', () => {
    const c = waypointLayer(all(), [
      route([A, B, C], [{ href: href('wa') }, {}, { href: href('wc') }], false)
    ]);
    expect(waypointStyle(c, 'wa').getImage()).toBeTruthy();
    expect(waypointStyle(c, 'wc').getImage()).toBeTruthy();
  });

  it('keeps the icon when the route end is not on the waypoint', () => {
    const moved: Lonlat = [A[0], A[1] + 0.001];
    const c = waypointLayer([waypoint('wa', moved)], [linked]);
    expect(waypointStyle(c, 'wa', 10).getImage()).toBeTruthy();
    expect(waypointStyle(c, 'wa', 100).getImage()).toBeFalsy();
  });

  it('brings the icon back when the route stops being drawn', () => {
    const c = waypointLayer(all(), [linked]);
    expect(waypointStyle(c, 'wa').getImage()).toBeFalsy();
    c.ngOnChanges({ routes: { currentValue: [] } } as never);
    expect(waypointStyle(c, 'wa').getImage()).toBeTruthy();
  });

  it('keeps label updates working on the function-styled features', () => {
    const c = waypointLayer(all(), [linked]);
    Object.assign(c, { mapZoom: 5 }); // below labelMinZoom: labels hidden
    c.updateLabels();
    expect(waypointStyle(c, 'wa').getText()?.getText()).toBe('');
    expect(waypointStyle(c, 'wb').getText()?.getText()).toBe('');
  });
});
