import { describe, expect, it } from 'vitest';

import { SKChart } from 'src/app/modules/skresources/resource-classes';
import { FBChart } from 'src/app/types';
import { opaqueCoverage } from './layer-s57-chart.component';

const coverage = [{ minzoom: 9, tiles: ['9/492/288'] }];
const chart = (style?: string): FBChart =>
  ['odc', new SKChart({ type: 'S-57', coverage, style }), true] as FBChart;

describe('opaqueCoverage', () => {
  it("claims the chart's coverage under Freeboard's own styling", () => {
    expect(opaqueCoverage(chart())).toEqual(coverage);
  });

  it('claims none under a style of the chart', () => {
    expect(opaqueCoverage(chart('https://example.org/style.json'))).toBe(
      undefined
    );
  });
});
