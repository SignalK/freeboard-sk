import { describe, expect, it } from 'vitest';
import { Feature } from 'ol';
import { LineString } from 'ol/geom';
import RenderFeature from 'ol/render/Feature';
import { fromLonLat } from 'ol/proj';

import { FBMapComponent } from './fb-map.component';

// The route-draw distance read-out follows the sketch being drawn. Exercised on
// a bare prototype instance, as in fb-map.split-tap.spec.ts.

type Position = [number, number];

// Placed points, then OL's floating cursor point on the last one.
const PLACED: Position[] = [
  [23.5, 60.1],
  [23.6, 60.2]
];
const sketch = () =>
  new Feature(new LineString([...PLACED, PLACED[1]].map((p) => fromLonLat(p))));

// A component drawing a route, with OL's drawstart for the sketch dispatched.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawingComponent(drawSketch: Feature): any {
  const cmp = Object.create(FBMapComponent.prototype);
  cmp.app = { data: { map: {} }, debug: (): void => undefined };
  cmp.mapInteract = {
    isMeasuring: () => false,
    isDrawing: () => true,
    isModifying: () => false,
    draw: { resourceType: 'route' },
    coords: undefined as Position[] | undefined,
    set measurementCoords(value: Position[]) {
      this.coords = value;
    }
  };
  cmp.onDrawStart({ feature: drawSketch });
  return cmp;
}

const click = (features: unknown[]) => ({
  features,
  lonlat: PLACED[1],
  worldOffset: 0
});

const expectCoords = (actual: Position[], expected: Position[]) => {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((p, i) => {
    expect(p[0]).toBeCloseTo(expected[i][0], 9);
    expect(p[1]).toBeCloseTo(expected[i][1], 9);
  });
};

describe('FBMapComponent: route draw distance read-out', () => {
  it('measures the sketch, not a saved route under the click', () => {
    const drawn = sketch();
    const cmp = drawingComponent(drawn);
    const saved = new Feature(
      new LineString(
        [
          [23.0, 60.0],
          [23.6, 60.2],
          [24.0, 60.5]
        ].map((p) => fromLonLat(p))
      )
    );

    cmp.onMapSingleClick(click([drawn, saved]));

    expectCoords(cmp.mapInteract.coords, PLACED);
  });

  it('measures the sketch when a vector chart line lies under the click', () => {
    const drawn = sketch();
    const cmp = drawingComponent(drawn);
    const [x, y] = fromLonLat(PLACED[1]);
    const contour = new RenderFeature(
      'LineString',
      [x - 100, y, x + 100, y],
      [4],
      2,
      {},
      undefined
    );

    expect(() => cmp.onMapSingleClick(click([drawn, contour]))).not.toThrow();
    expectCoords(cmp.mapInteract.coords, PLACED);
  });

  it('measures the sketch when the click does not hit it', () => {
    const cmp = drawingComponent(sketch());

    cmp.onMapSingleClick(click([]));

    expectCoords(cmp.mapInteract.coords, PLACED);
  });
});
