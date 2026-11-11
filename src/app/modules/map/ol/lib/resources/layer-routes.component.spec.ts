import { describe, it, expect } from 'vitest';
import { SimpleChange } from '@angular/core';
import VectorSource from 'ol/source/Vector';
import { Feature } from 'ol';
import { LineString } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { Circle, Icon, RegularShape, Stroke, Style } from 'ol/style';
import type { RouteStyle } from 'src/app/types';
import { FreeboardRouteLayerComponent } from './layer-routes.component';
import {
  MapImageRegistry,
  ROUTE_MARKER_START
} from '../map-image-registry.service';

/**
 * The "Route style" setting picks how route points are marked: 'flags' draws
 * the bundled start flag, waypoint pins and end flag; 'classic' draws small
 * shapes in the route line's colour. A symbol-provider override replaces a
 * marker in either style.
 */
const LINE_COLOUR = 'rgb(0, 0, 255)';

function routeLayer(
  routeStyle: RouteStyle,
  mapImages = new MapImageRegistry()
) {
  const c = Object.create(
    FreeboardRouteLayerComponent.prototype
  ) as FreeboardRouteLayerComponent;
  Object.assign(c, {
    mapComponent: { getMap: (): undefined => undefined },
    routeStyles: {
      default: new Style({ stroke: new Stroke({ color: LINE_COLOUR }) })
    },
    routeStyle,
    mapImages
  });
  return c;
}

/** Marker images for a three-point route: [start, waypoint, end]. */
function markers(layer: FreeboardRouteLayerComponent) {
  const f = new Feature(
    new LineString([
      fromLonLat([-80.5, 24.9]),
      fromLonLat([-80.4, 25.0]),
      fromLonLat([-80.3, 25.1])
    ])
  );
  f.setId('route.r1');
  return (layer.buildStyle(f, 10) as Style[]).slice(1).map((s) => s.getImage());
}

const src = (img: unknown) => (img as Icon).getSrc();

describe('route markers by route style', () => {
  it('draws flags and a bearing-rotated pin in the flags style', () => {
    const [start, wpt, end] = markers(routeLayer('flags'));
    expect(src(start)).toContain('routes/route-start.svg');
    expect(src(wpt)).toContain('routes/route-waypoint.svg');
    expect(wpt?.getRotateWithView()).toBe(true);
    expect(wpt?.getRotation()).not.toBe(0);
    expect(src(end)).toContain('routes/route-end.svg');
  });

  it('draws shapes in the route line colour in the classic style', () => {
    const [start, wpt, end] = markers(routeLayer('classic'));
    expect(start).toBeInstanceOf(Circle);
    expect(wpt).toBeInstanceOf(RegularShape);
    expect(end).toBeInstanceOf(RegularShape);
    expect((start as Circle).getFill()?.getColor()).toBe(LINE_COLOUR);
    expect((end as RegularShape).getFill()?.getColor()).toBe(LINE_COLOUR);
  });

  it('uses a symbol-provider override in either style', () => {
    for (const style of ['flags', 'classic'] as RouteStyle[]) {
      const reg = new MapImageRegistry();
      reg.registerSymbolMarker(ROUTE_MARKER_START, {
        path: './custom-start.svg'
      });
      const [start] = markers(routeLayer(style, reg));
      expect(src(start)).toContain('custom-start.svg');
    }
  });

  it('redraws the markers when the route style changes', () => {
    const layer = routeLayer('flags');
    const source = new VectorSource();
    let changed = 0;
    source.on('change', () => changed++);
    Object.assign(layer, { source });
    layer.ngOnChanges({
      routeStyle: new SimpleChange('flags', 'classic', false)
    });
    expect(changed).toBe(1);
  });
});
