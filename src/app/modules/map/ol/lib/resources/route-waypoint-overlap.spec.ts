import { describe, it, expect } from 'vitest';
import { AsyncSubject } from 'rxjs';
import VectorSource from 'ol/source/Vector';
import { Feature } from 'ol';
import { LineString, Point } from 'ol/geom';
import OlMap from 'ol/Map';
import { Circle, Icon, Style, Stroke } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import { FBRoutes, FBWaypoints, RouteStyle } from 'src/app/types';
import { SimpleChange } from '@angular/core';
import { FreeboardRouteLayerComponent } from './layer-routes.component';
import { MapImageRegistry } from '../map-image-registry.service';
import {
  FreeboardWaypointLayerComponent,
  ROUTE_END_HIT_TARGET,
  ROUTE_FLAG_HIT_TARGET,
  iconHitTarget
} from './layer-waypoints.component';
import { drawnTogether, linkedWaypointId } from './route-waypoint-overlap';

/**
 * Where a route point is linked to a waypoint drawn on the same spot, the
 * routes layer and the waypoints layer used to both draw a marker there
 * (#991). Now only one does: the route's own marker at its start and end, the
 * waypoint's icon at every other point. Either marker comes back as soon as
 * the other one isn't drawn there — including mid-edit, when OL Modify has
 * moved the rendered features but nothing has been saved yet.
 *
 * Both layers are built on one stub map through their real ngOnInit (which is
 * how they find each other), with real VectorSources; inputs are fed through
 * ngOnChanges by hand.
 */
type Lonlat = [number, number];
type Meta = Array<{ href?: string; name?: string }> | undefined;
type RouteLayer = FreeboardRouteLayerComponent & { source: VectorSource };
type WaypointLayer = FreeboardWaypointLayerComponent & { source: VectorSource };

const A: Lonlat = [-80.5, 24.9];
const B: Lonlat = [-80.4, 25.0];
const C: Lonlat = [-80.3, 25.1];
const D: Lonlat = [-80.2, 25.2];

const href = (id: string) => `/resources/waypoints/${id}`;
const at = (lonlat: Lonlat) => fromLonLat(lonlat);
const linkAll = (...ids: string[]) => ids.map((id) => ({ href: href(id) }));

