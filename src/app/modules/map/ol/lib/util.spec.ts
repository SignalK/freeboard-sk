import { describe, it, expect } from 'vitest';
import { mapifyCoords, splitAtAntimeridian } from './util';

// ---------------------------------------------------------------------------
// splitAtAntimeridian
// ---------------------------------------------------------------------------

describe('splitAtAntimeridian', () => {
  it('returns [] for empty input', () => {
    expect(splitAtAntimeridian([])).toEqual([]);
  });

  it('wraps a single point in one segment', () => {
    const result = splitAtAntimeridian([[0, 45]]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([[0, 45]]);
  });

  it('returns one segment when no antimeridian is crossed', () => {
    const segs = splitAtAntimeridian([[0, 0], [10, 0], [20, 0]]);
    expect(segs).toHaveLength(1);
    expect(segs[0]).toEqual([[0, 0], [10, 0], [20, 0]]);
  });

  it('splits an eastbound crossing (179°E → 179°W, crossing at +180°)', () => {
    // dLon = -179 - 179 = -358 < -180 → eastward branch
    const segs = splitAtAntimeridian([[179, 0], [-179, 0]]);
    expect(segs).toHaveLength(2);
    expect(segs[0][0]).toEqual([179, 0]);
    expect(segs[0][segs[0].length - 1][0]).toBe(180);
    expect(segs[1][0][0]).toBe(-180);
    expect(segs[1][segs[1].length - 1]).toEqual([-179, 0]);
    // Both boundary points share the same interpolated latitude
    expect(segs[0][segs[0].length - 1][1]).toBeCloseTo(segs[1][0][1], 10);
  });

  it('splits a westbound crossing (179°W → 179°E, crossing at -180°)', () => {
    // dLon = 179 - (-179) = 358 > 180 → westward branch
    const segs = splitAtAntimeridian([[-179, 0], [179, 0]]);
    expect(segs).toHaveLength(2);
    expect(segs[0][0]).toEqual([-179, 0]);
    expect(segs[0][segs[0].length - 1][0]).toBe(-180);
    expect(segs[1][0][0]).toBe(180);
    expect(segs[1][segs[1].length - 1]).toEqual([179, 0]);
    expect(segs[0][segs[0].length - 1][1]).toBeCloseTo(segs[1][0][1], 10);
  });

  it('handles a large longitude span eastbound crossing', () => {
    // 170°E → 170°W: dLon = -340, well past the -180 threshold
    const segs = splitAtAntimeridian([[170, 45], [-170, 45]]);
    expect(segs).toHaveLength(2);
    expect(segs[0][0]).toEqual([170, 45]);
    expect(segs[0][segs[0].length - 1][0]).toBe(180);
    expect(segs[1][0][0]).toBe(-180);
    expect(segs[1][segs[1].length - 1]).toEqual([-170, 45]);
    // Symmetric case: same lat at both ends, t = 0.5 → boundary lat = 45
    expect(segs[0][segs[0].length - 1][1]).toBeCloseTo(45, 5);
    expect(segs[1][0][1]).toBeCloseTo(45, 5);
  });

  it('handles multiple antimeridian crossings (→ 3 segments)', () => {
    // 170°E → 170°W → 170°E: two crossings
    const segs = splitAtAntimeridian([[170, 0], [-170, 0], [170, 0]]);
    expect(segs).toHaveLength(3);
    // Original endpoints are preserved in the outer segments
    expect(segs[0][0]).toEqual([170, 0]);
    expect(segs[2][segs[2].length - 1]).toEqual([170, 0]);
    // All join points fall on ±180°
    expect(segs[0][segs[0].length - 1][0]).toBe(180);
    expect(segs[1][0][0]).toBe(-180);
    expect(segs[1][segs[1].length - 1][0]).toBe(-180);
    expect(segs[2][0][0]).toBe(180);
  });

  it('interpolates latitude in Mercator space, not linearly', () => {
    // 179°E → 178°W: dLon = -357, dLonUnwrapped = 3, t = (180-179)/3 = 1/3.
    // Mercator-interpolated boundary latitude at t=1/3 from 30° to 60° is
    // ~41.9°, which differs measurably from the linear value of 40°.
    const segs = splitAtAntimeridian([[179, 30], [-178, 60]]);
    expect(segs).toHaveLength(2);
    const latAtBoundary = segs[0][segs[0].length - 1][1];
    expect(latAtBoundary).toBeGreaterThan(30);
    expect(latAtBoundary).toBeLessThan(60);
    // Differs from naive linear interpolation (30 + 1/3 * 30 = 40)
    expect(latAtBoundary).not.toBeCloseTo(40, 1);
    // Both segment boundary points agree
    expect(segs[1][0][1]).toBeCloseTo(latAtBoundary, 10);
  });

  it('boundary points at ±180° are synthetic — not present in the input', () => {
    // The function inserts ±180° boundary points only as segment join points.
    // This is the invariant that prevents them from being persisted as route
    // waypoints when the route is saved after editing.
    const input: [number, number][] = [[179, 0], [-179, 0]];
    const segs = splitAtAntimeridian(input);
    const allPoints = segs.flat() as [number, number][];
    // Original waypoints survive
    expect(allPoints).toContainEqual([179, 0]);
    expect(allPoints).toContainEqual([-179, 0]);
    // Exactly two synthetic boundary points exist
    const synthetic = allPoints.filter((p) => Math.abs(p[0]) === 180);
    expect(synthetic).toHaveLength(2);
    // None of the original input coordinates touch ±180°
    expect(input.some((p) => Math.abs(p[0]) === 180)).toBe(false);
  });

  it('does not mutate the input array', () => {
    const input: [number, number][] = [[170, 0], [-170, 0]];
    const copy: [number, number][] = input.map((p) => [p[0], p[1]]);
    splitAtAntimeridian(input);
    expect(input[0]).toEqual(copy[0]);
    expect(input[1]).toEqual(copy[1]);
  });
});

// ---------------------------------------------------------------------------
// mapifyCoords — longitude unwrapping used to build the scratch geometry
// for the OL Modify interaction during route editing
// ---------------------------------------------------------------------------

describe('mapifyCoords', () => {
  it('returns a short route unchanged', () => {
    const coords: [number, number][] = [[0, 0], [10, 0], [20, 0]];
    expect(mapifyCoords(coords)).toEqual([[0, 0], [10, 0], [20, 0]]);
  });

  it('unwraps an eastbound crossing into continuous coordinates > 180°', () => {
    // 170°E → 170°W going east: the raw -170 unwraps to +190 relative to 170
    const coords: [number, number][] = [[170, 0], [-170, 0]];
    const result = mapifyCoords(coords);
    expect(result[0][0]).toBeCloseTo(170, 5);
    expect(result[1][0]).toBeCloseTo(190, 5);
  });

  it('unwraps a westbound crossing into continuous coordinates < -180°', () => {
    // 170°W → 170°E going west: the raw +170 unwraps to -190 relative to -170
    const coords: [number, number][] = [[-170, 0], [170, 0]];
    const result = mapifyCoords(coords);
    expect(result[0][0]).toBeCloseTo(-170, 5);
    expect(result[1][0]).toBeCloseTo(-190, 5);
  });

  it('normalises a first point that is outside [-180, 180]', () => {
    const coords: [number, number][] = [[185, 0], [190, 0]];
    const result = mapifyCoords(coords);
    expect(result[0][0]).toBeCloseTo(-175, 5); // 185 - 360
  });

  it('returns a single-point array unchanged', () => {
    const coords: [number, number][] = [[90, 45]];
    expect(mapifyCoords(coords)).toEqual([[90, 45]]);
  });

  it('does not mutate the input tuples (regression: shallow-copy callers are safe)', () => {
    // Before the fix, coords[i][0] -= 360 wrote through shallow-copied tuples
    // back to the cached SK route coordinates. Verify the originals are intact.
    const original: [number, number][] = [[170, 0], [-170, 0]];
    const snapshot: [number, number][] = original.map((p) => [p[0], p[1]]);
    mapifyCoords(original);
    expect(original[0]).toEqual(snapshot[0]);
    expect(original[1]).toEqual(snapshot[1]);
  });
});
