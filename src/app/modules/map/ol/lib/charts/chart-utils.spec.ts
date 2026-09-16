import { expect, describe, it } from 'vitest';
import {
  extentFromBounds,
  isChartInView,
  isUnevaluableByOl,
  isZoomWithinLayerRange,
  normaliseStyleForOl,
  resolveLayerMaxZoom,
  resolveLayerZoomRange
} from './chart-utils';

describe('resolveLayerZoomRange', () => {
  // A chart declaring tiles for z5-z15, the shape the Traficom raster sets have.
  const chart = (displayMinZoom?: number) => ({
    minZoom: 5,
    maxZoom: 15,
    displayMinZoom
  });

  describe('without a display minimum (existing behaviour)', () => {
    it('matches the current max resolution with over-zoom on and off', () => {
      expect(resolveLayerZoomRange(chart(), 20, true).max).toBe(
        resolveLayerMaxZoom(15, 20, true)
      );
      expect(resolveLayerZoomRange(chart(), 20, false).max).toBe(
        resolveLayerMaxZoom(15, 20, false)
      );
    });

    it('keeps the legacy 0.1 offset on the declared minimum', () => {
      expect(resolveLayerZoomRange(chart(), 20, true).min).toBeCloseTo(4.9);
    });

    it('leaves a declared minimum below the offset untouched', () => {
      expect(
        resolveLayerZoomRange({ minZoom: 0, maxZoom: 24 }, 20, true).min
      ).toBe(0);
    });
  });

  describe('display minimum', () => {
    it('shows the chart at exactly the configured level', () => {
      const { min } = resolveLayerZoomRange(chart(12), 20, true);
      // OpenLayers' layer minimum is exclusive: visible while zoom > min.
      expect(12).toBeGreaterThan(min);
      expect(11.99).toBeLessThan(min);
    });

    it('does not inherit the legacy 0.1 offset', () => {
      expect(resolveLayerZoomRange(chart(12), 20, true).min).toBeGreaterThan(
        11.9
      );
    });

    it('yields to a higher declared minimum', () => {
      expect(resolveLayerZoomRange(chart(3), 20, true).min).toBeCloseTo(4.9);
    });

    it('honours a bound set at the chart’s own declared minimum', () => {
      // The common case: the user picks the level the chart's data starts at.
      // The legacy 0.1 offset would draw it from 4.9, ignoring the bound.
      const { min } = resolveLayerZoomRange(chart(5), 20, true);
      expect(5).toBeGreaterThan(min);
      expect(4.99).toBeLessThan(min);
    });

    it('applies to a chart that declares no minimum', () => {
      const { min } = resolveLayerZoomRange(
        { maxZoom: 15, displayMinZoom: 12 },
        20,
        true
      );
      expect(12).toBeGreaterThan(min);
      expect(11.99).toBeLessThan(min);
    });

    it('leaves the maximum entirely alone', () => {
      expect(resolveLayerZoomRange(chart(12), 20, true).max).toBe(
        resolveLayerMaxZoom(15, 20, true)
      );
      expect(resolveLayerZoomRange(chart(12), 20, false).max).toBe(15);
    });

    it('never draws a chart below the zoom its tiles start at', () => {
      // Asking for z3 on a chart whose data starts at z5 must not invent tiles.
      const { min } = resolveLayerZoomRange(chart(3), 20, true);
      expect(min).toBeGreaterThanOrEqual(4.9);
    });
  });

  it('hands over between charts at the level the next one starts', () => {
    // Coastal charts from z9, boating charts from z12: at z12 the boating
    // chart is drawn, and the coastal one is still there underneath it.
    const coastal = resolveLayerZoomRange(chart(9), 20, true);
    const boating = resolveLayerZoomRange(chart(12), 20, true);
    expect(isZoomWithinLayerRange(coastal, 11.99)).toBe(true);
    expect(isZoomWithinLayerRange(boating, 11.99)).toBe(false);
    expect(isZoomWithinLayerRange(coastal, 12)).toBe(true);
    expect(isZoomWithinLayerRange(boating, 12)).toBe(true);
  });
});

