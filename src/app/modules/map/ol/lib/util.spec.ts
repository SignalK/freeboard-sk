import { describe, it, expect } from 'vitest';
import { mapifyCoords } from './util';
import { Coordinate } from './models';

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
    // Regression: the previous implementation compared every point against
    // coords[0], so a line approaching the antimeridian from far away was
    // shifted a whole world backwards partway along.
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
    // Previously only points within 10 degrees of the antimeridian were
    // considered, so a sparsely sampled track stepped straight over it.
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
    // Regression: the previous implementation wrote longitudes back through the
    // caller's tuples, corrupting the cached Signal K resource coordinates that
    // callers pass in directly.
    const coords: Array<Coordinate> = [
      [170, 0],
      [-170, 0]
    ];
    const snapshot = coords.map((c) => [c[0], c[1]]);
    mapifyCoords(coords);
    expect(coords).toEqual(snapshot);
  });
});
