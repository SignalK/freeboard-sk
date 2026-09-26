import { expect, describe, it, vi, afterEach } from 'vitest';
import {
  applyChartTimeToTileSource,
  applyMapStyle,
  dropUnreachableSprites,
  applyChartTimeToWms,
  applyChartTimeToWmts,
  CHART_TIME_LIVE_KEY,
  extentFromBounds,
  createTileRecoveryScheduler,
  startChartTileRecovery,
  fetchArrayBufferWithRetry,
  isChartInView,
  isUnevaluableByOl,
  isZoomWithinLayerRange,
  makeChartTilesResilient,
  MAX_CHART_REFRESH_INTERVAL_MS,
  MIN_CHART_REFRESH_INTERVAL_MS,
  normaliseStyleForOl,
  resolveLayerMaxZoom,
  resolveLayerZoomRange,
  startChartTileRefresh,
  cacheBustTileUrl,
  CHART_REFRESH_URL_PARAM,
  webMercatorMatrixSet
} from './chart-utils';

import LayerGroup from 'ol/layer/Group';
import TileLayer from 'ol/layer/Tile';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import XYZ from 'ol/source/XYZ';
import TileWMS from 'ol/source/TileWMS';
import WMTS from 'ol/source/WMTS';
import WMTSTileGrid from 'ol/tilegrid/WMTS';
import MVT from 'ol/format/MVT';
import TileState from 'ol/TileState';

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

/** Minimal `Response`-like stub for the injected fetch. */
function okResponse(bytes = 4): Response {
  return {
    ok: true,
    status: 200,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(bytes))
  } as unknown as Response;
}

function errorResponse(
  status: number,
  headers: Record<string, string> = {}
): Response {
  return {
    ok: false,
    status,
    headers: { get: (name: string) => headers[name] ?? null },
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
  } as unknown as Response;
}

/** A fetch that never settles until its abort signal fires (a stalled request). */
function stalledFetch(): typeof fetch {
  return ((_url: string, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () =>
        reject(new DOMException('Aborted', 'AbortError'))
      );
    })) as unknown as typeof fetch;
}

describe('applyMapStyle', () => {
  const url = 'https://example/style.json';
  const seamap = () => ({
    version: 8,
    sources: { seamap: {} },
    layers: [
      { id: 'background', type: 'background' },
      { id: 'depths', type: 'fill', source: 'seamap' }
    ]
  });
  const styleResponse = (finalUrl = url) =>
    (() =>
      Promise.resolve({
        ok: true,
        url: finalUrl,
        json: () => Promise.resolve(seamap())
      })) as unknown as typeof fetch;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applies the normalised style once, resolved against the final URL', async () => {
    const group = new LayerGroup();
    const applyFn = vi.fn().mockResolvedValue(undefined);
    const makeResilient = vi.fn();

    await applyMapStyle(group, url, {
      fetchImpl: styleResponse('https://cdn.example/style.json'),
      applyFn,
      makeResilient
    });

    expect(applyFn).toHaveBeenCalledTimes(1);
    const [target, style, options] = applyFn.mock.calls[0];
    expect(target).toBe(group);
    expect(
      (style as { layers: { id: string }[] }).layers.map((l) => l.id)
    ).toEqual(['background', 'depths']);
    expect(options).toEqual({ styleUrl: 'https://cdn.example/style.json' });
    expect(makeResilient).toHaveBeenCalledWith(group);
  });

  // #796: a sprite set that fails to load makes ol-mapbox-style reject the
  // whole apply(). Re-applying the raw style to the same group put the
  // `background` layer (and every other stripped layer) back on top.
  it('does not re-apply the raw style when apply() itself rejects', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const group = new LayerGroup();
    const applyFn = vi
      .fn()
      .mockRejectedValue(new Error('Sprites cannot be loaded'));
    const makeResilient = vi.fn();

    await expect(
      applyMapStyle(group, url, {
        fetchImpl: styleResponse(),
        applyFn,
        makeResilient
      })
    ).resolves.toBeTypeOf('function'); // returns a (no-op) recovery teardown

    expect(applyFn).toHaveBeenCalledTimes(1);
    expect(applyFn.mock.calls[0][1]).not.toBe(url);
    expect(makeResilient).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('could not apply style'),
      expect.any(Error)
    );
  });

  it('drops an unreachable sprite set before applying (#800)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const group = new LayerGroup();
    const applyFn = vi.fn().mockResolvedValue(undefined);
    const withSprites = {
      ...seamap(),
      sprite: [
        { id: 'dead', url: 'https://gone.example/sprites' },
        { id: 'live', url: 'https://example/sprites' }
      ]
    };
    const fetchImpl = ((u: string) =>
      Promise.resolve(
        u === url
          ? { ok: true, url, json: () => Promise.resolve(withSprites) }
          : { ok: u === 'https://example/sprites.json', status: 404 }
      )) as unknown as typeof fetch;

    await applyMapStyle(group, url, {
      fetchImpl,
      applyFn,
      makeResilient: vi.fn()
    });

    expect(applyFn).toHaveBeenCalledTimes(1);
    expect((applyFn.mock.calls[0][1] as { sprite: unknown }).sprite).toEqual([
      { id: 'live', url: 'https://example/sprites' }
    ]);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('sprite sets that cannot be loaded'),
      ['https://gone.example/sprites.json']
    );
  });

  it('falls back to the raw URL only when the style cannot be fetched', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const group = new LayerGroup();
    const applyFn = vi.fn().mockResolvedValue(undefined);
    const fetchImpl = (() =>
      Promise.resolve({ ok: false, status: 404 })) as unknown as typeof fetch;

    await applyMapStyle(group, url, { fetchImpl, applyFn });

    expect(applyFn).toHaveBeenCalledTimes(1);
    expect(applyFn.mock.calls[0][1]).toBe(url);
    expect(applyFn.mock.calls[0][2]).toEqual({ styleUrl: url });
  });
});