describe('isZoomWithinLayerRange', () => {
  it('follows OpenLayers bounds: minimum exclusive, maximum inclusive', () => {
    const range = { min: 9, max: 13 };
    expect(isZoomWithinLayerRange(range, 9)).toBe(false);
    expect(isZoomWithinLayerRange(range, 9.0001)).toBe(true);
    expect(isZoomWithinLayerRange(range, 13)).toBe(true);
    expect(isZoomWithinLayerRange(range, 13.0001)).toBe(false);
  });

  it('treats an absent bound as unbounded at that end', () => {
    expect(isZoomWithinLayerRange({ max: 13 }, 2)).toBe(true);
    expect(isZoomWithinLayerRange({ min: 9 }, 28)).toBe(true);
    expect(isZoomWithinLayerRange({}, 11)).toBe(true);
  });

  it('reports a chart hidden by its declared minimum as not visible', () => {
    // Display minimum asks for z8 up, but the chart has no tiles below z10.
    const resolved = resolveLayerZoomRange(
      { minZoom: 10, maxZoom: 15, displayMinZoom: 8 },
      20,
      true
    );
    expect(isZoomWithinLayerRange(resolved, 9)).toBe(false);
  });
});

describe('resolveLayerMaxZoom', () => {
  it('returns chart max when over-zoom disabled', () => {
    expect(resolveLayerMaxZoom(12, 20, false)).toBe(12);
  });

  it('returns chart max when map max is not a number', () => {
    expect(resolveLayerMaxZoom(12, undefined, true)).toBe(12);
  });

  it('uses map max when chart max is undefined and over-zoom enabled', () => {
    expect(resolveLayerMaxZoom(undefined, 20, true)).toBe(20);
  });

  it('uses the larger of chart and map max when over-zoom enabled', () => {
    expect(resolveLayerMaxZoom(12, 20, true)).toBe(20);
    expect(resolveLayerMaxZoom(24, 20, true)).toBe(24);
  });
});

describe('extentFromBounds', () => {
  it('returns undefined for missing bounds', () => {
    expect(extentFromBounds()).toBe(undefined);
  });

  it('returns undefined for invalid bounds length', () => {
    expect(extentFromBounds([90, 90, 90])).toBe(undefined);
  });

  it('returns undefined for invalid bounds values', () => {
    expect(extentFromBounds([90, 90, 90, 300])).toBe(undefined);
  });

  it('returns a transformed extent for valid mid-range bounds', () => {
    const extent = extentFromBounds([-10, -10, 10, 10]);
    expect(extent).toBeDefined();
    expect(extent).toHaveLength(4);
    expect(extent?.every((n) => Number.isFinite(n))).toBe(true);
  });

  it('rejects bounds that touch the +/-180 / +/-90 edges', () => {
    expect(extentFromBounds([-180, 0, 10, 10])).toBe(undefined);
    expect(extentFromBounds([-10, -90, 10, 10])).toBe(undefined);
    expect(extentFromBounds([-10, -10, 180, 10])).toBe(undefined);
    expect(extentFromBounds([-10, -10, 10, 90])).toBe(undefined);
  });

  it('accepts bounds just inside the edges', () => {
    expect(extentFromBounds([-179.99, -89.99, 179.99, 89.99])).toBeDefined();
  });
});

