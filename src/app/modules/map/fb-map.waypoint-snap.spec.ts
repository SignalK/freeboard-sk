import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Collection, Feature } from 'ol';
import { LineString, Point } from 'ol/geom';
import OlMap from 'ol/Map';
import VectorSource from 'ol/source/Vector';

import { FBMapComponent } from './fb-map.component';
import { joinOverlap } from './ol/lib/resources/route-waypoint-overlap';

// A route point snapped onto a waypoint is linked to it when the draw, the
// Modify drag or the click-to-extend ends (#881). Exercised on a bare prototype
// instance, as in fb-map.pointer-down.spec.ts, over a stub map with one
// waypoint drawn at render coordinate [1000, 500] (pixel [100, 50]).

const RES = 10;
const WP = [1000, 500];
const ALPHA = {
  name: 'Alpha',
  description: 'Fuel dock',
  href: '/resources/waypoints/a'
};

function stubMap() {
  return {
    get: (): void => undefined,
    getView: () => ({ getResolution: () => RES }),
    getCoordinateFromPixel: (p: number[]) => [p[0] * RES, p[1] * RES],
    getPixelFromCoordinate: (c: number[]) => [c[0] / RES, c[1] / RES],
    forEachFeatureAtPixel: (): void => undefined,
    getFeaturesAtPixel: (): unknown[] => []
  } as unknown as OlMap;
}

let map: OlMap;
let leave: () => void;

beforeEach(() => {
  map = stubMap();
  const source = new VectorSource();
  const wpt = new Feature(new Point(WP));
  wpt.setId('waypoint.a');
  source.addFeature(wpt);
  leave = joinOverlap(map, 'waypoints', source);
});

afterEach(() => leave());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function bareComponent(draw: Record<string, unknown>): any {
  const cmp = Object.create(FBMapComponent.prototype);
  cmp.olMap = { getMap: () => map };
  cmp.waypointLookup = (id: string) =>
    id === 'a' ? { name: 'Alpha', description: 'Fuel dock' } : undefined;
  cmp.ngZone = { run: (fn: () => void) => fn() };
  cmp.drawEnded = { emit: vi.fn() };
  cmp.app = { data: {}, debug: vi.fn() };
  cmp.mapInteract = {
    draw,
    stopDrawing: vi.fn(),
    pushModifyUndo: vi.fn()
  };
  return cmp;
}

function routeFeature(coords: number[][], meta?: unknown[]) {
  const f = new Feature(new LineString(coords));
  f.setId('route.r1');
  if (meta) {
    f.set('pointMetadata', meta);
  }
  return f;
}

describe('FBMapComponent: linking route points snapped onto waypoints', () => {
  it('links the drawn points that lie on a waypoint when the draw ends', () => {
    const cmp = bareComponent({ resourceType: 'route' });
    cmp.onDrawEnd({
      feature: new Feature(new LineString([[0, 0], [...WP], [2000, 0]]))
    });
    expect(cmp.mapInteract.draw.coordsMetadata).toEqual([
      { name: '' },
      ALPHA,
      { name: '' }
    ]);
  });

  it('links a vertex dragged onto a waypoint, on a route with no metadata', () => {
    const before = [
      [0, 0],
      [900, 400],
      [2000, 0]
    ];
    const f = routeFeature([[0, 0], [...WP], [2000, 0]]);
    const cmp = bareComponent({
      coordinates: before,
      forSave: { id: 'route.r1', coords: null }
    });
    cmp.applyModifyEnd({ features: new Collection([f]) });
    const linked = [{ name: '' }, ALPHA, { name: '' }];
    expect(cmp.mapInteract.draw.forSave.coordsMetadata).toEqual(linked);
    expect(f.get('pointMetadata')).toEqual(linked);
  });

  it('leaves the links alone when a vertex is dragged into open water', () => {
    const meta = [{ name: 'Start' }, { name: '' }];
    const f = routeFeature(
      [
        [0, 0],
        [3000, 3000]
      ],
      meta
    );
    const cmp = bareComponent({
      coordinates: [
        [0, 0],
        [2000, 2000]
      ],
      forSave: { id: 'route.r1', coords: null, coordsMetadata: meta }
    });
    cmp.applyModifyEnd({ features: new Collection([f]) });
    expect(cmp.mapInteract.draw.forSave.coordsMetadata).toEqual([
      { name: 'Start' },
      { name: '' }
    ]);
  });

  it('appends the waypoint itself when click-to-extend lands on its marker', () => {
    const f = routeFeature(
      [
        [0, 0],
        [500, 0]
      ],
      [{ name: '' }, { name: '' }]
    );
    const cmp = bareComponent({
      features: new Collection([f]),
      forSave: { id: null, coords: null }
    });
    cmp.extendRouteInModify({
      pixel: [104, 53],
      lonlat: [0, 0],
      originalEvent: { pointerType: 'mouse' }
    });
    expect((f.getGeometry() as LineString).getLastCoordinate()).toEqual(WP);
    expect(cmp.mapInteract.draw.forSave.coordsMetadata).toEqual([
      { name: '' },
      { name: '' },
      ALPHA
    ]);
  });
});
