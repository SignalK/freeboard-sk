import { describe, expect, it } from 'vitest';
import {
  decodeElevation,
  elevationExpression,
  evaluatePaintNumber,
  fskFonts,
  mapLibreZoom,
  olStyleLayer,
  reliefColorExpression,
  resolutionAt,
  resolutionRange
} from './style-to-ol';
import {
  parseReliefRamp,
  planSource,
  type DemEncoding,
  type ReliefRamp
} from 'src/app/modules/plotterext/data-overlay-style';

const encoding = (enc: string): DemEncoding =>
  (
    planSource(
      { type: 'raster-dem', tiles: ['/t/{z}/{x}/{y}'], encoding: enc },
      'http://sk.local'
    ) as { encoding: DemEncoding }
  ).encoding;

/** Evaluate the arithmetic of an OL expression for one pixel's bands (0..1). */
function evaluate(expr: unknown, bands: number[]): number {
  if (typeof expr === 'number') return expr;
  const [op, ...args] = expr as [string, ...unknown[]];
  const v = args.map((a) =>
    op === 'band' ? (a as number) : evaluate(a, bands)
  );
  switch (op) {
    case 'band':
      return bands[v[0] - 1];
    case '+':
      return v.reduce((a, b) => a + b, 0);
    case '*':
      return v.reduce((a, b) => a * b, 1);
    case '-':
      return v[0] - v[1];
  }
  throw new Error(`unexpected operator ${op}`);
}

describe('raster-dem decoding', () => {
  it('decodes terrarium: 0,0,0 is -32768 m and 128,0,0 is sea level', () => {
    const t = encoding('terrarium');
    expect(decodeElevation(t, 0, 0, 0)).toBe(-32768);
    expect(decodeElevation(t, 128, 0, 0)).toBe(0);
    // -4.2 m: 32763.8 = 127*256 + 251 + 204.8/256
    expect(decodeElevation(t, 127, 251, 204.8)).toBeCloseTo(-4.2, 6);
  });

  it('decodes mapbox: 0,0,0 is -10000 m', () => {
    const m = encoding('mapbox');
    expect(decodeElevation(m, 0, 0, 0)).toBe(-10000);
    // 100000 * 0.1 - 10000 = 0: 100000 = 1*65536 + 134*256 + 160
    expect(decodeElevation(m, 1, 134, 160)).toBeCloseTo(0, 6);
  });

  it('builds a shader expression that decodes like the Style Spec', () => {
    for (const enc of [encoding('terrarium'), encoding('mapbox')]) {
      for (const [r, g, b] of [
        [0, 0, 0],
        [127, 251, 204],
        [1, 134, 160],
        [255, 255, 255]
      ]) {
        expect(
          evaluate(elevationExpression(enc), [r / 255, g / 255, b / 255, 1])
        ).toBeCloseTo(decodeElevation(enc, r, g, b), 6);
      }
    }
  });
});

describe('reliefColorExpression', () => {
  const ramp = parseReliefRamp([
    'interpolate',
    ['linear'],
    ['elevation'],
    -32768,
    'rgba(0,0,0,0)',
    -3,
    '#d6ebf8',
    -2.999,
    '#f2c14e'
  ]) as ReliefRamp;

  it('interpolates the ramp linearly over the decoded elevation, transparent where a tile has no data', () => {
    const t = encoding('terrarium');
    expect(reliefColorExpression(ramp, t)).toEqual([
      'case',
      ['>', ['band', 4], 0],
      [
        'interpolate',
        ['linear'],
        elevationExpression(t),
        -32768,
        [0, 0, 0, 0],
        -3,
        [214, 235, 248, 1],
        -2.999,
        [242, 193, 78, 1]
      ],
      [0, 0, 0, 0]
    ]);
  });

  it('draws a one-stop ramp as that colour', () => {
    const one = parseReliefRamp([
      'interpolate',
      ['linear'],
      ['elevation'],
      0,
      'red'
    ]) as ReliefRamp;
    expect(reliefColorExpression(one, encoding('mapbox'))[2]).toEqual([
      255, 0, 0, 1
    ]);
  });
});