describe('dropUnreachableSprites', () => {
  const styleUrl = 'https://tiles.example/seamap/style.json';
  /** fetch stub answering 200 for URLs in `ok`, 404 otherwise; records calls. */
  const fetchAnswering = (ok: string[], calls: string[] = []) =>
    ((url: string) => {
      calls.push(url);
      return Promise.resolve({ ok: ok.includes(url), status: 404 });
    }) as unknown as typeof fetch;

  it('is a no-op on a style with no sprite', async () => {
    const style = { version: 8 };
    const calls: string[] = [];
    expect(
      await dropUnreachableSprites(style, styleUrl, fetchAnswering([], calls))
    ).toEqual([]);
    expect(calls).toEqual([]);
    expect(style).toEqual({ version: 8 });
  });

  it('checks the .json index of each set, resolved against the style URL', async () => {
    const style = {
      sprite: [
        { id: 'a', url: 'https://cdn.example/sprites/a' },
        { id: 'b', url: '../sprites/b?key=1' }
      ]
    };
    const calls: string[] = [];
    await dropUnreachableSprites(
      style,
      styleUrl,
      fetchAnswering(
        [
          'https://cdn.example/sprites/a.json',
          'https://tiles.example/sprites/b.json?key=1'
        ],
        calls
      )
    );
    expect(calls.sort()).toEqual([
      'https://cdn.example/sprites/a.json',
      'https://tiles.example/sprites/b.json?key=1'
    ]);
    expect(style.sprite).toEqual([
      { id: 'a', url: 'https://cdn.example/sprites/a' },
      { id: 'b', url: '../sprites/b?key=1' }
    ]);
  });

  // The Open Waters Seamap shape (#800): one of two sets has gone away.
  it('drops only the sets whose index fails, keeping ids of the rest', async () => {
    const style = {
      sprite: [
        {
          id: 'basics',
          url: 'https://tiles.versatiles.org/assets/sprites/basics/sprites'
        },
        {
          id: 'freenauticalchart',
          url: 'https://tiles.example/seamap/sprites/freenauticalchart'
        }
      ]
    };
    const dropped = await dropUnreachableSprites(
      style,
      styleUrl,
      fetchAnswering([
        'https://tiles.example/seamap/sprites/freenauticalchart.json'
      ])
    );
    expect(dropped).toEqual([
      'https://tiles.versatiles.org/assets/sprites/basics/sprites.json'
    ]);
    expect(style.sprite).toEqual([
      {
        id: 'freenauticalchart',
        url: 'https://tiles.example/seamap/sprites/freenauticalchart'
      }
    ]);
  });

  it('removes `sprite` entirely when every set fails, including a network error', async () => {
    const style = { sprite: 'https://cdn.example/sprites/only' };
    const fetchImpl = (() =>
      Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    expect(await dropUnreachableSprites(style, styleUrl, fetchImpl)).toEqual([
      'https://cdn.example/sprites/only.json'
    ]);
    expect('sprite' in style).toBe(false);
  });

  it('leaves a reachable string sprite as a string', async () => {
    const style = { sprite: 'https://cdn.example/sprites/only' };
    await dropUnreachableSprites(
      style,
      styleUrl,
      fetchAnswering(['https://cdn.example/sprites/only.json'])
    );
    expect(style.sprite).toBe('https://cdn.example/sprites/only');
  });

  it('does not probe non-http sprite URLs and keeps them', async () => {
    const style = { sprite: 'mapbox://sprites/mapbox/streets-v8' };
    const calls: string[] = [];
    expect(
      await dropUnreachableSprites(style, styleUrl, fetchAnswering([], calls))
    ).toEqual([]);
    expect(calls).toEqual([]);
    expect(style.sprite).toBe('mapbox://sprites/mapbox/streets-v8');
  });
});

describe('fetchArrayBufferWithRetry', () => {
  const fast = { timeoutMs: 50, retries: 2, backoffMs: 1 };

  it('resolves the body on the first successful attempt', async () => {
    let calls = 0;
    const fetchImpl = (() => {
      calls++;
      return Promise.resolve(okResponse(8));
    }) as unknown as typeof fetch;

    const buf = await fetchArrayBufferWithRetry('u', fast, fetchImpl);
    expect(buf.byteLength).toBe(8);
    expect(calls).toBe(1);
  });

  it('retries after a network failure and then succeeds', async () => {
    let calls = 0;
    const fetchImpl = (() => {
      calls++;
      return calls === 1
        ? Promise.reject(new Error('network'))
        : Promise.resolve(okResponse());
    }) as unknown as typeof fetch;

    await fetchArrayBufferWithRetry('u', fast, fetchImpl);
    expect(calls).toBe(2);
  });

  it('retries a 5xx and a 429, but not a 404', async () => {
    for (const status of [503, 429]) {
      let calls = 0;
      const fetchImpl = (() => {
        calls++;
        return calls === 1
          ? // Retry-After: 0 keeps the 429 case fast; without it a 429 backs off
            // hard (>=60s) on purpose, which is covered by its own test below.
            Promise.resolve(
              errorResponse(
                status,
                status === 429 ? { 'Retry-After': '0' } : {}
              )
            )
          : Promise.resolve(okResponse());
      }) as unknown as typeof fetch;
      await fetchArrayBufferWithRetry('u', fast, fetchImpl);
      expect(calls).toBe(2); // retried once
    }

    let calls = 0;
    const fetchImpl = (() => {
      calls++;
      return Promise.resolve(errorResponse(404));
    }) as unknown as typeof fetch;
    await expect(
      fetchArrayBufferWithRetry('u', fast, fetchImpl)
    ).rejects.toThrow('404');
    expect(calls).toBe(1); // 4xx is definitive — not retried
  });

  it('aborts a stalled attempt via the timeout and recovers on retry', async () => {
    let calls = 0;
    const stalled = stalledFetch();
    const fetchImpl = ((url: string, init?: RequestInit) => {
      calls++;
      return calls === 1 ? stalled(url, init) : Promise.resolve(okResponse());
    }) as unknown as typeof fetch;

    await fetchArrayBufferWithRetry('u', fast, fetchImpl);
    expect(calls).toBe(2);
  });

  it('rejects once every attempt has failed', async () => {
    let calls = 0;
    const fetchImpl = (() => {
      calls++;
      return Promise.reject(new Error('down'));
    }) as unknown as typeof fetch;

    await expect(
      fetchArrayBufferWithRetry('u', fast, fetchImpl)
    ).rejects.toThrow('down');
    expect(calls).toBe(fast.retries + 1);
  });

  it('retries past the default limit and self-heals when retries is Infinity', async () => {
    let calls = 0;
    const fetchImpl = (() => {
      calls++;
      return calls <= 4
        ? Promise.reject(new Error('offline'))
        : Promise.resolve(okResponse());
    }) as unknown as typeof fetch;

    const buf = await fetchArrayBufferWithRetry(
      'u',
      { ...fast, retries: Number.POSITIVE_INFINITY },
      fetchImpl
    );
    expect(buf.byteLength).toBeGreaterThan(0);
    expect(calls).toBe(5); // kept trying well past the default 2 retries
  });

  it('stops retrying when shouldContinue turns false (tile discarded)', async () => {
    let calls = 0;
    let live = true;
    const fetchImpl = (() => {
      calls++;
      live = false; // OpenLayers discards the tile after the first attempt
      return Promise.reject(new Error('offline'));
    }) as unknown as typeof fetch;

    await expect(
      fetchArrayBufferWithRetry(
        'u',
        {
          ...fast,
          retries: Number.POSITIVE_INFINITY,
          shouldContinue: () => live
        },
        fetchImpl
      )
    ).rejects.toHaveProperty('name', 'AbortError');
    expect(calls).toBe(1); // did not keep hammering a discarded tile
  });

  it('gives up after maxElapsedMs even with unlimited retries', async () => {
    let calls = 0;
    const fetchImpl = (() => {
      calls++;
      return Promise.reject(new Error('offline'));
    }) as unknown as typeof fetch;

    // Unbounded retries, but a tiny self-heal window: it must terminate, not
    // loop forever, so a dropped-but-not-disposed tile can't retry indefinitely.
    await expect(
      fetchArrayBufferWithRetry(
        'u',
        {
          timeoutMs: 50,
          retries: Number.POSITIVE_INFINITY,
          backoffMs: 1,
          maxElapsedMs: 25
        },
        fetchImpl
      )
    ).rejects.toThrow('offline');
    expect(calls).toBeGreaterThan(0);
  });

  it('retries a 429 honouring Retry-After rather than treating it as final', async () => {
    let calls = 0;
    const fetchImpl = (() => {
      calls++;
      return calls === 1
        ? Promise.resolve(errorResponse(429, { 'Retry-After': '0' }))
        : Promise.resolve(okResponse());
    }) as unknown as typeof fetch;

    const buf = await fetchArrayBufferWithRetry('u', fast, fetchImpl);
    expect(buf.byteLength).toBeGreaterThan(0);
    expect(calls).toBe(2); // 429 is retryable; Retry-After: 0 retries immediately
  });

  it('gives up rather than wait a Retry-After that overruns the window', async () => {
    let calls = 0;
    const fetchImpl = (() => {
      calls++;
      return Promise.resolve(errorResponse(429, { 'Retry-After': '3600' }));
    }) as unknown as typeof fetch;

    // A 1-hour Retry-After must not hold the slot: the wait overruns the 100ms
    // window, so it errors at once and leaves recovery to reload later.
    await expect(
      fetchArrayBufferWithRetry(
        'u',
        {
          timeoutMs: 50,
          retries: Number.POSITIVE_INFINITY,
          backoffMs: 1,
          maxElapsedMs: 100
        },
        fetchImpl
      )
    ).rejects.toThrow('429');
    expect(calls).toBe(1);
  });

  it('marks a definitive 4xx so the caller can render an empty tile', async () => {
    const fetchImpl = (() =>
      Promise.resolve(errorResponse(404))) as unknown as typeof fetch;
    const err = await fetchArrayBufferWithRetry('u', fast, fetchImpl).catch(
      (e) => e
    );
    expect(err).toBeInstanceOf(Error);
    expect((err as { definitive?: boolean }).definitive).toBe(true);
  });
});

describe('createTileRecoveryScheduler', () => {
  afterEach(() => vi.useRealTimers());

  it('rotates once after the min delay when a tile errors, then backs off', () => {
    vi.useFakeTimers();
    const rotate = vi.fn();
    const s = createTileRecoveryScheduler({
      rotate,
      minDelayMs: 100,
      maxDelayMs: 400
    });

    s.onError();
    s.onError(); // coalesced — still a single pending rotation
    vi.advanceTimersByTime(99);
    expect(rotate).toHaveBeenCalledTimes(0);
    vi.advanceTimersByTime(1);
    expect(rotate).toHaveBeenCalledTimes(1);

    s.onError(); // still failing: the next attempt waits the doubled delay
    vi.advanceTimersByTime(199);
    expect(rotate).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(rotate).toHaveBeenCalledTimes(2);
  });

  it('resets the back-off after a successful load', () => {
    vi.useFakeTimers();
    const rotate = vi.fn();
    const s = createTileRecoveryScheduler({
      rotate,
      minDelayMs: 100,
      maxDelayMs: 400
    });
    s.onError();
    vi.advanceTimersByTime(100); // rotate #1; back-off would grow to 200
    s.onLoadEnd(); // recovered — reset back to the min delay
    s.onError();
    vi.advanceTimersByTime(100);
    expect(rotate).toHaveBeenCalledTimes(2);
  });

  it('does not reset the back-off on a success while a rotation is pending', () => {
    vi.useFakeTimers();
    const rotate = vi.fn();
    const s = createTileRecoveryScheduler({
      rotate,
      minDelayMs: 100,
      maxDelayMs: 800
    });
    s.onError();
    vi.advanceTimersByTime(100); // rotate #1; back-off grows to 200
    s.onError(); // a tile is still failing: rotation armed at 200
    s.onLoadEnd(); // sibling loads from cache — must NOT reset while armed
    vi.advanceTimersByTime(199);
    expect(rotate).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1); // fires at 200, proving the delay wasn't reset to 100
    expect(rotate).toHaveBeenCalledTimes(2);
  });

  it('triggerNow rotates immediately and cancels a pending rotation', () => {
    vi.useFakeTimers();
    const rotate = vi.fn();
    const s = createTileRecoveryScheduler({ rotate, minDelayMs: 100 });
    s.onError();
    s.triggerNow();
    expect(rotate).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    expect(rotate).toHaveBeenCalledTimes(1);
  });

  it('teardown drops any pending rotation', () => {
    vi.useFakeTimers();
    const rotate = vi.fn();
    const s = createTileRecoveryScheduler({ rotate, minDelayMs: 100 });
    s.onError();
    s.teardown();
    vi.advanceTimersByTime(1000);
    expect(rotate).toHaveBeenCalledTimes(0);
  });
});

