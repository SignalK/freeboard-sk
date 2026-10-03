import { describe, expect, it } from 'vitest';

import { FBChart, FBCharts, Position } from 'src/app/types';
import { chartsNearPosition } from './chart-near-vessel';

const chart = (id: string, bounds?: number[]): FBChart =>
  [id, { name: id, bounds } as FBChart[1], true] as FBChart;
const ids = (charts: FBCharts) => charts.map((c) => c[0]);

// a vessel in Port Denarau, Fiji
const AT: Position = [177.38, -17.77];

describe('chartsNearPosition', () => {
  it('lists the charts at the position first, the most detailed first', () => {
    const charts = [
      chart('world overlay', [-180, -90, 180, 90]),
      chart('passage', [176, -19, 179, -16]),
      chart('harbour', [177.37, -17.78, 177.39, -17.76]),
      chart('approach', [177.2, -17.9, 177.5, -17.6])
    ];
    expect(ids(chartsNearPosition(charts, AT))).toEqual([
      'harbour',
      'approach',
      'passage',
      'world overlay'
    ]);
  });

  it('lists the others after them, nearest first', () => {
    const charts = [
      chart('Tuvalu', [176, -10, 180, -5]),
      chart('Wallis', [-178.3, -14.5, -176, -13]),
      chart('harbour', [177.37, -17.78, 177.39, -17.76]),
      chart('Lau group', [-179.5, -19.5, -178, -17])
    ];
    expect(ids(chartsNearPosition(charts, AT))).toEqual([
      'harbour',
      'Lau group',
      'Wallis',
      'Tuvalu'
    ]);
  });

  it('measures across the antimeridian', () => {
    const near: Position = [179.9, -17.5];
    const charts = [
      chart('west of it', [178, -18, 178.5, -17]),
      // its near edge is just across 180°, its far edge 10° beyond
      chart('east of it', [-179.95, -18, -170, -17])
    ];
    expect(ids(chartsNearPosition(charts, near))).toEqual([
      'east of it',
      'west of it'
    ]);
  });

  it('holds the position in bounds that cross the antimeridian', () => {
    const charts = [
      chart('passage', [170, -30, 180, -10]),
      chart('across 180°', [179.5, -18, -179.5, -17])
    ];
    expect(ids(chartsNearPosition(charts, [179.9, -17.5]))).toEqual([
      'across 180°',
      'passage'
    ]);
  });

  it('keeps charts of the same bounds in the order given', () => {
    const fiji = [176, -21, 180, -15];
    const charts = [
      chart('Navionics', fiji),
      chart('ArcGIS', fiji),
      chart('GoogleSat', fiji)
    ];
    expect(ids(chartsNearPosition(charts, AT))).toEqual([
      'Navionics',
      'ArcGIS',
      'GoogleSat'
    ]);
  });

  it('lists charts without bounds last, in the order given', () => {
    const charts = [
      chart('no bounds 1'),
      chart('far', [100, 10, 101, 11]),
      chart('no bounds 2', [1, 2])
    ];
    expect(ids(chartsNearPosition(charts, AT))).toEqual([
      'far',
      'no bounds 1',
      'no bounds 2'
    ]);
  });

  it('keeps the order given without a usable position', () => {
    // ranked, the chart without bounds would go last
    const charts = [
      chart('no bounds'),
      chart('far', [100, 10, 101, 11]),
      chart('harbour', [177.37, -17.78, 177.39, -17.76])
    ];
    [[], [NaN, NaN], [177.38], undefined].forEach((at) =>
      expect(ids(chartsNearPosition(charts, at as Position))).toEqual([
        'no bounds',
        'far',
        'harbour'
      ])
    );
  });
});
