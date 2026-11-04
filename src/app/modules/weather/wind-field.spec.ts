import { describe, expect, it } from 'vitest';
import { fromLonLat } from 'ol/proj';

import {
  WIND_COLOR_MAX,
  WIND_COLOR_STOPS,
  WindField,
  WindGrid,
  windColor,
  windGridFor,
  windGridNodes,
  windVector
} from './wind-field';

/** A projected extent from lon/lat corners. */
function extent(west: number, south: number, east: number, north: number) {
  return [...fromLonLat([west, south]), ...fromLonLat([east, north])];
}

describe('windGridFor', () => {
  it('covers the view with one node of margin, snapped to the step', () => {
    const grid = windGridFor(extent(-5.1, 46.1, -1.1, 48.9))!;
    expect(grid.step).toBe(0.25);
    expect(grid.lon0).toBe(-5.5);
    expect(grid.lat0).toBe(45.75);
    expect(grid.lon0 + (grid.cols - 1) * grid.step).toBe(-0.75);
    expect(grid.lat0 + (grid.rows - 1) * grid.step).toBe(49.25);
  });

  it('keeps the same nodes for a small pan', () => {
    const a = windGridFor(extent(-5.1, 46.1, -1.1, 48.9));
    const b = windGridFor(extent(-5.05, 46.15, -1.05, 48.95));
    expect(b).toEqual(a);
  });

  it('widens the step so the view stays within the column budget', () => {
    const grid = windGridFor(extent(-40, 20, 20, 60), 16)!;
    expect(grid.step).toBe(4);
    expect(grid.cols).toBeLessThanOrEqual(16 + 3);
  });

  it('stops at the poles and at the edge of Web Mercator', () => {
    const grid = windGridFor([-20037508, -20037508, 20037508, 20037508])!;
    expect(grid.lat0).toBeGreaterThanOrEqual(-90);
    expect(grid.lat0 + (grid.rows - 1) * grid.step).toBeLessThanOrEqual(90);
  });

  it('covers a view in the last few hundredths of a degree of Web Mercator', () => {
    expect(windGridFor(extent(10, 85.01, 12, 85.04))).not.toBeNull();
  });

  it('returns null for an empty extent', () => {
    expect(windGridFor([0, 0, 0, 0])).toBeNull();
  });
});

describe('windGridNodes', () => {
  it('lists nodes row by row from the south-west corner', () => {
    const grid: WindGrid = { lon0: 2, lat0: 40, step: 0.5, cols: 2, rows: 2 };
    expect(windGridNodes(grid)).toEqual([
      { latitude: 40, longitude: 2 },
      { latitude: 40, longitude: 2.5 },
      { latitude: 40.5, longitude: 2 },
      { latitude: 40.5, longitude: 2.5 }
    ]);
  });

  it('asks for the pole for a row past it on a coarse grid', () => {
    const grid: WindGrid = { lon0: 0, lat0: -16, step: 16, cols: 1, rows: 8 };
    const latitudes = windGridNodes(grid).map((n) => n.latitude);
    expect(latitudes).toEqual([-16, 0, 16, 32, 48, 64, 80, 90]);
  });

  it('normalises longitudes of another world copy for the data source', () => {
    const grid: WindGrid = {
      lon0: 179.5,
      lat0: 0,
      step: 0.5,
      cols: 3,
      rows: 1
    };
    expect(windGridNodes(grid).map((n) => n.longitude)).toEqual([
      179.5, -180, -179.5
    ]);
  });
});

describe('windVector', () => {
  it('turns a "from" direction into the way the wind flows', () => {
    const [u, v] = windVector(10, 0); // northerly: flows south
    expect(u).toBeCloseTo(0, 9);
    expect(v).toBeCloseTo(-10, 9);
    const [u2, v2] = windVector(10, 270); // westerly: flows east
    expect(u2).toBeCloseTo(10, 9);
    expect(v2).toBeCloseTo(0, 9);
  });
});

describe('WindField', () => {
  const grid: WindGrid = { lon0: 0, lat0: 0, step: 1, cols: 2, rows: 2 };
  const westerly = (speed: number) => ({ speed, direction: 270 });

  it('interpolates smoothly between nodes', () => {
    // Wind growing steadily eastwards: the curve reproduces it exactly.
    const ramp = new WindField(
      { lon0: 0, lat0: 0, step: 1, cols: 4, rows: 2 },
      [0, 10, 20, 30, 0, 10, 20, 30].map(westerly)
    );
    const out = [0, 0];
    expect(ramp.sample(1.25, 0.5, out)).toBe(true);
    expect(out[0]).toBeCloseTo(12.5, 5);
    expect(out[1]).toBeCloseTo(0, 5);
  });

  it('never overshoots the corners of the cell', () => {
    // Two calm nodes beside a strong one: the plain curve would turn the
    // wind round between them.
    const field = new WindField(
      { lon0: 0, lat0: 0, step: 1, cols: 4, rows: 2 },
      [0, 0, 0, 20, 0, 0, 0, 20].map(westerly)
    );
    const out = [0, 0];
    expect(field.sample(1.5, 0.5, out)).toBe(true);
    expect(out[0]).toBeCloseTo(0, 9);
  });

  it('falls back to the nearest four nodes next to a node without data', () => {
    const field = new WindField(
      { lon0: 0, lat0: 0, step: 1, cols: 3, rows: 2 },
      [null, westerly(4), westerly(8), null, westerly(4), westerly(8)]
    );
    const out = [0, 0];
    expect(field.sample(1.5, 0.5, out)).toBe(true);
    expect(out[0]).toBeCloseTo(6, 5);
  });

  it('has no wind outside the grid or next to a node without data', () => {
    const out = [0, 0];
    const full = new WindField(grid, [
      westerly(5),
      westerly(5),
      westerly(5),
      westerly(5)
    ]);
    expect(full.sample(-0.1, 0.5, out)).toBe(false);
    expect(full.sample(0.5, 1.1, out)).toBe(false);

    const gap = new WindField(grid, [
      westerly(5),
      null,
      westerly(5),
      westerly(5)
    ]);
    expect(gap.sample(0.5, 0.5, out)).toBe(false);
  });

  it('samples from a projected coordinate', () => {
    const field = new WindField(grid, [
      westerly(4),
      westerly(4),
      westerly(4),
      westerly(4)
    ]);
    const out = [0, 0];
    const [x, y] = fromLonLat([0.5, 0.5]);
    expect(field.sampleAt(x, y, out)).toBe(true);
    expect(out[0]).toBeCloseTo(4, 5);
  });
});

describe('windColor', () => {
  it('pins both ends of the scale and blends in between', () => {
    expect(windColor(-1, [0, 0, 0])).toEqual([...WIND_COLOR_STOPS[0][1]]);
    expect(windColor(WIND_COLOR_MAX + 10, [0, 0, 0])).toEqual([
      ...WIND_COLOR_STOPS[WIND_COLOR_STOPS.length - 1][1]
    ]);
    const [s0, c0] = WIND_COLOR_STOPS[0];
    const [s1, c1] = WIND_COLOR_STOPS[1];
    expect(windColor((s0 + s1) / 2, [0, 0, 0])).toEqual(
      c0.map((c, i) => Math.round((c + c1[i]) / 2))
    );
  });
});