function route(
  id: string,
  coords: Lonlat[],
  meta: Meta,
  drawn = true
): FBRoutes[number] {
  return [
    id,
    {
      name: id,
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

function stubMap(): OlMap {
  return {
    addLayer: (): void => undefined,
    removeLayer: (): void => undefined,
    render: (): void => undefined
  } as unknown as OlMap;
}

function routeLayer(map: OlMap, routes: FBRoutes): RouteLayer {
  const c = Object.create(
    FreeboardRouteLayerComponent.prototype
  ) as FreeboardRouteLayerComponent;
  Object.assign(c, {
    mapComponent: { getMap: () => map },
    layerReady: new AsyncSubject(),
    routes,
    labelPrefixes: [],
    labelMinZoom: 10,
    mapZoom: 14,
    routeStyles: {
      default: new Style({ stroke: new Stroke({ color: 'blue', width: 2 }) })
    },
    mapImages: new MapImageRegistry()
  });
  c.ngOnInit();
  return c as RouteLayer;
}

function waypointLayer(
  map: OlMap,
  waypoints: FBWaypoints,
  routeStyle: RouteStyle
): WaypointLayer {
  const c = Object.create(
    FreeboardWaypointLayerComponent.prototype
  ) as FreeboardWaypointLayerComponent;
  Object.assign(c, {
    mapComponent: { getMap: () => map },
    layerReady: new AsyncSubject(),
    waypoints,
    labelPrefixes: [],
    labelMinZoom: 10,
    mapZoom: 14,
    routeStyle,
    mapImages: Object.assign(new MapImageRegistry(), {
      getWaypoint: (): null => null
    })
  });
  c.ngOnInit();
  return c as WaypointLayer;
}

/** Both layers on one map, as the chart has them. */
function scene(
  routes: FBRoutes,
  waypoints: FBWaypoints,
  routeStyle: RouteStyle = 'classic'
) {
  const map = stubMap();
  return {
    map,
    routes: routeLayer(map, routes),
    waypoints: waypointLayer(map, waypoints, routeStyle)
  };
}

/** Positions of route-point markers drawn for route `id` at `resolution`. */
function routeMarkers(
  layer: RouteLayer,
  id = 'r1',
  resolution = 10
): number[][] {
  const f = layer.source.getFeatureById('route.' + id) as Feature;
  const styles = f.getStyleFunction()?.(f, resolution) as Style[];
  return styles
    .map((s) => s.getGeometry())
    .filter((g): g is Point => g instanceof Point)
    .map((g) => g.getCoordinates());
}

/** Give the waypoint layer a symbol provider overriding only the route end. */
function endOverride(layer: WaypointLayer, provided: Icon) {
  Object.assign(layer, {
    mapImages: Object.assign(new MapImageRegistry(), {
      getWaypoint: (): null => null,
      getExternalSymbol: (id: string) => (id === 'route-end' ? provided : null)
    })
  });
}

/** The styles waypoint `id` is drawn with at `resolution`. */
function waypointStyles(
  layer: WaypointLayer,
  id: string,
  resolution = 10
): Style[] {
  const f = layer.source.getFeatureById('waypoint.' + id) as Feature;
  const s = f.getStyleFunction()?.(f, resolution) as Style | Style[];
  return Array.isArray(s) ? s : [s];
}

/** The (first) style waypoint `id` is drawn with at `resolution`. */
function waypointStyle(layer: WaypointLayer, id: string, resolution = 10) {
  return waypointStyles(layer, id, resolution)[0];
}

/** Whether waypoint `id` shows a visible icon (not just its hit target). */
function iconShown(layer: WaypointLayer, id: string, resolution = 10) {
  const img = waypointStyle(layer, id, resolution).getImage();
  return !!img && img !== ROUTE_END_HIT_TARGET && img !== ROUTE_FLAG_HIT_TARGET;
}

function routeGeometry(layer: RouteLayer, id = 'r1') {
  return (
    layer.source.getFeatureById('route.' + id) as Feature
  ).getGeometry() as LineString;
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

describe('one marker where a route point meets its waypoint (#991)', () => {
  it('leaves both layers alone when the route has no waypoint links', () => {
    const s = scene([route('r1', [A, B, C], undefined)], [waypoint('wb', B)]);
    expect(routeMarkers(s.routes)).toEqual([at(A), at(B), at(C)]);
    expect(iconShown(s.waypoints, 'wb')).toBe(true);
  });

  it('shows the route marker at the ends and the waypoint icon in between', () => {
    const s = scene(
      [route('r1', [A, B, C], linkAll('wa', 'wb', 'wc'))],
      [waypoint('wa', A), waypoint('wb', B), waypoint('wc', C)]
    );
    expect(routeMarkers(s.routes)).toEqual([at(A), at(C)]);
    expect(iconShown(s.waypoints, 'wa')).toBe(false);
    expect(iconShown(s.waypoints, 'wb')).toBe(true);
    expect(iconShown(s.waypoints, 'wc')).toBe(false);
  });

  it('keeps an end waypoint clickable and labelled next to the route marker', () => {
    const s = scene(
      [route('r1', [A, B], linkAll('wa', 'wb'))],
      [waypoint('wa', A)]
    );
    const style = waypointStyle(s.waypoints, 'wa');
    // an invisible image is still hit-detected by OL
    expect(style.getImage()).toBeTruthy();
    expect(style.getText()?.getText()).toBe('wa');
    expect(style.getText()?.getOffsetY()).toBe(-12);
  });

  it('keeps the waypoint label above a route end flag, clickable over the flag', () => {
    const s = scene(
      [route('r1', [A, B], linkAll('wa', 'wb'))],
      [waypoint('wa', A)],
      'flags'
    );
    const style = waypointStyle(s.waypoints, 'wa');
    const base = s.waypoints.source
      .getFeatureById('waypoint.wa')
      ?.get('baseStyle') as Style;
    expect(style.getImage()).toBe(ROUTE_FLAG_HIT_TARGET);
    expect(style.getText()?.getText()).toBe('wa');
    expect(style.getText()).toBe(base.getText());
  });

  it('covers each route end with the hit target for its own marker', () => {
    // only the end has a provider icon, a centred 24 px one: the bundled
    // flag's target would miss its lower left
    const provided = new Icon({
      src: './custom-end.svg',
      size: [24, 24],
      anchor: [12, 12],
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels'
    });
    for (const style of ['flags', 'classic'] as RouteStyle[]) {
      const s = scene(
        [route('r1', [A, B], linkAll('wa', 'wb'))],
        [waypoint('wa', A), waypoint('wb', B)],
        style
      );
      endOverride(s.waypoints, provided);
      const atEnd = waypointStyle(s.waypoints, 'wb');
      const img = atEnd.getImage() as Circle;
      expect(img).toBe(iconHitTarget(provided));
      const [dx, dy] = img.getDisplacement();
      expect(dx).toBeCloseTo(0);
      expect(dy).toBeCloseTo(0);
      expect(img.getRadius()).toBeCloseTo(Math.hypot(24, 24) / 2);
      expect(atEnd.getText()?.getText()).toBe('wb');

      // the start keeps the target for the marker drawn there
      const atStart = waypointStyle(s.waypoints, 'wa');
      expect(atStart.getImage()).toBe(
        style === 'flags' ? ROUTE_FLAG_HIT_TARGET : ROUTE_END_HIT_TARGET
      );
      const base = s.waypoints.source
        .getFeatureById('waypoint.wa')
        ?.get('baseStyle') as Style;
      if (style === 'flags') {
        expect(atStart.getText()).toBe(base.getText());
      } else {
        expect(atStart.getText()?.getOffsetY()).toBe(-12);
      }
    }
  });

  it('covers every marker at a waypoint shared by several route ends', () => {
    const provided = new Icon({
      src: './custom-end.svg',
      size: [24, 24],
      anchor: [12, 12],
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels'
    });
    // r1 ends at wb and r2 starts there
    const s = scene(
      [
        route('r1', [A, B], linkAll('wa', 'wb')),
        route('r2', [B, C], linkAll('wb', 'wc'))
      ],
      [waypoint('wb', B)],
      'flags'
    );
    endOverride(s.waypoints, provided);
    const styles = waypointStyles(s.waypoints, 'wb');
    const images = styles.map((st) => st.getImage());
    expect(images).toHaveLength(2);
    expect(images).toContain(ROUTE_FLAG_HIT_TARGET);
    expect(images).toContain(iconHitTarget(provided));
    // one label only
    expect(styles.filter((st) => st.getText()).length).toBe(1);
  });

  it('places a provider icon hit target over an icon anchored at its foot', () => {
    const flag = new Icon({
      src: './custom-start.svg',
      size: [20, 40],
      anchor: [0, 40],
      scale: 0.5,
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels'
    });
    const target = iconHitTarget(flag);
    expect(target?.getDisplacement()).toEqual([5, 10]);
    expect(target?.getRadius()).toBeCloseTo(Math.hypot(10, 20) / 2);
  });

  it('restyles the waypoints when the route style changes', () => {
    const s = scene(
      [route('r1', [A, B], linkAll('wa', 'wb'))],
      [waypoint('wa', A)]
    );
    let changed = 0;
    s.waypoints.source.on('change', () => changed++);
    Object.assign(s.waypoints, { routeStyle: 'flags' });
    s.waypoints.ngOnChanges({
      routeStyle: new SimpleChange('classic', 'flags', false)
    });
    expect(changed).toBe(1);
    expect(waypointStyle(s.waypoints, 'wa').getImage()).toBe(
      ROUTE_FLAG_HIT_TARGET
    );
  });

  it('skips only the linked intermediate points on a mixed route', () => {
    const s = scene(
      [
        route(
          'r1',
          [A, B, C, D],
          [{}, { href: href('wb') }, { name: 'plain' }, {}]
        )
      ],
      [waypoint('wb', B)]
    );
    expect(routeMarkers(s.routes)).toEqual([at(A), at(C), at(D)]);
  });

  it('keeps the route marker when the linked waypoint is not drawn or missing', () => {
    const s = scene(
      [
        route(
          'r1',
          [A, B, C, D],
          [{}, { href: href('wb') }, { href: href('gone') }, {}]
        )
      ],
      [waypoint('wb', B, false)]
    );
    expect(routeMarkers(s.routes)).toEqual([at(A), at(B), at(C), at(D)]);
  });

  it('keeps both markers when the waypoint has moved away from the point', () => {
    // ~110 m apart: separate at 10 m/px, on top of each other at 100 m/px
    const moved: Lonlat = [B[0], B[1] + 0.001];
    const s = scene(
      [route('r1', [A, B, C], [{}, { href: href('wb') }, {}])],
      [waypoint('wb', moved)]
    );
    expect(routeMarkers(s.routes, 'r1', 10)).toEqual([at(A), at(B), at(C)]);
    expect(routeMarkers(s.routes, 'r1', 100)).toEqual([at(A), at(C)]);
  });

  it('matches a waypoint on a route drawn across the antimeridian', () => {
    const s = scene(
      [
        route(
          'r1',
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
    expect(routeMarkers(s.routes)).toEqual([
      at([179.5, -17]),
      at([180.5, -17])
    ]);
  });

  it('draws one marker for a waypoint that ends one route and is mid-way on another', () => {
    const s = scene(
      [
        route('r1', [A, B, C], linkAll('wa', 'wb', 'wc')),
        route('r2', [D, B], linkAll('wd', 'wb'))
      ],
      [waypoint('wb', B)]
    );
    expect(routeMarkers(s.routes, 'r1')).toEqual([at(A), at(C)]);
    expect(routeMarkers(s.routes, 'r2')).toEqual([at(D), at(B)]);
    expect(iconShown(s.waypoints, 'wb')).toBe(false);
  });

  it('brings route markers back when the waypoints stop being drawn', () => {
    const s = scene(
      [route('r1', [A, B, C], [{}, { href: href('wb') }, {}])],
      [waypoint('wb', B)]
    );
    expect(routeMarkers(s.routes)).toEqual([at(A), at(C)]);

    const before = s.routes.source.getRevision();
    s.waypoints.ngOnChanges({
      waypoints: { currentValue: [waypoint('wb', B, false)] }
    } as never);
    expect(s.routes.source.getRevision()).toBeGreaterThan(before);
    expect(routeMarkers(s.routes)).toEqual([at(A), at(B), at(C)]);
  });

  it('brings the waypoint icon back when the route stops being drawn', () => {
    const s = scene(
      [route('r1', [A, B], linkAll('wa', 'wb'))],
      [waypoint('wa', A)]
    );
    expect(iconShown(s.waypoints, 'wa')).toBe(false);

    const before = s.waypoints.source.getRevision();
    s.routes.ngOnChanges({ routes: { currentValue: [] } } as never);
    expect(s.waypoints.source.getRevision()).toBeGreaterThan(before);
    expect(iconShown(s.waypoints, 'wa')).toBe(true);
  });

  it('brings the other layer back when a layer is destroyed', () => {
    const s = scene(
      [route('r1', [A, B], linkAll('wa', 'wb'))],
      [waypoint('wa', A)]
    );
    s.routes.ngOnDestroy();
    expect(iconShown(s.waypoints, 'wa')).toBe(true);
  });

  it('does not reach a layer on another map', () => {
    const s = scene([], [waypoint('wb', B)]);
    const other = routeLayer(stubMap(), [
      route('r1', [A, B, C], [{}, { href: href('wb') }, {}])
    ]);
    expect(routeMarkers(other)).toEqual([at(A), at(B), at(C)]);
    expect(iconShown(s.waypoints, 'wb')).toBe(true);
  });

  it('keeps label updates working on the function-styled waypoints', () => {
    const s = scene(
      [route('r1', [A, B], linkAll('wa', 'wb'))],
      [waypoint('wa', A), waypoint('wc', C)]
    );
    Object.assign(s.waypoints, { mapZoom: 5 }); // below labelMinZoom
    s.waypoints.updateLabels();
    expect(waypointStyle(s.waypoints, 'wa').getText()?.getText()).toBe('');
    expect(waypointStyle(s.waypoints, 'wc').getText()?.getText()).toBe('');
  });
});

describe('one marker per point while editing, before anything is saved (#991)', () => {
  it('shows the waypoint icon again when a route end is dragged off it', () => {
    const s = scene(
      [route('r1', [A, B], linkAll('wa', 'wb'))],
      [waypoint('wa', A)]
    );
    expect(iconShown(s.waypoints, 'wa')).toBe(false);

    const before = s.waypoints.source.getRevision();
    routeGeometry(s.routes).setCoordinates([at(D), at(B)]); // what Modify does
    expect(s.waypoints.source.getRevision()).toBeGreaterThan(before);
    expect(iconShown(s.waypoints, 'wa')).toBe(true);
  });

  it('keeps one marker at the old end when the route is extended past it', () => {
    const s = scene(
      [route('r1', [A, B], linkAll('wa', 'wb'))],
      [waypoint('wb', B)]
    );
    const f = s.routes.source.getFeatureById('route.r1') as Feature;
    // the route-extend path: new geometry plus length-aligned metadata
    f.set('pointMetadata', [...linkAll('wa', 'wb'), {}]);
    routeGeometry(s.routes).setCoordinates([at(A), at(B), at(C)]);
    expect(routeMarkers(s.routes)).toEqual([at(A), at(C)]);
    expect(iconShown(s.waypoints, 'wb')).toBe(true);
  });

  it('shows the route marker again when a waypoint is dragged off its point', () => {
    const s = scene(
      [route('r1', [A, B, C], [{}, { href: href('wb') }, {}])],
      [waypoint('wb', B)]
    );
    expect(routeMarkers(s.routes)).toEqual([at(A), at(C)]);

    const before = s.routes.source.getRevision();
    const wf = s.waypoints.source.getFeatureById('waypoint.wb') as Feature;
    (wf.getGeometry() as Point).setCoordinates(at(D)); // what Modify does
    expect(s.routes.source.getRevision()).toBeGreaterThan(before);
    expect(routeMarkers(s.routes)).toEqual([at(A), at(B), at(C)]);
  });

  it('keeps one marker at a route end while a vertex is inserted, and after', () => {
    const s = scene(
      [route('r1', [A, C], linkAll('wa', 'wc'))],
      [waypoint('wc', C)]
    );
    const f = s.routes.source.getFeatureById('route.r1') as Feature;
    // mid-drag: Modify has inserted a vertex, the metadata has not caught up
    routeGeometry(s.routes).setCoordinates([at(A), at(B), at(C)]);
    expect(iconShown(s.waypoints, 'wc')).toBe(false);
    expect(routeMarkers(s.routes)).toEqual([at(A), at(B), at(C)]);

    // modifyend: the metadata is realigned in place, then the feature is
    // marked changed so the waypoint layer re-renders
    const before = s.waypoints.source.getRevision();
    (f.get('pointMetadata') as object[]).splice(1, 0, {});
    f.changed();
    expect(s.waypoints.source.getRevision()).toBeGreaterThan(before);
    expect(iconShown(s.waypoints, 'wc')).toBe(false);
  });
});
