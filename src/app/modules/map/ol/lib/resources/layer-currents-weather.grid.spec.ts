import { describe, it, expect } from 'vitest';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';

import {
  buildCurrentSampleGrid,
  LayerCurrentsWeatherComponent
} from './layer-currents-weather.component';

const COLUMNS = 10;
const ROWS = 8;

// A deterministic stand-in for ol's toLonLat so the grid maths can be tested
// without a map/projection. Treats the projected coords as already lon/lat.
const identity = (c: number[]) => c;

// cellWidth = (11 - 10) / 10 = 0.1 ; cellHeight = (0.8 - 0) / 8 = 0.1
const EXTENT = [10, 0, 11, 0.8];

describe('buildCurrentSampleGrid (#522 request de-duplication)', () => {
  it('produces a columns × rows grid', () => {
    const points = buildCurrentSampleGrid(EXTENT, COLUMNS, ROWS, identity);
    expect(points).toHaveLength(COLUMNS * ROWS);
  });

  it('yields the identical grid for a sub-cell pan (so small moves de-dup)', () => {
    const base = buildCurrentSampleGrid(EXTENT, COLUMNS, ROWS, identity);
    // Pan by 0.03 — less than the 0.1 cell size — must snap to the same lattice.
    const nudged = buildCurrentSampleGrid(
      [EXTENT[0] + 0.03, EXTENT[1] + 0.03, EXTENT[2] + 0.03, EXTENT[3] + 0.03],
      COLUMNS,
      ROWS,
      identity
    );
    expect(nudged).toEqual(base);
  });

  it('yields a different grid once the pan crosses a cell boundary', () => {
    const base = buildCurrentSampleGrid(EXTENT, COLUMNS, ROWS, identity);
    // Pan by 0.2 — two cells — must move to a new lattice.
    const moved = buildCurrentSampleGrid(
      [EXTENT[0] + 0.2, EXTENT[1] + 0.2, EXTENT[2] + 0.2, EXTENT[3] + 0.2],
      COLUMNS,
      ROWS,
      identity
    );
    expect(moved).not.toEqual(base);
  });

  it('normalises wrapped longitudes into [-180, 180]', () => {
    const points = buildCurrentSampleGrid(EXTENT, COLUMNS, ROWS, ([, y]) => [
      190,
      y
    ]);
    expect(points.every((p) => p.longitude === -170)).toBe(true);
  });

  it('drops points beyond the Web Mercator latitude limit', () => {
    const points = buildCurrentSampleGrid(EXTENT, COLUMNS, ROWS, ([x]) => [
      x,
      88
    ]);
    expect(points).toEqual([]);
  });

  it('returns no points for a degenerate (zero-area) extent', () => {
    expect(
      buildCurrentSampleGrid([10, 0, 10, 0], COLUMNS, ROWS, identity)
    ).toEqual([]);
  });
});

describe('LayerCurrentsWeatherComponent stale-arrow clearing (#522)', () => {
  it('clears previously rendered arrows when the viewport yields no points', () => {
    const component = new LayerCurrentsWeatherComponent(
      {} as never,
      {} as never,
      {} as never,
      { detach: () => undefined } as never
    );
    component.show = true;
    const source = new VectorSource();
    source.addFeature(new Feature(new Point([0, 0])));
    (component as never as { source: VectorSource }).source = source;

    (
      component as never as {
        fetchCurrents: (p: unknown[]) => { subscribe: () => void };
      }
    )
      .fetchCurrents([])
      .subscribe();

    expect(source.getFeatures()).toHaveLength(0);
  });
});