describe('startChartTileRecovery', () => {
  afterEach(() => vi.useRealTimers());

  const makeGroup = () => {
    const source = new VectorTileSource({
      format: new MVT(),
      url: 'https://tiles.example/{z}/{x}/{y}.pbf'
    });
    const group = new LayerGroup({
      layers: [new VectorTileLayer({ source })]
    });
    return { source, group };
  };

  it('rotates a real source key on tileloaderror without cache-busting the URL', () => {
    vi.useFakeTimers();
    const { source, group } = makeGroup();
    const keyBefore = source.getKey();
    const stop = startChartTileRecovery(group, {
      minDelayMs: 50,
      maxDelayMs: 200
    });

    source.dispatchEvent('tileloaderror');
    vi.advanceTimersByTime(50);

    // Key rotated -> OpenLayers rebuilds the tiles and re-requests the failed one.
    expect(source.getKey()).not.toBe(keyBefore);
    // ...but the tile URL is unchanged (no _refresh), so cached tiles are reused.
    const url = source.getTileUrlFunction()(
      [5, 10, 12] as [number, number, number],
      1,
      source.getProjection()!
    );
    expect(url).toBeTypeOf('string');
    expect(url).not.toContain('_refresh');

    stop();
  });

  it('relies on OpenLayers exposing sourceTiles_ (canary for recovery eviction)', () => {
    // Recovery eviction (startChartTileRecovery) reads the private sourceTiles_
    // cache to drop errored tiles. We allow any ol@^10.x; if a minor bump renames
    // that field, the guarded access silently degrades to a key-only rotation
    // that recovers nothing (see the f836b87 regression). This canary — a fresh
    // source, deliberately NOT seeded — fails CI on that rename instead of
    // letting recovery quietly regress in the field.
    const source = new VectorTileSource({
      format: new MVT(),
      url: 'https://tiles.example/{z}/{x}/{y}.pbf'
    });
    const cache = (source as unknown as { sourceTiles_?: unknown })
      .sourceTiles_;
    expect(cache).toBeTypeOf('object');
    expect(cache).not.toBeNull();
  });

  it('evicts only errored source tiles on recovery so they reload, keeping loaded ones cached', () => {
    vi.useFakeTimers();
    const { source, group } = makeGroup();
    // OpenLayers caches vector source tiles by URL; seed one errored and one
    // loaded so we can assert recovery drops only the errored one.
    const src = source as unknown as {
      sourceTiles_: Record<string, { getState: () => number }>;
    };
    src.sourceTiles_ = src.sourceTiles_ ?? {};
    const erroredUrl = 'https://tiles.example/5/1/1.pbf';
    const loadedUrl = 'https://tiles.example/5/1/2.pbf';
    src.sourceTiles_[erroredUrl] = { getState: () => TileState.ERROR };
    src.sourceTiles_[loadedUrl] = { getState: () => TileState.LOADED };

    const stop = startChartTileRecovery(group, { minDelayMs: 50 });
    source.dispatchEvent('tileloaderror');
    vi.advanceTimersByTime(50);

    // Errored tile dropped -> OL rebuilds it as IDLE and refetches it.
    expect(erroredUrl in src.sourceTiles_).toBe(false);
    // Loaded tile kept -> reused from cache at its unchanged URL, not re-downloaded.
    expect(loadedUrl in src.sourceTiles_).toBe(true);
    stop();
  });

  it('stops rotating after teardown', () => {
    vi.useFakeTimers();
    const { source, group } = makeGroup();
    const stop = startChartTileRecovery(group, { minDelayMs: 50 });
    stop();
    const key = source.getKey();
    source.dispatchEvent('tileloaderror');
    vi.advanceTimersByTime(500);
    expect(source.getKey()).toBe(key);
  });
});