describe('isChartInView', () => {
  const extent = [10, 40, 20, 50];

  it('keeps a chart whose bounds overlap the extent', () => {
    expect(isChartInView([15, 45, 30, 60], extent)).toBe(true);
  });

  it('keeps a chart fully contained within the extent', () => {
    expect(isChartInView([12, 42, 18, 48], extent)).toBe(true);
  });

  it('drops a chart whose bounds are disjoint from the extent', () => {
    expect(isChartInView([30, 45, 40, 60], extent)).toBe(false);
  });

  it('keeps a chart that only touches the extent edge', () => {
    expect(isChartInView([20, 40, 30, 50], extent)).toBe(true);
  });

  it('keeps charts with missing or malformed bounds (treated as global)', () => {
    expect(isChartInView(undefined, extent)).toBe(true);
    expect(isChartInView([10, 40, 20], extent)).toBe(true);
    expect(isChartInView([], extent)).toBe(true);
  });

  describe('antimeridian-crossing view', () => {
    // View straddling the dateline reported by OpenLayers as maxLon > 180.
    const eastWrapped = [170, 40, 190, 60];
    // Equivalent view reported with minLon < -180.
    const westWrapped = [-190, 40, -170, 60];

    it('keeps a chart just west of the dateline (maxLon > 180 view)', () => {
      expect(isChartInView([172, 42, 178, 58], eastWrapped)).toBe(true);
    });

    it('keeps a chart just east of the dateline (maxLon > 180 view)', () => {
      expect(isChartInView([-178, 42, -172, 58], eastWrapped)).toBe(true);
    });

    it('keeps a chart east of the dateline (minLon < -180 view)', () => {
      expect(isChartInView([-178, 42, -172, 58], westWrapped)).toBe(true);
    });

    it('drops a chart outside a dateline-crossing view', () => {
      expect(isChartInView([100, 42, 120, 58], eastWrapped)).toBe(false);
    });

    it('drops a chart within the view longitude but outside its latitude', () => {
      expect(isChartInView([172, 0, 178, 20], eastWrapped)).toBe(false);
    });

    it('keeps every chart when the view spans the whole globe', () => {
      const worldView = [-200, 40, 200, 60];
      expect(isChartInView([-178, 42, -172, 58], worldView)).toBe(true);
      expect(isChartInView([0, 42, 10, 58], worldView)).toBe(true);
      expect(isChartInView([172, 42, 178, 58], worldView)).toBe(true);
    });
  });
});

describe('normaliseStyleForOl', () => {
  // The Open Waters Seamap shape that motivated the fix: a `color-relief` layer
  // (unsupported by ol-mapbox-style) sitting first for its raster-dem source,
  // ahead of the layers the renderer can draw.
  it('drops a first-of-source color-relief layer and keeps the renderable layers in order', () => {
    const style = {
      version: 8,
      sources: { dem: {}, seamap: {} },
      sprite: 'https://example/sprite',
      layers: [
        { id: 'depth-shading', type: 'color-relief', source: 'dem' },
        { id: 'bg', type: 'background' },
        { id: 'depths', type: 'fill', source: 'seamap' },
        { id: 'contours', type: 'line', source: 'seamap' },
        { id: 'seamarks', type: 'symbol', source: 'seamap' }
      ]
    };

    const out = normaliseStyleForOl(style);

    expect(out.layers?.map((l) => l.id)).toEqual([
      'bg',
      'depths',
      'contours',
      'seamarks'
    ]);
    // untouched everything that is not `layers`
    expect(out.sources).toBe(style.sources);
    expect(out.sprite).toBe('https://example/sprite');
    expect(out.version).toBe(8);
  });

  it('keeps every renderable layer type', () => {
    const types = [
      'background',
      'fill',
      'fill-extrusion',
      'line',
      'symbol',
      'circle',
      'raster',
      'hillshade'
    ];
    const style = { layers: types.map((type, i) => ({ id: `l${i}`, type })) };
    expect(normaliseStyleForOl(style).layers?.map((l) => l.type)).toEqual(
      types
    );
  });

  it('drops other unsupported layer types and layers with no type', () => {
    const style = {
      layers: [
        { id: 'heat', type: 'heatmap' },
        { id: 'ok', type: 'line' },
        { id: 'sky', type: 'sky' },
        { id: 'notype' } as { id: string; type?: string }
      ]
    };
    expect(normaliseStyleForOl(style).layers?.map((l) => l.id)).toEqual(['ok']);
  });

  it('is a no-op on a style with no layers array', () => {
    const noLayers = { version: 8, sources: {} };
    expect(normaliseStyleForOl(noLayers)).toBe(noLayers);
    const emptyLayers = { layers: [] as Array<{ type?: string }> };
    expect(normaliseStyleForOl(emptyLayers).layers).toEqual([]);
  });
});

