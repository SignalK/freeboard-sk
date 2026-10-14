import { describe, expect, it } from 'vitest';
import type { OverlayStyle } from 'signalk-plotterext-bus/host';
import {
  analyzeLayer,
  expandTileUrl,
  globalStateValues,
  parseColor,
  parseOverlayStyle,
  parseReliefRamp,
  planSource,
  planSources,
  resolveGlobalState,
  resolveLayer,
  resolveOverlayUrl,
  type StyleLayer
} from './data-overlay-style';

const ORIGIN = 'http://sk.local:3000';

const RAMP = [
  'interpolate',
  ['linear'],
  ['elevation'],
  -32768,
  'rgba(0,0,0,0)',
  -201,
  'rgba(0,0,0,0)',
  -200,
  '#9cc8ec',
  0,
  '#f2f8fc'
];

/** The spec's example style, plus a raster source. */
const style = (): OverlayStyle =>
  ({
    version: 8,
    state: { unitFactor: { default: 1 }, safetyDepth: { default: 3 } },
    sources: {
      depth: {
        type: 'raster-dem',
        tiles: ['/plotterext/p/dem/{z}/{x}/{y}.png'],
        encoding: 'terrarium',
        tileSize: 256
      },
      contours: {
        type: 'vector',
        tiles: ['/plotterext/p/contours/{z}/{x}/{y}.pbf']
      },
      soundings: {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      },
      photo: {
        type: 'raster',
        tiles: ['https://tiles.example/{z}/{x}/{y}.png']
      }
    },
    layers: []
  }) as OverlayStyle;

function verdict(layer: Partial<StyleLayer>) {
  const s = style();
  const l = { id: 'l', ...layer } as StyleLayer;
  s.layers = [l];
  return analyzeLayer(s, l, planSources(s, ORIGIN));
}

describe('resolveOverlayUrl', () => {
  it('resolves a server-relative path against the server, keeping tile placeholders, with credentials', () => {
    expect(resolveOverlayUrl('/plotterext/p/{z}/{x}/{y}.png', ORIGIN)).toEqual({
      url: 'http://sk.local:3000/plotterext/p/{z}/{x}/{y}.png',
      credentials: 'include'
    });
  });

  it('uses only the origin of a server URL that has a path', () => {
    expect(
      resolveOverlayUrl('/a.json', 'https://boat.example/some/path/')?.url
    ).toBe('https://boat.example/a.json');
  });

  it('fetches an absolute https URL without credentials', () => {
    expect(
      resolveOverlayUrl('https://x.example/{z}/{x}/{y}.pbf', ORIGIN)
    ).toEqual({
      url: 'https://x.example/{z}/{x}/{y}.pbf',
      credentials: 'omit'
    });
  });

  it.each([
    'http://x.example/a.png',
    '//x.example/a.png',
    'tiles/{z}/{x}/{y}.png',
    'javascript:alert(1)',
    'data:application/json,{}',
    '',
    42
  ])('refuses %s', (url) => {
    expect(resolveOverlayUrl(url, ORIGIN)).toBeNull();
  });

  it('fills a tile template', () => {
    expect(expandTileUrl('/t/{z}/{x}/{y}.png?z={z}', 3, 4, 5)).toBe(
      '/t/3/4/5.png?z=3'
    );
  });
});

describe('parseOverlayStyle', () => {
  it('keeps version, state, sources and layers and drops what the host ignores', () => {
    const parsed = parseOverlayStyle({
      ...style(),
      glyphs: 'x',
      sprite: 'y',
      center: [0, 0],
      zoom: 3
    });
    expect(Object.keys(parsed as object).sort()).toEqual([
      'layers',
      'sources',
      'state',
      'version'
    ]);
  });

  it('copies the style, so later edits to the manifest object do not leak in', () => {
    const raw = style();
    const parsed = parseOverlayStyle(raw) as OverlayStyle;
    (raw.sources['depth'] as Record<string, unknown>)['tileSize'] = 1;
    expect(parsed.sources['depth']['tileSize']).toBe(256);
  });

  it.each([
    ['a version 7 style', { ...style(), version: 7 }],
    ['no sources', { version: 8, layers: [] }],
    ['layers not a list', { version: 8, sources: {}, layers: {} }],
    [
      'a layer without an id',
      { version: 8, sources: {}, layers: [{ type: 'line' }] }
    ],
    [
      'duplicate layer ids',
      {
        version: 8,
        sources: {},
        layers: [
          { id: 'a', type: 'line' },
          { id: 'a', type: 'fill' }
        ]
      }
    ],
    ['not an object', 'style.json']
  ])('rejects %s', (_label, raw) => {
    expect(parseOverlayStyle(raw)).toBeNull();
  });
});