describe('makeChartTilesResilient', () => {
  afterEach(() => vi.restoreAllMocks());

  const vectorSource = (): VectorTileSource =>
    new VectorTileSource({
      format: new MVT(),
      url: 'https://example.test/{z}/{x}/{y}.pbf'
    });

  /** Fake VectorTile capturing the loader the resilient loader installs. */
  function fakeTile(features: unknown[]) {
    const setFeatures = vi.fn();
    const setState = vi.fn();
    let loader:
      | ((extent: number[], resolution: number, projection: unknown) => void)
      | undefined;
    const tile = {
      setLoader: (cb: typeof loader) => {
        loader = cb;
      },
      getFormat: () => ({ readFeatures: () => features }),
      setFeatures,
      setState
    };
    return {
      tile,
      setFeatures,
      setState,
      run: () => loader!([0, 0, 1, 1], 1, null)
    };
  }

  it('replaces the tile load function on vector tile sources', () => {
    const source = vectorSource();
    const before = source.getTileLoadFunction();
    const group = new LayerGroup({ layers: [new VectorTileLayer({ source })] });

    makeChartTilesResilient(group);

    expect(source.getTileLoadFunction()).not.toBe(before);
  });

  it('leaves raster (image) tile sources untouched', () => {
    const source = new XYZ({ url: 'https://example.test/{z}/{x}/{y}.png' });
    const before = source.getTileLoadFunction();
    const group = new LayerGroup({ layers: [new TileLayer({ source })] });

    makeChartTilesResilient(group);

    expect(source.getTileLoadFunction()).toBe(before);
  });

  it('recurses into nested layer groups', () => {
    const source = vectorSource();
    const before = source.getTileLoadFunction();
    const group = new LayerGroup({
      layers: [new LayerGroup({ layers: [new VectorTileLayer({ source })] })]
    });

    makeChartTilesResilient(group);

    expect(source.getTileLoadFunction()).not.toBe(before);
  });

  it('installs a loader that fetches, parses and sets features on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(4))
    } as unknown as Response);

    const source = vectorSource();
    const group = new LayerGroup({ layers: [new VectorTileLayer({ source })] });
    makeChartTilesResilient(group, { timeoutMs: 50, retries: 1, backoffMs: 1 });

    const features = [{}, {}];
    const t = fakeTile(features);
    (source.getTileLoadFunction() as (tile: unknown, url: string) => void)(
      t.tile,
      'https://example.test/0/0/0.pbf'
    );
    t.run();

    await vi.waitFor(() =>
      expect(t.setFeatures).toHaveBeenCalledWith(features)
    );
    expect(t.setState).not.toHaveBeenCalled();
  });

  it('installs a loader that errors the tile after retries are exhausted', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

    const source = vectorSource();
    const group = new LayerGroup({ layers: [new VectorTileLayer({ source })] });
    makeChartTilesResilient(group, { timeoutMs: 50, retries: 1, backoffMs: 1 });

    const t = fakeTile([]);
    (source.getTileLoadFunction() as (tile: unknown, url: string) => void)(
      t.tile,
      'u'
    );
    t.run();

    await vi.waitFor(() =>
      expect(t.setState).toHaveBeenCalledWith(TileState.ERROR)
    );
    expect(t.setFeatures).not.toHaveBeenCalled();
  });
});

