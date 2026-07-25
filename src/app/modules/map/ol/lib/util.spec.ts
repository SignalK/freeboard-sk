import { describe, it, expect } from 'vitest';
import { mapifyCoords, worldCopyOffset } from './util';
import { Coordinate } from './models';

// EPSG:3857 world width (metres), as OL derives it from the projection extent.
const W = 2 * 20037508.342789244;

describe('worldCopyOffset', () => {
  it('is zero inside the primary world', () => {
    expect(worldCopyOffset(0, W)).toBeCloseTo(0, 3);
    expect(worldCopyOffset(W / 2 - 1, W)).toBeCloseTo(0, 3);
    expect(worldCopyOffset(-(W / 2) + 1, W)).toBeCloseTo(0, 3);
  });

  it('returns +one world width for a click in the copy to the east', () => {
    // 197°E rendered in world +1 sits ~0.55 worlds east of centre.
    const mercX = (197 / 180) * (W / 2);
    expect(worldCopyOffset(mercX, W)).toBeCloseTo(W, 3);
  });

  it('returns -one world width for a click in the copy to the west', () => {
    const mercX = (-197 / 180) * (W / 2);
    expect(worldCopyOffset(mercX, W)).toBeCloseTo(-W, 3);
  });

  it('scales to further copies', () => {
    expect(worldCopyOffset(2.4 * W, W)).toBeCloseTo(2 * W, 3);
    expect(worldCopyOffset(-3.1 * W, W)).toBeCloseTo(-3 * W, 3);
  });

  it('adding the offset to a primary-world point is a whole-world shift', () => {
    // The transparency invariant: the shift is always n·worldWidth, so it moves
    // a point by an exact number of worlds and never leaves the [-180,180] copy
    // once re-normalised.
    for (const x of [0.3 * W, 1.9 * W, -0.7 * W, 5.5 * W]) {
      const n = worldCopyOffset(x, W) / W;
      expect(n).toBeCloseTo(Math.round(n), 6);
    }
  });

  it('returns 0 for non-finite input or a bad world width (never throws)', () => {
    expect(worldCopyOffset(Infinity, W)).toBe(0);
    expect(worldCopyOffset(NaN, W)).toBe(0);
    expect(worldCopyOffset(1000, 0)).toBe(0);
  });
});

/** Longitudes of a coordinate list, for concise assertions. */
const lons = (coords: Array<Coordinate>) => coords.map((c) => c[0]);

/** Largest longitude step between consecutive points. */
const maxStep = (coords: Array<Coordinate>) =>
  coords
    .slice(1)
    .reduce((max, c, i) => Math.max(max, Math.abs(c[0] - coords[i][0])), 0);

describe('mapifyCoords', () => {
  it('returns an empty array for empty input', () => {
    expect(mapifyCoords([])).toEqual([]);
  });

  it('returns a single point unchanged', () => {
    expect(mapifyCoords([[90, 45]])).toEqual([[90, 45]]);
  });

  it('leaves a line that does not cross the antimeridian unchanged', () => {
    const coords: Array<Coordinate> = [
      [0, 0],
      [10, 5],
      [20, 10]
    ];
    expect(mapifyCoords(coords)).toEqual(coords);
  });

  it('unwraps an eastbound crossing to continuous longitudes past +180', () => {
    // 170E -> 170W travelling east is 20 degrees, not 340.
    expect(
      lons(
        mapifyCoords([
          [170, 0],
          [-170, 0]
        ])
      )
    ).toEqual([170, 190]);
  });

  it('unwraps a westbound crossing to continuous longitudes past -180', () => {
    expect(
      lons(
        mapifyCoords([
          [-170, 0],
          [170, 0]
        ])
      )
    ).toEqual([-170, -190]);
  });

  it('unwraps repeated crossings back and forth', () => {
    expect(
      lons(
        mapifyCoords([
          [170, 0],
          [-170, 0],
          [170, 0],
          [-170, 0]
        ])
      )
    ).toEqual([170, 190, 170, 190]);
  });

  it('unwraps relative to the preceding point, not the first point', () => {
    // Each point is resolved against its immediate predecessor, so a line
    // approaching the antimeridian from far away is carried across it rather
    // than shifted a whole world backwards partway along.
    const coords: Array<Coordinate> = [
      [-50, 0],
      [0, 0],
      [50, 0],
      [100, 0],
      [150, 0],
      [170, 0],
      [179, 0],
      [-179, 0]
    ];
    expect(lons(mapifyCoords(coords))).toEqual([
      -50, 0, 50, 100, 150, 170, 179, 181
    ]);
  });

  it('never leaves a step wider than half a world', () => {
    // The invariant the renderer relies on: no segment may span more than 180
    // degrees, or it draws the long way around the globe.
    const coords: Array<Coordinate> = [
      [-50, 10],
      [60, 12],
      [150, 14],
      [179, 16],
      [-179, 18],
      [-100, 20],
      [-20, 22]
    ];
    expect(maxStep(mapifyCoords(coords))).toBeLessThanOrEqual(180);
  });

  it('unwraps a crossing regardless of distance from the antimeridian', () => {
    // A crossing is unwrapped on the size of the step alone, so a sparsely
    // sampled track is carried across however far its samples land from 180.
    expect(
      lons(
        mapifyCoords([
          [160, 0],
          [-160, 0]
        ])
      )
    ).toEqual([160, 200]);
  });

  it('normalises a first point outside [-180, 180]', () => {
    // Anchors the line in the primary world so it stays inside the range
    // OpenLayers replicates into adjacent world copies.
    expect(
      lons(
        mapifyCoords([
          [185, 0],
          [190, 0]
        ])
      )
    ).toEqual([-175, -170]);
  });

  it('preserves an optional third ordinate', () => {
    // A GeoJSON position may carry altitude; only longitude is ever adjusted.
    const result = mapifyCoords([
      [170, 10, 5],
      [-170, 20, 7]
    ]);
    expect(result).toEqual([
      [170, 10, 5],
      [190, 20, 7]
    ]);
  });

  it('shifts a far out-of-range longitude in a single step', () => {
    // Whole turns are removed arithmetically, so an implausible longitude
    // resolves immediately rather than by repeated 360 degree subtraction.
    expect(lons(mapifyCoords([[1e6, 0]]))[0]).toBeGreaterThanOrEqual(-180);
    expect(lons(mapifyCoords([[1e6, 0]]))[0]).toBeLessThanOrEqual(180);
  });

  it('preserves vertex count, order and latitudes', () => {
    // Route editing maps the rendered coordinates 1:1 back onto waypoints, so
    // unwrapping must never add, drop or reorder a vertex.
    const coords: Array<Coordinate> = [
      [175, 10],
      [179, 20],
      [-178, 30],
      [-170, 40]
    ];
    const result = mapifyCoords(coords);
    expect(result).toHaveLength(coords.length);
    expect(result.map((c) => c[1])).toEqual([10, 20, 30, 40]);
  });

  it('does not mutate the input coordinates', () => {
    // The caller retains ownership of its tuples: callers pass cached Signal K
    // resource coordinates in directly, and those must survive rendering.
    const coords: Array<Coordinate> = [
      [170, 0],
      [-170, 0]
    ];
    const snapshot = coords.map((c) => [c[0], c[1]]);
    mapifyCoords(coords);
    expect(coords).toEqual(snapshot);
  });
});
