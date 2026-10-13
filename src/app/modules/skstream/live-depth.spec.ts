import { describe, expect, it } from 'vitest';
import {
  aggregateMinDepth,
  DEFAULT_MERGE_TOLERANCE,
  DEFAULT_SAFETY_DEPTH_M,
  DEPTH_HISTORY_METHOD,
  depthClusters,
  depthColor,
  depthCss,
  historyValuesQuery,
  mergeDepthCells,
  MERGE_MAX_RADIUS_CELLS,
  orderDeepToShallow,
  parseDepthSeries,
  selectShoals,
  shadeColor,
  type DepthCell,
  type DepthSample
} from './live-depth';

const sample = (lon: number, lat: number, depth: number): DepthSample => ({
  lon,
  lat,
  depth
});

describe('live-depth shade palette', () => {
  it('runs from a saturated azure (surface) to white (shade limit)', () => {
    expect(shadeColor(0)).toEqual([26, 132, 216]);
    expect(shadeColor(1)).toEqual([255, 255, 255]);
  });

  it('lightens as the depth approaches the shade limit', () => {
    expect(shadeColor(0)[2]).toBeLessThan(shadeColor(0.5)[2]);
    expect(shadeColor(0.5)[2]).toBeLessThan(shadeColor(1)[2]);
  });

  it('maps a depth to a colour relative to the shade limit', () => {
    expect(depthColor(0, 10)).toEqual(shadeColor(0));
    expect(depthColor(5, 10)).toEqual(shadeColor(0.5));
    // at and beyond the limit the colour is white
    expect(depthColor(10, 10)).toEqual([255, 255, 255]);
    expect(depthColor(50, 10)).toEqual([255, 255, 255]);
  });

  it('renders a CSS colour with the requested alpha', () => {
    expect(depthCss(0, 10, 0.5)).toBe('rgba(26,132,216,0.5)');
  });
});

describe('live-depth aggregateMinDepth', () => {
  it('keeps the shallowest depth in a cell and counts its samples', () => {
    const cells = aggregateMinDepth(
      [sample(0, 0, 10), sample(0.0005, 0, 3)],
      1000
    );
    expect(cells).toHaveLength(1);
    expect(cells[0].depth).toBe(3);
    expect(cells[0].count).toBe(2);
  });

  it('places distant samples in different cells', () => {
    const cells = aggregateMinDepth(
      [sample(0, 0, 10), sample(0.02, 0, 5)],
      1000
    );
    expect(cells).toHaveLength(2);
  });

  it('never lets a deeper sample mask a shallow one in the same cell', () => {
    const cells = aggregateMinDepth(
      [sample(0, 0, 50), sample(0.0001, 0, 50), sample(0.0002, 0, 2)],
      1000
    );
    expect(cells).toHaveLength(1);
    expect(cells[0].depth).toBe(2);
  });

  it('ignores non-finite, negative and too-deep samples', () => {
    const cells = aggregateMinDepth(
      [sample(0, 0, NaN), sample(0.0001, 0, -1), sample(0.0002, 0, 500)],
      1000,
      100
    );
    expect(cells).toHaveLength(0);
  });

  it('still carries a lone deep sample when within the display range', () => {
    const cells = aggregateMinDepth([sample(0, 0, 80)], 1000, 100);
    expect(cells).toHaveLength(1);
    expect(cells[0]).toMatchObject({ lon: 0, lat: 0, depth: 80, count: 1 });
  });

  it('is empty without a positive cell size', () => {
    expect(aggregateMinDepth([sample(0, 0, 1)], 0)).toEqual([]);
  });
});

describe('live-depth merging', () => {
  const cell = (
    ix: number,
    iy: number,
    depth: number,
    count = 1
  ): DepthCell => ({
    ix,
    iy,
    lon: ix * 0.01,
    lat: iy * 0.01,
    depth,
    count
  });

  it('merges adjacent cells within the tolerance into one circle', () => {
    const clusters = mergeDepthCells(
      [cell(0, 0, 8), cell(1, 0, 8.5), cell(2, 0, 9)],
      1000,
      0.15
    );
    expect(clusters).toHaveLength(1);
    expect(clusters[0].depth).toBe(8);
    expect(clusters[0].count).toBe(3);
    expect(clusters[0].radiusMetres).toBeGreaterThan(0);
  });

  it('keeps cells outside the tolerance apart', () => {
    const clusters = mergeDepthCells(
      [cell(0, 0, 8), cell(1, 0, 20)],
      1000,
      0.15
    );
    expect(clusters.map((c) => c.depth).sort((a, b) => a - b)).toEqual([8, 20]);
  });

  it('does not let depth chain up across neighbours', () => {
    // 8 -> 9 -> 10.3: each pair is within 15% of the previous, but 10.3 is
    // more than 15% from the 8 m anchor, so it must be its own circle.
    const clusters = mergeDepthCells(
      [cell(0, 0, 8), cell(1, 0, 9), cell(2, 0, 10.3)],
      1000,
      0.15
    );
    expect(clusters).toHaveLength(2);
    expect(clusters.some((c) => c.depth === 8 && c.count === 2)).toBe(true);
    expect(clusters.some((c) => c.depth === 10.3 && c.count === 1)).toBe(true);
    // the 8 m anchor circle is shallowest
    expect(clusters[0].depth).toBe(8);
  });

  it('does not merge non-adjacent cells of the same depth', () => {
    const clusters = mergeDepthCells(
      [cell(0, 0, 8), cell(5, 0, 8)],
      1000,
      0.15
    );
    expect(clusters).toHaveLength(2);
  });

  it('bounds how far a uniform-depth group grows', () => {
    const line = Array.from({ length: 30 }, (_, i) => cell(i, 0, 8));
    const clusters = mergeDepthCells(
      line,
      1000,
      DEFAULT_MERGE_TOLERANCE,
      MERGE_MAX_RADIUS_CELLS
    );
    expect(clusters.length).toBeGreaterThan(1);
    expect(Math.max(...clusters.map((c) => c.count))).toBeLessThan(30);
  });
});