describe('startChartTileRefresh', () => {
  afterEach(() => vi.useRealTimers());

  const source = () => new XYZ({ url: 'https://example.test/{z}/{x}/{y}.png' });

  it('rotates the source key on each tick, and stops when told', () => {
    vi.useFakeTimers();
    const src = source();
    // Assert the observable outcome — the source cache key really rotated via
    // the public API — rather than that a particular setter was called.
    const initialKey = src.getKey();
    const interval = 2 * MIN_CHART_REFRESH_INTERVAL_MS;

    const stop = startChartTileRefresh(src, interval);
    expect(src.getKey()).toBe(initialKey); // nothing on install
    vi.advanceTimersByTime(interval);
    const firstRefreshKey = src.getKey();
    expect(firstRefreshKey).not.toBe(initialKey);
    vi.advanceTimersByTime(interval);
    const secondRefreshKey = src.getKey();
    expect(secondRefreshKey).not.toBe(firstRefreshKey);

    stop();
    vi.advanceTimersByTime(interval * 3);
    expect(src.getKey()).toBe(secondRefreshKey); // no ticks after stop
  });

  it('runs beforeTick first on each tick, and wraps what it left on the source', () => {
    vi.useFakeTimers();
    const src = source();
    const interval = 2 * MIN_CHART_REFRESH_INTERVAL_MS;
    const beforeTick = vi.fn(() =>
      src.setUrl('https://example.test/t2/{z}/{x}/{y}.png')
    );
    startChartTileRefresh(src, interval, beforeTick);
    expect(beforeTick).not.toHaveBeenCalled(); // nothing on install
    vi.advanceTimersByTime(interval);
    expect(beforeTick).toHaveBeenCalledTimes(1);
    // The retarget made in beforeTick is what the cache-busted tick requests.
    const url = src.getTileUrlFunction()([3, 1, 2], 1, src.getProjection());
    expect(url).toMatch(
      /^https:\/\/example\.test\/t2\/3\/1\/2\.png\?_refresh=/
    );
  });

  it('installs no timer when refreshInterval is absent, 0 or non-finite', () => {
    vi.useFakeTimers();
    const src = source();
    const initialKey = src.getKey();

    startChartTileRefresh(src, 0);
    startChartTileRefresh(src, undefined);
    startChartTileRefresh(src); // no interval at all
    startChartTileRefresh(src, Infinity);
    startChartTileRefresh(src, NaN);
    vi.advanceTimersByTime(10 * MIN_CHART_REFRESH_INTERVAL_MS);

    expect(src.getKey()).toBe(initialKey);
  });

  it('clamps an interval below the minimum up to the floor', () => {
    vi.useFakeTimers();
    const src = source();
    const initialKey = src.getKey();

    startChartTileRefresh(src, 1000); // 1 s requested
    vi.advanceTimersByTime(1000);
    expect(src.getKey()).toBe(initialKey); // did not fire at the requested 1 s
    vi.advanceTimersByTime(MIN_CHART_REFRESH_INTERVAL_MS - 1000);
    expect(src.getKey()).not.toBe(initialKey); // fired at the 60 s floor
  });

  it('caps an oversized interval so the timer cannot fire near-continuously', () => {
    vi.useFakeTimers();
    const src = source();
    const initialKey = src.getKey();

    // Above MAX; a raw setInterval delay this large overflows and fires ~at once.
    startChartTileRefresh(src, MAX_CHART_REFRESH_INTERVAL_MS * 4);
    vi.advanceTimersByTime(MAX_CHART_REFRESH_INTERVAL_MS - 1);
    expect(src.getKey()).toBe(initialKey); // has not fired before the cap
    vi.advanceTimersByTime(1);
    expect(src.getKey()).not.toBe(initialKey); // fires at the cap
  });

  // #783: rotating the key alone re-requests the same URL, which Chrome serves
  // back from its in-memory image cache for the life of the page even when the
  // server sent no caching headers -- so the refresh showed the old frame on
  // public WMS servers (IEM NEXRAD). Each tick must change the URL itself.
  describe('cache-busts the tile URL', () => {
    const tileUrl = (src: XYZ) =>
      src.getTileUrlFunction()([3, 1, 2], 1, src.getProjection());
    const param = (url: string) =>
      new URL(url).searchParams.get(CHART_REFRESH_URL_PARAM);

    it('leaves the URL alone until the first tick, then stamps a fresh key on each', () => {
      vi.useFakeTimers();
      const src = source();
      const interval = 2 * MIN_CHART_REFRESH_INTERVAL_MS;

      startChartTileRefresh(src, interval);
      expect(tileUrl(src)).toBe('https://example.test/3/1/2.png');

      vi.advanceTimersByTime(interval);
      const first = tileUrl(src);
      expect(first.startsWith('https://example.test/3/1/2.png?')).toBe(true);
      expect(param(first)).toBe(src.getKey());

      vi.advanceTimersByTime(interval);
      const second = tileUrl(src);
      expect(second).not.toBe(first);
      expect(param(second)).toBe(src.getKey());
    });

    it('appends to an existing query string and never stacks the parameter', () => {
      vi.useFakeTimers();
      const src = new XYZ({
        url: 'https://wms.test/ows?SERVICE=WMS&LAYERS=radar&BBOX={x},{y},{z}'
      });
      const interval = MIN_CHART_REFRESH_INTERVAL_MS;

      // Two timers on the same source, as a restart with a new interval leaves
      // behind when it wraps whatever URL function the source currently has.
      startChartTileRefresh(src, interval);
      vi.advanceTimersByTime(interval);
      startChartTileRefresh(src, interval);
      vi.advanceTimersByTime(interval * 3);

      const url = new URL(tileUrl(src));
      expect(url.searchParams.get('SERVICE')).toBe('WMS');
      expect(url.searchParams.get('LAYERS')).toBe('radar');
      expect(url.searchParams.getAll(CHART_REFRESH_URL_PARAM)).toHaveLength(1);
    });

    it('cacheBustTileUrl keeps an absent tile absent', () => {
      expect(cacheBustTileUrl(undefined, '1')).toBeUndefined();
      expect(cacheBustTileUrl('https://t.test/1.png', '7')).toBe(
        `https://t.test/1.png?${CHART_REFRESH_URL_PARAM}=7`
      );
    });

    it('cacheBustTileUrl puts the key before a fragment, which is never sent', () => {
      expect(cacheBustTileUrl('https://t.test/1.png#frag', '7')).toBe(
        `https://t.test/1.png?${CHART_REFRESH_URL_PARAM}=7#frag`
      );
      expect(cacheBustTileUrl('https://t.test/ows?a=1#frag', '7')).toBe(
        `https://t.test/ows?a=1&${CHART_REFRESH_URL_PARAM}=7#frag`
      );
    });
  });
});

