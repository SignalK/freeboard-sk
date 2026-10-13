import { describe, expect, it } from 'vitest';
import { buildDepthField, medianConsecutiveGap } from './bathymetry';
import type { DepthSample } from './live-depth';

const sample = (lon: number, lat: number, depth: number): DepthSample => ({
  lon,
  lat,
  depth
});

// ~1 m of Web Mercator per 8.98e-6 degrees of longitude near the equator.
const EXTENT = [-2000, -2000, 2000, 2000];

describe('bathymetry buildDepthField', () => {
  it('is null for an unusable grid', () => {
    expect(
      buildDepthField([sample(0, 0, 5)], [0, 0, 0, 0], { cellMetres: 10 })
    ).toBeNull();
    expect(
      buildDepthField([sample(0, 0, 5)], EXTENT, { cellMetres: 0 })
    ).toBeNull();
    expect(
      buildDepthField([sample(0, 0, 5)], [0, 0, 1], { cellMetres: 10 })
    ).toBeNull();
  });

  it('fills cells around a sample and leaves the rest uncovered (NaN)', () => {
    const f = buildDepthField([sample(0, 0, 10)], EXTENT, {
      cellMetres: 1000,
      coverageCells: 2
    });
    expect(f.width).toBe(4);
    expect(f.height).toBe(4);
    // cell (2,2) is centred 707 m from the sample -> covered
    expect(f.depth[2 * 4 + 2]).toBe(10);
    // corner cell is 2121 m away -> beyond the 2000 m radius
    expect(Number.isNaN(f.depth[0])).toBe(true);
  });

  it('interpolates between two soundings', () => {
    const f = buildDepthField(
      [sample(0, 0, 10), sample(0.009, 0, 20)],
      EXTENT,
      {
        cellMetres: 1000,
        coverageCells: 2,
        shallowBias: 0
      }
    );
    // a cell between the two, in range of both
    const between = f.depth[2 * 4 + 1];
    expect(between).toBeGreaterThan(10);
    expect(between).toBeLessThan(20);
  });

  it('never reports deeper than the shallowest sample in range when biased', () => {
    const f = buildDepthField(
      [sample(0, 0, 10), sample(0.009, 0, 20)],
      EXTENT,
      {
        cellMetres: 1000,
        coverageCells: 2,
        shallowBias: 1
      }
    );
    const between = f.depth[2 * 4 + 1];
    expect(between).toBe(10);
  });

  it('ignores non-finite and negative samples', () => {
    const f = buildDepthField(
      [sample(0, 0, -5), sample(0, 0, NaN), sample(0, 0, Infinity)],
      EXTENT,
      { cellMetres: 1000 }
    );
    expect([...f.depth].every((v) => Number.isNaN(v))).toBe(true);
  });
});

describe('bathymetry sample spacing', () => {
  it('is zero with fewer than two samples', () => {
    expect(medianConsecutiveGap([])).toBe(0);
    expect(medianConsecutiveGap([{ lon: 0, lat: 0 }])).toBe(0);
  });

  it('is the median distance between consecutive samples', () => {
    // ~500 m between the two points near the equator
    expect(
      medianConsecutiveGap([
        { lon: 0, lat: 0 },
        { lon: 0.004492, lat: 0 }
      ])
    ).toBeCloseTo(500, 0);
  });

  it('bridges a gap when given a coverage radius', () => {
    const a = sample(0, 0, 10);
    const b = sample(0.004492, 0, 20); // ~500 m east
    const extent = [-1000, -1000, 1000, 1000];
    // the cell between them (centre 250 m from each) is uncovered by default
    const dflt = buildDepthField([a, b], extent, { cellMetres: 100 });
    expect(Number.isNaN(dflt.depth[10 * 20 + 12])).toBe(true);
    // a coverage radius of 300 m reaches it
    const bridged = buildDepthField([a, b], extent, {
      cellMetres: 100,
      coverageMetres: 300
    });
    expect(Number.isNaN(bridged.depth[10 * 20 + 12])).toBe(false);
  });

  it('floors the coverage radius so an anchored cluster is not specks', () => {
    const a = sample(0, 0, 5);
    const extent = [-10, -10, 10, 10];
    // a cell centre ~1.77 m away: outside a 1 m radius (2 cells of 0.5 m) ...
    const bare = buildDepthField([a], extent, {
      cellMetres: 0.5,
      coverageCells: 2,
      coverageMinMetres: 0
    });
    expect(Number.isNaN(bare.depth[20 * 40 + 23])).toBe(true);
    // ... but inside the default 2 m floor
    const floored = buildDepthField([a], extent, {
      cellMetres: 0.5,
      coverageCells: 2
    });
    expect(Number.isNaN(floored.depth[20 * 40 + 23])).toBe(false);
  });
});