describe('zoom', () => {
  it('converts between OL resolutions and MapLibre zooms (512-pixel world)', () => {
    expect(mapLibreZoom(resolutionAt(10))).toBeCloseTo(10, 9);
    // OL zoom 11 (256-pixel tiles) is MapLibre zoom 10
    expect(mapLibreZoom(156543.03392804097 / 2 ** 11)).toBeCloseTo(10, 9);
  });

  it('shows a layer from minzoom up to, not including, maxzoom', () => {
    const { minResolution, maxResolution } = resolutionRange(8, 14);
    const shown = (z: number) => {
      const r = resolutionAt(z);
      return r < (maxResolution as number) && r >= (minResolution as number);
    };
    expect([7.99, 8, 13.99, 14].map(shown)).toEqual([false, true, true, false]);
    expect(resolutionRange(0, undefined)).toEqual({});
  });
});

describe('evaluatePaintNumber', () => {
  it('evaluates a zoom expression at MapLibre zoom', () => {
    const v = ['interpolate', ['linear'], ['zoom'], 10, 0, 12, 1];
    expect(
      evaluatePaintNumber('raster', 'raster-opacity', v, 11, {})
    ).toBeCloseTo(0.5);
  });

  it('evaluates global state', () => {
    expect(
      evaluatePaintNumber(
        'color-relief',
        'color-relief-opacity',
        ['global-state', 'shade'],
        5,
        { shade: 0.25 }
      )
    ).toBe(0.25);
  });

  it('falls back to the default', () => {
    expect(
      evaluatePaintNumber('raster', 'raster-opacity', undefined, 5, {})
    ).toBe(1);
    expect(
      evaluatePaintNumber('raster', 'raster-opacity', ['get', 'x'], 5, {})
    ).toBe(1);
  });
});

describe('fskFonts', () => {
  it('draws text in Roboto, keeping the weight asked for', () => {
    expect(fskFonts(['Noto Sans Bold'])).toEqual(['Roboto Bold']);
    expect(fskFonts(['Open Sans Semibold Italic'])).toEqual([
      'Roboto Semibold Italic'
    ]);
    expect(fskFonts(['Metropolis'])).toEqual(['Roboto Regular']);
    expect(fskFonts(['Open Sans Italic'])).toEqual(['Roboto Regular Italic']);
  });
});

describe('olStyleLayer', () => {
  const layer = {
    id: 'labels',
    type: 'symbol',
    source: 's',
    filter: ['<', ['get', 'depth'], ['global-state', 'safety']],
    layout: {
      'text-field': [
        'number-format',
        ['*', ['get', 'depth'], ['global-state', 'factor']],
        {}
      ],
      'text-size': ['global-state', 'size']
    },
    paint: { 'text-color': ['global-state', 'colour'], 'text-halo-width': 1 }
  };

  it('resolves global-state and keeps properties that fit their values', () => {
    const { layer: out, dropped } = olStyleLayer(layer, {
      safety: 3,
      factor: 3.28,
      size: 12,
      colour: 'red'
    });
    expect(dropped).toEqual([]);
    expect(out.filter).toEqual([
      '<',
      ['get', 'depth'],
      ['get', 'safety', ['literal', { safety: 3 }]]
    ]);
    expect(out.paint?.['text-color']).toEqual([
      'get',
      'colour',
      ['literal', { colour: 'red' }]
    ]);
  });

  it('coerces a value as MapLibre does: a number reads as text', () => {
    const { dropped } = olStyleLayer(
      {
        id: 'l',
        type: 'symbol',
        source: 's',
        layout: { 'text-field': ['global-state', 'label'] }
      },
      { label: 5 }
    );
    expect(dropped).toEqual([]);
  });

  it('drops a property whose value no longer compiles, so it draws its default', () => {
    // null: a variable with no default; a string where a number is wanted
    const { layer: out, dropped } = olStyleLayer(layer, {
      factor: null,
      size: '12',
      colour: 5
    });
    expect(dropped.sort()).toEqual(['text-color', 'text-field', 'text-size']);
    expect(out.layout).toEqual({});
    expect(out.paint).toEqual({ 'text-halo-width': 1 });
  });

  it('leaves properties without global-state to the style analysis', () => {
    const { dropped } = olStyleLayer(
      { id: 'x', type: 'line', source: 's', paint: { 'line-width': 2 } },
      {}
    );
    expect(dropped).toEqual([]);
  });
});