describe('planSource', () => {
  it('reads the raster-dem encodings', () => {
    expect(
      planSource(
        {
          type: 'raster-dem',
          tiles: ['/t/{z}/{x}/{y}'],
          encoding: 'terrarium'
        },
        ORIGIN
      )
    ).toMatchObject({ encoding: { r: 256, g: 1, b: 1 / 256, base: 32768 } });
    expect(
      planSource({ type: 'raster-dem', tiles: ['/t/{z}/{x}/{y}'] }, ORIGIN)
    ).toMatchObject({
      encoding: { r: 6553.6, g: 25.6, b: 0.1, base: 10000 }
    });
    expect(
      planSource(
        {
          type: 'raster-dem',
          tiles: ['/t/{z}/{x}/{y}'],
          encoding: 'custom',
          redFactor: 2,
          baseShift: 5
        },
        ORIGIN
      )
    ).toMatchObject({ encoding: { r: 2, g: 1, b: 1, base: 5 } });
  });

  it('defaults tileSize to 512, as the Style Spec does', () => {
    expect(
      planSource({ type: 'raster', tiles: ['/t/{z}/{x}/{y}'] }, ORIGIN)
    ).toMatchObject({
      tileSize: 512,
      minzoom: 0,
      maxzoom: 22
    });
  });

  it.each([
    [{ type: 'vector', url: '/tiles.json' }, 'TileJSON'],
    [{ type: 'raster', tiles: ['/t/{z}/{x}/{y}'], scheme: 'tms' }, 'tms'],
    [{ type: 'raster', tiles: ['http://x/{z}/{x}/{y}'] }, 'neither'],
    [
      { type: 'raster', tiles: ['/t/{z}/{x}/{y}', 'https://x/{z}/{x}/{y}'] },
      'mix'
    ],
    [
      { type: 'raster-dem', tiles: ['/t/{z}/{x}/{y}'], encoding: 'png' },
      'encoding'
    ],
    [{ type: 'geojson', data: 'ftp://x/a.json' }, 'neither'],
    [
      {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true
      },
      'clustering'
    ],
    [{ type: 'image', url: '/a.png', coordinates: [] }, 'source type']
  ])('refuses %j', (def, message) => {
    const plan = planSource(def, ORIGIN);
    expect('error' in plan && plan.error).toContain(message);
  });

  it('resolves a geojson data URL', () => {
    expect(
      planSource({ type: 'geojson', data: '/p/soundings.json' }, ORIGIN)
    ).toEqual({
      type: 'geojson',
      url: { url: `${ORIGIN}/p/soundings.json`, credentials: 'include' }
    });
  });
});

describe('analyzeLayer', () => {
  it.each([
    [
      {
        type: 'color-relief',
        source: 'depth',
        paint: { 'color-relief-color': RAMP }
      }
    ],
    [{ type: 'raster', source: 'photo', paint: { 'raster-opacity': 0.5 } }],
    [
      {
        type: 'line',
        source: 'contours',
        'source-layer': 'c',
        paint: { 'line-color': '#5d7f99' }
      }
    ],
    [{ type: 'fill', source: 'soundings', paint: { 'fill-color': 'red' } }],
    [
      {
        type: 'circle',
        source: 'soundings',
        filter: ['<', ['get', 'depth'], ['global-state', 'safetyDepth']],
        paint: { 'circle-radius': 4, 'circle-color': '#d0453a' }
      }
    ],
    [
      {
        type: 'symbol',
        source: 'soundings',
        layout: {
          'text-field': [
            'number-format',
            ['*', ['get', 'depth'], ['global-state', 'unitFactor']],
            { 'max-fraction-digits': 1 }
          ],
          'text-size': 11,
          'text-font': ['Noto Sans Bold']
        }
      }
    ]
  ])('draws %j', (layer) => {
    expect(verdict(layer as Partial<StyleLayer>)).toEqual({ drawable: true });
  });

  it.each([
    ['hillshade', { type: 'hillshade', source: 'depth' }, 'layerType'],
    ['heatmap', { type: 'heatmap', source: 'soundings' }, 'layerType'],
    ['background', { type: 'background' }, 'layerType'],
    [
      'fill-extrusion',
      { type: 'fill-extrusion', source: 'soundings' },
      'layerType'
    ],
    ['a missing source', { type: 'line', source: 'nope' }, 'source'],
    ['the wrong source type', { type: 'line', source: 'depth' }, 'source'],
    [
      'a sprite',
      { type: 'symbol', source: 'soundings', layout: { 'icon-image': 'x' } },
      'property'
    ],
    [
      'a pattern',
      { type: 'fill', source: 'soundings', paint: { 'fill-pattern': 'x' } },
      'property'
    ],
    [
      'an undrawn property',
      { type: 'line', source: 'soundings', paint: { 'line-blur': 2 } },
      'property'
    ],
    [
      'an invalid expression',
      { type: 'line', source: 'soundings', paint: { 'line-width': ['step'] } },
      'property'
    ],
    [
      'the image expression',
      {
        type: 'symbol',
        source: 'soundings',
        layout: { 'text-field': ['to-string', ['image', 'x']] }
      },
      'property'
    ],
    [
      'a step ramp',
      {
        type: 'color-relief',
        source: 'depth',
        paint: {
          'color-relief-color': ['step', ['elevation'], 'red', 0, 'blue']
        }
      },
      'property'
    ],
    [
      'a global-state stop',
      {
        type: 'color-relief',
        source: 'depth',
        paint: {
          'color-relief-color': [
            'interpolate',
            ['linear'],
            ['elevation'],
            ['global-state', 'safetyDepth'],
            'red',
            0,
            'blue'
          ]
        }
      },
      'property'
    ],
    [
      'a computed input',
      {
        type: 'color-relief',
        source: 'depth',
        paint: {
          'color-relief-color': [
            'interpolate',
            ['linear'],
            ['-', ['elevation'], 2],
            -10,
            'red',
            0,
            'blue'
          ]
        }
      },
      'property'
    ],
    [
      'a bad resampling',
      {
        type: 'color-relief',
        source: 'depth',
        paint: { 'color-relief-color': RAMP, resampling: 'cubic' }
      },
      'property'
    ]
  ])('skips a layer with %s', (_label, layer, reason) => {
    expect(verdict(layer as Partial<StyleLayer>)).toMatchObject({
      drawable: false,
      reason
    });
  });

  it('accepts an undrawn property left at its default', () => {
    expect(
      verdict({ type: 'line', source: 'soundings', paint: { 'line-blur': 0 } })
    ).toEqual({ drawable: true });
  });

  it('accepts resampling on a color-relief layer', () => {
    expect(
      verdict({
        type: 'color-relief',
        source: 'depth',
        paint: { 'color-relief-color': RAMP, resampling: 'nearest' }
      })
    ).toEqual({ drawable: true });
  });

  it('names the layer type, property or source in detail', () => {
    expect(verdict({ type: 'hillshade', source: 'depth' }).detail).toBe(
      'hillshade'
    );
    expect(
      verdict({ type: 'line', source: 'soundings', paint: { 'line-blur': 2 } })
        .detail
    ).toBe('line-blur');
  });
});