describe('applying a chart time (temporal charts)', () => {
  const T0 = '2026-09-18T12:00:00.000Z';
  const T1 = '2026-09-18T12:05:00.000Z';
  // A tile the source would request, so the URL actually built is asserted —
  // not just that some setter ran.
  const tileUrl = (src: XYZ) =>
    src.getTileUrlFunction()([3, 1, 2], 1, src.getProjection());

  describe('URL-template source (tilelayer / tileJSON)', () => {
    const LIVE = 'https://r.test/{z}/{x}/{y}.png';
    const TEMPLATE = 'https://r.test/{z}/{x}/{y}.png?time={time}';

    it('requests the instant through the time.url template', () => {
      const src = new XYZ({ url: LIVE });
      applyChartTimeToTileSource(src, T0, TEMPLATE, LIVE);
      expect(tileUrl(src)).toBe(
        'https://r.test/3/1/2.png?time=2026-09-18T12%3A00%3A00.000Z'
      );
    });

    it('rotates the source key per instant, so the previous frame is kept as stale', () => {
      const src = new XYZ({ url: LIVE });
      const liveKey = src.getKey();
      applyChartTimeToTileSource(src, T0, TEMPLATE, LIVE);
      const k0 = src.getKey();
      applyChartTimeToTileSource(src, T1, TEMPLATE, LIVE);
      expect(k0).not.toBe(liveKey);
      expect(src.getKey()).not.toBe(k0);
    });

    it('returns to the live URL for null', () => {
      const src = new XYZ({ url: LIVE });
      const liveKey = src.getKey();
      applyChartTimeToTileSource(src, T0, TEMPLATE, LIVE);
      applyChartTimeToTileSource(src, null, TEMPLATE, LIVE);
      expect(tileUrl(src)).toBe('https://r.test/3/1/2.png');
      expect(src.getKey()).toBe(liveKey);
    });

    it('returns to a live tile-URL function (tileJSON) for null', () => {
      const src = new XYZ({ url: LIVE });
      const live = src.getTileUrlFunction();
      applyChartTimeToTileSource(src, T0, TEMPLATE, live);
      applyChartTimeToTileSource(src, null, TEMPLATE, live);
      expect(src.getTileUrlFunction()).toBe(live);
      expect(src.getKey()).toBe(CHART_TIME_LIVE_KEY);
    });

    it('leaves the source alone when there is no template for an instant', () => {
      const src = new XYZ({ url: LIVE });
      const key = src.getKey();
      applyChartTimeToTileSource(src, T0, undefined, LIVE);
      expect(src.getKey()).toBe(key);
      expect(tileUrl(src)).toBe('https://r.test/3/1/2.png');
    });
  });

  describe('WMS', () => {
    const source = () =>
      new TileWMS({ url: 'https://wms.test/', params: { LAYERS: 'radar' } });

    it('sends the instant as TIME and rotates the key', () => {
      const src = source();
      const liveKey = src.getKey();
      applyChartTimeToWms(src, T0);
      expect(src.getParams().TIME).toBe(T0);
      expect(src.getKey()).not.toBe(liveKey);
    });

    it('drops TIME for null so the server default applies', () => {
      const src = source();
      applyChartTimeToWms(src, T0);
      applyChartTimeToWms(src, null);
      expect(src.getParams().TIME).toBeUndefined();
      expect(src.getParams().LAYERS).toBe('radar');
    });
  });

  describe('WMTS', () => {
    const source = (dimensions: Record<string, unknown>) =>
      new WMTS({
        urls: ['https://wmts.test/{Time}/{TileMatrix}/{TileRow}/{TileCol}.png'],
        layer: 'radar',
        style: 'default',
        matrixSet: 'EPSG:3857',
        format: 'image/png',
        requestEncoding: 'REST',
        tileGrid: new WMTSTileGrid({
          origin: [-20037508.34, 20037508.34],
          resolutions: [156543.03, 78271.52],
          matrixIds: ['0', '1']
        }),
        dimensions
      });

    it('sets the Time dimension, matching the name the capabilities used', () => {
      const src = source({ TIME: 'default' });
      const liveKey = src.getKey();
      applyChartTimeToWmts(src, T0, { TIME: 'default' });
      expect(src.getDimensions()).toEqual({ TIME: T0 });
      expect(src.getKey()).not.toBe(liveKey);
    });

    it('restores the declared default for null rather than removing it', () => {
      const src = source({ Time: 'default' });
      applyChartTimeToWmts(src, T0, { Time: 'default' });
      applyChartTimeToWmts(src, null, { Time: 'default' });
      expect(src.getDimensions()).toEqual({ Time: 'default' });
    });

    it('uses Time when the capabilities declared no dimension', () => {
      const src = source({});
      applyChartTimeToWmts(src, T0, {});
      expect(src.getDimensions()).toEqual({ Time: T0 });
    });
  });
});