describe('isUnevaluableByOl', () => {
  // line-dasharray is the property that actually freezes the OL renderer: the
  // MapLibre spec marks it `cross-faded`, so a data expression is not evaluable.
  it('flags a data expression on the cross-faded line-dasharray', () => {
    expect(
      isUnevaluableByOl('paint', 'line', 'line-dasharray', [
        'case',
        ['has', 'dashed'],
        ['literal', [4, 2]],
        ['literal', [1, 0]]
      ])
    ).toBe(true);
  });

  it('does not flag data-driven properties the renderer supports', () => {
    // fill-pattern / *-sort-key are data-driven in the spec and evaluate fine;
    // a hand-list dropped them and lost real chart information.
    expect(
      isUnevaluableByOl('paint', 'fill', 'fill-pattern', ['get', 'pat'])
    ).toBe(false);
    expect(
      isUnevaluableByOl('layout', 'symbol', 'symbol-sort-key', [
        'to-number',
        ['get', 'prio']
      ])
    ).toBe(false);
    expect(
      isUnevaluableByOl('paint', 'line', 'line-color', [
        'match',
        ['get', 'cls'],
        'a',
        '#f00',
        '#00f'
      ])
    ).toBe(false);
  });

  it('catches other cross-faded / non-data-driven properties, not just line-dasharray', () => {
    // A hand-list of names would miss these; deriving from the spec does not.
    expect(
      isUnevaluableByOl('layout', 'line', 'line-cap', [
        'match',
        ['get', 'k'],
        'a',
        'round',
        'butt'
      ])
    ).toBe(true);
  });

  it('keeps constants and leaves non-spec properties alone', () => {
    expect(isUnevaluableByOl('paint', 'line', 'line-dasharray', [2, 4])).toBe(
      false
    ); // constant, not an expression
    // icon-sort-key is not a MapLibre spec property: no spec, nothing to drop.
    expect(
      isUnevaluableByOl('layout', 'symbol', 'icon-sort-key', ['get', 'p'])
    ).toBe(false);
  });
});

describe('normaliseStyleForOl — properties the renderer cannot evaluate', () => {
  it('drops a data-driven line-dasharray but keeps supported data-driven properties', () => {
    const style = {
      layers: [
        {
          id: 'l1',
          type: 'line',
          paint: {
            'line-color': '#000',
            'line-dasharray': [
              'case',
              ['has', 'dashed'],
              ['literal', [4, 2]],
              ['literal', [1, 0]]
            ]
          }
        },
        {
          id: 'l2',
          type: 'fill',
          paint: { 'fill-pattern': ['get', 'pattern'], 'fill-color': '#eee' }
        },
        {
          id: 'l3',
          type: 'symbol',
          layout: {
            'symbol-sort-key': ['to-number', ['get', 'population']],
            'text-field': ['get', 'name']
          }
        }
      ]
    };
    const out = normaliseStyleForOl(style);
    // the freeze cause is removed…
    expect('line-dasharray' in (out.layers![0].paint as object)).toBe(false);
    expect(
      (out.layers![0].paint as { 'line-color': string })['line-color']
    ).toBe('#000');
    // …but data-driven pattern / sort-key / text-field survive (they render)
    expect(
      (out.layers![1].paint as { 'fill-pattern': unknown })['fill-pattern']
    ).toEqual(['get', 'pattern']);
    expect(
      (out.layers![2].layout as { 'symbol-sort-key': unknown })[
        'symbol-sort-key'
      ]
    ).toEqual(['to-number', ['get', 'population']]);
    expect(
      (out.layers![2].layout as { 'text-field': unknown })['text-field']
    ).toEqual(['get', 'name']);
  });

  it('keeps a CONSTANT value for a cross-faded property', () => {
    const style = {
      layers: [{ id: 'l1', type: 'line', paint: { 'line-dasharray': [2, 4] } }]
    };
    const out = normaliseStyleForOl(style);
    expect(
      (out.layers![0].paint as { 'line-dasharray': number[] })['line-dasharray']
    ).toEqual([2, 4]);
  });
});