describe('parseReliefRamp', () => {
  it('reads ascending stops and un-premultiplied colours', () => {
    const ramp = parseReliefRamp(RAMP);
    expect(ramp).toMatchObject({
      stops: [-32768, -201, -200, 0],
      colors: [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [156, 200, 236, 1],
        [242, 248, 252, 1]
      ]
    });
  });

  it('refuses stops that do not ascend', () => {
    expect(
      parseReliefRamp([
        'interpolate',
        ['linear'],
        ['elevation'],
        0,
        'red',
        -1,
        'blue'
      ])
    ).toContain('ascend');
  });

  it('un-premultiplies a translucent colour', () => {
    expect(parseColor('rgba(10, 20, 30, 0.5)')).toEqual([10, 20, 30, 0.5]);
  });
});

describe('global-state', () => {
  it('overlays the values set on the style defaults', () => {
    expect(globalStateValues(style(), { unitFactor: 3.28 })).toEqual({
      unitFactor: 3.28,
      safetyDepth: 3
    });
  });

  it('replaces global-state with a literal, leaving literals alone', () => {
    expect(
      resolveGlobalState(
        [
          '*',
          ['get', 'd'],
          ['global-state', 'f'],
          ['literal', ['global-state', 'f']]
        ],
        { f: 2 }
      )
    ).toEqual([
      '*',
      ['get', 'd'],
      ['literal', 2],
      ['literal', ['global-state', 'f']]
    ]);
  });

  it('keeps an expression filter an expression filter', () => {
    // a bare "night" would read as the legacy filter ["==", key, value]
    expect(
      resolveGlobalState(['==', ['global-state', 'mode'], 'a'], {
        mode: 'night'
      })
    ).toEqual(['==', ['literal', 'night'], 'a']);
  });

  it('resolves an unset variable to null', () => {
    expect(resolveGlobalState(['global-state', 'x'], {})).toEqual([
      'literal',
      null
    ]);
  });

  it('resolves paint, layout, filter and expression objects of a layer', () => {
    const resolved = resolveLayer(
      {
        id: 'a',
        type: 'symbol',
        filter: ['<', ['get', 'd'], ['global-state', 's']],
        paint: { 'text-color': ['global-state', 'c'] },
        layout: {
          'text-field': [
            'number-format',
            ['get', 'd'],
            { locale: ['global-state', 'l'] }
          ]
        }
      },
      { s: 3, c: 'red', l: 'fr' }
    );
    expect(resolved.filter).toEqual(['<', ['get', 'd'], ['literal', 3]]);
    expect(resolved.paint?.['text-color']).toEqual(['literal', 'red']);
    expect(resolved.layout?.['text-field']).toEqual([
      'number-format',
      ['get', 'd'],
      { locale: ['literal', 'fr'] }
    ]);
  });
});