describe('webMercatorMatrixSet', () => {
  /** Capabilities for one layer linking `links`, drawn from `sets`. */
  const caps = (links: string[], sets: Array<[string, string]>) => ({
    Contents: {
      Layer: [
        {
          Identifier: 'charts',
          TileMatrixSetLink: links.map((TileMatrixSet) => ({ TileMatrixSet }))
        }
      ],
      TileMatrixSet: sets.map(([Identifier, SupportedCRS]) => ({
        Identifier,
        SupportedCRS
      }))
    }
  });

  it('finds a Web Mercator set under another name, listed after other projections', () => {
    // Kartverket sjøkart: UTM zones first, in CRSs OpenLayers does not know.
    const c = caps(
      ['utm32n', 'utm33n', 'webmercator'],
      [
        ['utm32n', 'urn:ogc:def:crs:EPSG:25832'],
        ['utm33n', 'urn:ogc:def:crs:EPSG:25833'],
        ['webmercator', 'urn:ogc:def:crs:EPSG:3857']
      ]
    );
    expect(webMercatorMatrixSet(c, 'charts')).toBe('webmercator');
  });

  it('matches the CRS through its equivalent codes', () => {
    const c = caps(
      ['EPSG:3395_FTA', 'WGS84_Pseudo-Mercator', 'GoogleMaps'],
      [
        ['EPSG:3395_FTA', 'EPSG:3395'],
        ['WGS84_Pseudo-Mercator', 'urn:ogc:def:crs:EPSG::3857'],
        ['GoogleMaps', 'EPSG:900913']
      ]
    );
    expect(webMercatorMatrixSet(c, 'charts')).toBe('WGS84_Pseudo-Mercator');
    const legacy = caps(
      ['inspire_quad', 'GoogleMaps'],
      [
        ['inspire_quad', 'urn:ogc:def:crs:EPSG::4326'],
        ['GoogleMaps', 'EPSG:900913']
      ]
    );
    expect(webMercatorMatrixSet(legacy, 'charts')).toBe('GoogleMaps');
  });

  it('keeps a set literally named EPSG:3857 ahead of other Web Mercator sets', () => {
    const c = caps(
      ['GoogleMapsCompatible', 'EPSG:3857'],
      [
        ['GoogleMapsCompatible', 'urn:ogc:def:crs:EPSG::3857'],
        ['EPSG:3857', 'urn:ogc:def:crs:EPSG::3857']
      ]
    );
    expect(webMercatorMatrixSet(c, 'charts')).toBe('EPSG:3857');
  });

  it('ignores a Web Mercator set the layer does not link', () => {
    const c = caps(
      ['inspire_quad'],
      [
        ['inspire_quad', 'urn:ogc:def:crs:EPSG::4326'],
        ['web_mercator', 'urn:ogc:def:crs:EPSG::3857']
      ]
    );
    expect(webMercatorMatrixSet(c, 'charts')).toBeUndefined();
  });

  it('returns undefined when there is no Web Mercator set or no such layer', () => {
    const c = caps(
      ['inspire_quad', 'utm32n'],
      [
        ['inspire_quad', 'urn:ogc:def:crs:EPSG::4326'],
        ['utm32n', 'urn:ogc:def:crs:EPSG:25832']
      ]
    );
    expect(webMercatorMatrixSet(c, 'charts')).toBeUndefined();
    expect(webMercatorMatrixSet(c, 'other')).toBeUndefined();
    expect(webMercatorMatrixSet(undefined, 'charts')).toBeUndefined();
  });
});