describe('live-depth ordering and shoals', () => {
  it('orders items deepest first so shallow ones paint last', () => {
    const cells = [
      { lon: 0, lat: 0, depth: 3, count: 1 },
      { lon: 1, lat: 0, depth: 40, count: 1 },
      { lon: 2, lat: 0, depth: 10, count: 1 }
    ];
    expect(orderDeepToShallow(cells).map((c) => c.depth)).toEqual([40, 10, 3]);
  });

  it('selects samples at or below the safety depth, and nothing else', () => {
    const samples = [sample(0, 0, 1), sample(1, 0, 3), sample(2, 0, 4)];
    expect(
      selectShoals(samples, DEFAULT_SAFETY_DEPTH_M).map((s) => s.depth)
    ).toEqual([1, 3]);
    expect(selectShoals(samples, 0)).toEqual([]);
  });

  it('depthClusters aggregates, merges and orders deep to shallow', () => {
    const clusters = depthClusters(
      [sample(0, 0, 40), sample(0.02, 0, 2), sample(0.0005, 0, 40)],
      1000
    );
    expect(clusters.map((c) => c.depth)).toEqual([40, 2]);
  });
});

const params = (q: string) => Object.fromEntries(new URLSearchParams(q));
const FROM = Date.parse('2026-10-11T13:00:00Z');
const TO = Date.parse('2026-10-11T14:00:00Z');

describe('live-depth history query', () => {
  it('asks for position and the shallowest depth over the span', () => {
    const p = params(
      historyValuesQuery({
        depthPath: 'environment.depth.belowTransducer',
        from: FROM,
        to: TO
      })
    );
    expect(p.paths).toBe(
      `navigation.position,environment.depth.belowTransducer:${DEPTH_HISTORY_METHOD},navigation.headingTrue:average`
    );
    expect(p.from).toBe(new Date(FROM).toISOString());
    expect(p.to).toBe(new Date(TO).toISOString());
    // no resolution: the provider would auto-downsample to ~1000 points
    expect(p.resolution).toBeUndefined();
    expect(p.context).toBeUndefined();
  });

  it('sends an explicit resolution when given one (fractional allowed)', () => {
    const p = params(
      historyValuesQuery({
        depthPath: 'environment.depth.belowTransducer',
        from: FROM,
        to: TO,
        resolution: 0.1
      })
    );
    expect(p.resolution).toBe('0.1');
  });

  it('passes a context when given one', () => {
    const p = params(
      historyValuesQuery({
        depthPath: 'environment.depth.belowKeel',
        from: FROM,
        to: TO,
        context: 'vessels.urn:mrn:imo:mmsi:1'
      })
    );
    expect(p.context).toBe('vessels.urn:mrn:imo:mmsi:1');
  });

  it('parses depth rows with array or object positions, skipping bad ones', () => {
    const result = {
      values: [
        { path: 'navigation.position' },
        { path: 'environment.depth.belowTransducer' }
      ],
      data: [
        ['2026-10-11T13:00:00Z', [-77.6, 8.8], 5],
        ['2026-10-11T13:00:30Z', { longitude: -77.61, latitude: 8.81 }, 6],
        ['2026-10-11T13:01:00Z', [-77.62, 8.82], null],
        ['2026-10-11T13:01:30Z', [-77.63, 8.83], -2],
        ['bad-time', [-77.64, 8.84], 7],
        ['2026-10-11T13:02:00Z', [-77.65, 8.85], 8]
      ]
    };
    const rows = parseDepthSeries(result, 'environment.depth.belowTransducer');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({
      time: Date.parse('2026-10-11T13:00:00Z'),
      depth: 5,
      position: [-77.6, 8.8]
    });
    expect(rows[1].position).toEqual([-77.61, 8.81]);
    expect(rows[2].position).toEqual([-77.65, 8.85]);
  });

  it('is empty when the requested path is absent', () => {
    expect(
      parseDepthSeries({ values: [{ path: 'other' }], data: [] }, 'x')
    ).toEqual([]);
    expect(parseDepthSeries(null, 'x')).toEqual([]);
  });
});
