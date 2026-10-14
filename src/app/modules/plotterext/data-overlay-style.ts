import {
  Color,
  latest,
  validateStyleMin
} from '@maplibre/maplibre-gl-style-spec';
import type {
  OverlayStyle,
  SkippedLayerReason
} from 'signalk-plotterext-bus/host';

/**
 * What Freeboard can draw of a data overlay's MapLibre style (capability
 * `overlays.data`): the style's shape, its source URLs, and for each layer
 * either "drawn" or a skip reason. Pure functions, independent of the map, so
 * the registry can report `skippedLayers` and refuse an undrawable
 * `overlay.setLayer` before anything is drawn.
 *
 * Freeboard draws `color-relief` and `raster` layers itself and hands `fill`,
 * `line`, `circle` and `symbol` layers to ol-mapbox-style, so the property
 * lists below are what those two paths reproduce exactly. A property outside
 * them is accepted only at its Style Spec default.
 */

/** A style layer as the overlay's style declares it. */
export interface StyleLayer {
  id: string;
  type: string;
  source?: string;
  'source-layer'?: string;
  minzoom?: number;
  maxzoom?: number;
  filter?: unknown;
  layout?: Record<string, unknown>;
  paint?: Record<string, unknown>;
  [key: string]: unknown;
}

/** A source URL Freeboard may fetch, and whether to send the user's credentials. */
export interface ResolvedUrl {
  url: string;
  credentials: 'include' | 'omit';
}

/**
 * Resolve a data-overlay URL (style, tile template or GeoJSON data). A
 * server-relative path resolves against the Signal K server and is fetched
 * with credentials; an absolute `https://` URL is fetched without. Anything
 * else is refused (null). Tile templates keep their `{z}`/`{x}`/`{y}`
 * placeholders: the URL is joined as text, never through `URL`, which would
 * percent-encode the braces.
 */
export function resolveOverlayUrl(
  url: unknown,
  serverOrigin: string
): ResolvedUrl | null {
  if (typeof url !== 'string' || url.length === 0) return null;
  const probe = (u: string) => {
    try {
      return new URL(u.replace(/\{[a-z]+\}/g, '0'));
    } catch {
      return null;
    }
  };
  if (url.startsWith('/') && !url.startsWith('//')) {
    const origin = probe(serverOrigin)?.origin;
    if (!origin || origin === 'null') return null;
    const full = `${origin}${url}`;
    return probe(full)?.origin === origin
      ? { url: full, credentials: 'include' }
      : null;
  }
  if (/^https:\/\//i.test(url)) {
    return probe(url)?.protocol === 'https:'
      ? { url, credentials: 'omit' }
      : null;
  }
  return null;
}

/** Fill a tile template for one tile. */
export function expandTileUrl(
  template: string,
  z: number,
  x: number,
  y: number
): string {
  return template
    .replace(/\{z\}/g, String(z))
    .replace(/\{x\}/g, String(x))
    .replace(/\{y\}/g, String(y));
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * The parts of a style a host reads, deep-copied: `version`, `state`,
 * `sources` and `layers`. Null when it is not a version-8 style or its layers
 * are not uniquely identified, which omits the overlay.
 */
export function parseOverlayStyle(raw: unknown): OverlayStyle | null {
  if (!isObject(raw) || raw['version'] !== 8) return null;
  const sources = raw['sources'];
  const layers = raw['layers'];
  if (!isObject(sources) || !Array.isArray(layers)) return null;
  if (!Object.values(sources).every(isObject)) return null;
  const ids = new Set<string>();
  for (const l of layers) {
    if (!isObject(l) || typeof l['id'] !== 'string' || ids.has(l['id'])) {
      return null;
    }
    ids.add(l['id']);
  }
  const state = isObject(raw['state']) ? raw['state'] : undefined;
  return structuredClone({
    version: 8,
    ...(state ? { state } : {}),
    sources,
    layers
  }) as OverlayStyle;
}

/** The style's `global-state` defaults overlaid with the values set so far. */
export function globalStateValues(
  style: OverlayStyle,
  values: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, decl] of Object.entries(style.state ?? {})) {
    out[name] = isObject(decl) ? (decl['default'] ?? null) : null;
  }
  return { ...out, ...values };
}

/**
 * Replace every `["global-state", name]` in an expression with its value as a
 * literal. ol-mapbox-style evaluates expressions without global state, so the
 * host resolves it first and re-applies the style whenever a value changes.
 * The value is always wrapped in `literal`, so a filter such as
 * `["==", ["global-state", "mode"], "a"]` stays an expression filter rather
 * than reading as a legacy `["==", key, value]` one.
 */
export function resolveGlobalState(
  value: unknown,
  state: Record<string, unknown>
): unknown {
  if (Array.isArray(value)) {
    if (value[0] === 'literal') return value;
    if (value[0] === 'global-state' && typeof value[1] === 'string') {
      return ['literal', state[value[1]] ?? null];
    }
    return value.map((v) => resolveGlobalState(v, state));
  }
  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, resolveGlobalState(v, state)])
    );
  }
  return value;
}

/** A layer with its paint, layout and filter resolved against `state`. */
export function resolveLayer(
  layer: StyleLayer,
  state: Record<string, unknown>
): StyleLayer {
  const out: StyleLayer = { ...layer };
  if (layer.paint) {
    out.paint = resolveGlobalState(layer.paint, state) as StyleLayer['paint'];
  }
  if (layer.layout) {
    out.layout = resolveGlobalState(
      layer.layout,
      state
    ) as StyleLayer['layout'];
  }
  if (layer.filter !== undefined) {
    out.filter = resolveGlobalState(layer.filter, state);
  }
  return out;
}

// ---------- sources ----------

/**
 * `elevation = r*R + g*G + b*B - base`, with R, G, B the 0..255 channel
 * values of a `raster-dem` tile, per the Style Spec encodings.
 */
export interface DemEncoding {
  r: number;
  g: number;
  b: number;
  base: number;
}

const TERRARIUM: DemEncoding = { r: 256, g: 1, b: 1 / 256, base: 32768 };
const MAPBOX: DemEncoding = { r: 6553.6, g: 25.6, b: 0.1, base: 10000 };

export type SourcePlan =
  | {
      type: 'raster-dem';
      tiles: string[];
      credentials: ResolvedUrl['credentials'];
      tileSize: number;
      minzoom: number;
      maxzoom: number;
      bounds?: [number, number, number, number];
      encoding: DemEncoding;
    }
  | {
      type: 'raster';
      tiles: string[];
      credentials: ResolvedUrl['credentials'];
      tileSize: number;
      minzoom: number;
      maxzoom: number;
      bounds?: [number, number, number, number];
    }
  | {
      type: 'vector';
      tiles: string[];
      credentials: ResolvedUrl['credentials'];
      minzoom: number;
      maxzoom: number;
      bounds?: [number, number, number, number];
    }
  | {
      type: 'geojson';
      /** The data URL, or undefined for inline data. */
      url?: ResolvedUrl;
      data?: Record<string, unknown>;
    };

export type SourceVerdict = SourcePlan | { error: string };

const finite = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

function boundsOf(v: unknown): [number, number, number, number] | undefined {
  return Array.isArray(v) &&
    v.length === 4 &&
    v.every((n) => typeof n === 'number' && Number.isFinite(n))
    ? (v as [number, number, number, number])
    : undefined;
}

function tileUrls(
  def: Record<string, unknown>,
  origin: string
): { tiles: string[]; credentials: ResolvedUrl['credentials'] } | string {
  if (def['url'] !== undefined && def['tiles'] === undefined) {
    return 'a TileJSON url is not supported; list the tiles';
  }
  if (def['scheme'] === 'tms') return 'scheme "tms" is not supported';
  const tiles = def['tiles'];
  if (!Array.isArray(tiles) || tiles.length === 0) return 'no tiles';
  const other = tiles
    .map((t) => (typeof t === 'string' ? /\{(?![zxy]\})[^}]*\}/.exec(t) : null))
    .find((m) => m);
  if (other) return `tile placeholder ${other[0]} is not supported`;
  const resolved = tiles.map((t) => resolveOverlayUrl(t, origin));
  if (resolved.some((r) => r === null)) {
    return 'a tile URL is neither server-relative nor https';
  }
  const urls = resolved as ResolvedUrl[];
  // one credentials mode per source; mixing would need one per tile
  if (urls.some((u) => u.credentials !== urls[0].credentials)) {
    return 'tile URLs mix the server and other hosts';
  }
  return { tiles: urls.map((u) => u.url), credentials: urls[0].credentials };
}

/** What Freeboard can use of one source, or why it cannot. */
export function planSource(def: unknown, origin: string): SourceVerdict {
  if (!isObject(def)) return { error: 'not a source' };
  const type = def['type'];
  if (type === 'raster-dem' || type === 'raster' || type === 'vector') {
    const urls = tileUrls(def, origin);
    if (typeof urls === 'string') return { error: urls };
    const zoom = {
      minzoom: finite(def['minzoom'], 0),
      maxzoom: finite(def['maxzoom'], 22),
      bounds: boundsOf(def['bounds'])
    };
    if (type === 'vector') {
      if (def['encoding'] !== undefined && def['encoding'] !== 'mvt') {
        return { error: `encoding "${String(def['encoding'])}"` };
      }
      return { type, ...urls, ...zoom };
    }
    const tileSize = finite(def['tileSize'], 512);
    if (type === 'raster') return { type, ...urls, tileSize, ...zoom };
    const encodingName = def['encoding'] ?? 'mapbox';
    let encoding: DemEncoding;
    if (encodingName === 'terrarium') encoding = TERRARIUM;
    else if (encodingName === 'mapbox') encoding = MAPBOX;
    else if (encodingName === 'custom') {
      encoding = {
        r: finite(def['redFactor'], 1),
        g: finite(def['greenFactor'], 1),
        b: finite(def['blueFactor'], 1),
        base: finite(def['baseShift'], 0)
      };
    } else {
      return { error: `encoding "${String(encodingName)}"` };
    }
    return { type, ...urls, tileSize, ...zoom, encoding };
  }
  if (type === 'geojson') {
    if (def['cluster'] === true) return { error: 'clustering' };
    if (def['filter'] !== undefined) return { error: 'a source filter' };
    const data = def['data'];
    if (typeof data === 'string') {
      const url = resolveOverlayUrl(data, origin);
      return url
        ? { type, url }
        : { error: 'the data URL is neither server-relative nor https' };
    }
    if (isObject(data)) return { type, data };
    return { error: 'no data' };
  }
  return { error: `source type "${String(type)}"` };
}

/** Every source of a style, planned. */
export function planSources(
  style: OverlayStyle,
  origin: string
): Record<string, SourceVerdict> {
  return Object.fromEntries(
    Object.entries(style.sources).map(([id, def]) => [
      id,
      planSource(def, origin)
    ])
  );
}

// ---------- layers ----------

/** Layer types Freeboard draws, and the source type each needs. */
const LAYER_SOURCE: Record<string, SourcePlan['type'][]> = {
  'color-relief': ['raster-dem'],
  raster: ['raster'],
  fill: ['vector', 'geojson'],
  line: ['vector', 'geojson'],
  circle: ['vector', 'geojson'],
  symbol: ['vector', 'geojson']
};

/**
 * Properties each layer type draws with any valid value. Any other property
 * is accepted only at its Style Spec default.
 */
const DRAWN: Record<string, { paint: string[]; layout: string[] }> = {
  'color-relief': {
    paint: ['color-relief-color', 'color-relief-opacity', 'resampling'],
    layout: []
  },
  raster: {
    // fade-duration only animates tile arrival
    paint: ['raster-opacity', 'raster-resampling', 'raster-fade-duration'],
    layout: []
  },
  fill: {
    paint: ['fill-color', 'fill-opacity', 'fill-outline-color'],
    layout: []
  },
  line: {
    paint: ['line-color', 'line-width', 'line-opacity', 'line-dasharray'],
    layout: ['line-cap', 'line-join', 'line-miter-limit']
  },
  circle: {
    paint: [
      'circle-color',
      'circle-radius',
      'circle-opacity',
      'circle-stroke-color',
      'circle-stroke-width',
      'circle-stroke-opacity',
      'circle-translate'
    ],
    // the map never pitches
    layout: []
  },
  symbol: {
    paint: [
      'text-color',
      'text-halo-color',
      'text-halo-width',
      'text-opacity',
      'text-translate'
    ],
    layout: [
      'symbol-placement',
      'symbol-spacing',
      'text-field',
      // a preference: Freeboard draws text in its own font
      'text-font',
      'text-size',
      'text-anchor',
      'text-justify',
      'text-max-width',
      'text-letter-spacing',
      'text-line-height',
      'text-offset',
      'text-rotate',
      'text-rotation-alignment',
      'text-padding',
      'text-transform',
      'text-keep-upright',
      'text-max-angle',
      'text-allow-overlap',
      'text-ignore-placement',
      // affect only icons, or a pitched map
      'text-optional',
      'text-pitch-alignment',
      'icon-pitch-alignment'
    ]
  }
};

/** Expression operators no drawing path here can evaluate. */
const UNSUPPORTED_OPERATORS = new Set(['image', 'within', 'distance']);

function findUnsupportedOperator(value: unknown): string | null {
  if (Array.isArray(value)) {
    if (value[0] === 'literal') return null;
    if (typeof value[0] === 'string' && UNSUPPORTED_OPERATORS.has(value[0])) {
      return value[0];
    }
    for (const v of value) {
      const found = findUnsupportedOperator(v);
      if (found) return found;
    }
  } else if (isObject(value)) {
    for (const v of Object.values(value)) {
      const found = findUnsupportedOperator(v);
      if (found) return found;
    }
  }
  return null;
}

/** A colour as [r, g, b, a]: 0..255 channels, alpha 0..1, not premultiplied. */
export type RgbaColor = [number, number, number, number];

export function parseColor(v: unknown): RgbaColor | null {
  if (typeof v !== 'string') return null;
  const c = Color.parse(v);
  if (!c) return null;
  // style-spec colours are premultiplied
  const un = (ch: number) => (c.a > 0 ? Math.round((ch / c.a) * 255) : 0);
  return [un(c.r), un(c.g), un(c.b), c.a];
}

/** A `color-relief` ramp: ascending elevation stops and their colours. */
export interface ReliefRamp {
  stops: number[];
  colors: RgbaColor[];
}

/**
 * Parse `color-relief-color`. Only a top-level
 * `["interpolate", ["linear"], ["elevation"], …]` with ascending literal
 * number stops and literal colours is drawn the same on every host; anything
 * else (step, global-state, a computed input) is an error string.
 */
export function parseReliefRamp(v: unknown): ReliefRamp | string {
  if (v === undefined) return 'color-relief-color is required';
  if (
    !Array.isArray(v) ||
    v[0] !== 'interpolate' ||
    JSON.stringify(v[1]) !== '["linear"]' ||
    JSON.stringify(v[2]) !== '["elevation"]'
  ) {
    return 'color-relief-color must be ["interpolate", ["linear"], ["elevation"], …]';
  }
  const pairs = v.slice(3);
  if (pairs.length < 2 || pairs.length % 2 !== 0) {
    return 'color-relief-color needs stop/colour pairs';
  }
  const stops: number[] = [];
  const colors: RgbaColor[] = [];
  for (let i = 0; i < pairs.length; i += 2) {
    const stop = pairs[i];
    const color = parseColor(pairs[i + 1]);
    if (typeof stop !== 'number' || !Number.isFinite(stop)) {
      return 'color-relief-color stops must be literal numbers';
    }
    if (stops.length && stop <= stops[stops.length - 1]) {
      return 'color-relief-color stops must ascend';
    }
    if (!color) return 'color-relief-color colours must be literal colours';
    stops.push(stop);
    colors.push(color);
  }
  return { stops, colors };
}

/** Whether a layer is drawn; when it is not, why. */
export interface LayerVerdict {
  drawable: boolean;
  reason?: SkippedLayerReason;
  detail?: string;
}

const skip = (reason: SkippedLayerReason, detail?: string): LayerVerdict => ({
  drawable: false,
  reason,
  detail
});

/** Font list given to the validator, which needs `glyphs` for any text. */
const VALIDATOR_GLYPHS = 'https://glyphs.invalid/{fontstack}/{range}.pbf';

/**
 * Whether Freeboard draws `layer` exactly, given the style's sources. The
 * Style Spec validator judges every property and expression; on top of that
 * a layer must be of a drawn type, on a usable source of the right type, use
 * only properties its drawing path reproduces, and no operator it cannot
 * evaluate.
 */
export function analyzeLayer(
  style: OverlayStyle,
  layer: StyleLayer,
  sources: Record<string, SourceVerdict>
): LayerVerdict {
  const accepts = LAYER_SOURCE[layer.type];
  if (!accepts) return skip('layerType', layer.type);
  const source =
    typeof layer.source === 'string' ? sources[layer.source] : undefined;
  if (!source) return skip('source', `no source "${String(layer.source)}"`);
  if ('error' in source) return skip('source', source.error);
  if (!accepts.includes(source.type)) {
    return skip('source', `${layer.type} cannot draw a ${source.type} source`);
  }

  // the validator predates `resampling`; it is checked here instead
  const paint = { ...(layer.paint ?? {}) };
  if (layer.type === 'color-relief' && 'resampling' in paint) {
    if (paint['resampling'] !== 'linear' && paint['resampling'] !== 'nearest') {
      return skip('property', 'resampling must be "linear" or "nearest"');
    }
    delete paint['resampling'];
  }
  const errors = validateStyleMin({
    version: 8,
    glyphs: VALIDATOR_GLYPHS,
    ...(style.state ? { state: style.state } : {}),
    sources: {
      [layer.source as string]: style.sources[layer.source as string]
    },
    layers: [{ ...layer, paint }]
  } as Parameters<typeof validateStyleMin>[0]).filter((e) =>
    e.message.startsWith('layers[')
  );
  if (errors.length) {
    return skip('property', errors[0].message.replace(/^layers\[0\]\./, ''));
  }

  const drawn = DRAWN[layer.type];
  for (const part of ['paint', 'layout'] as const) {
    const props = layer[part] ?? {};
    const spec = (
      latest as unknown as Record<string, Record<string, { default?: unknown }>>
    )[`${part}_${layer.type}`];
    for (const [name, value] of Object.entries(props)) {
      if (name === 'visibility' || drawn[part].includes(name)) continue;
      if (JSON.stringify(value) === JSON.stringify(spec?.[name]?.default)) {
        continue;
      }
      return skip('property', name);
    }
  }
  const op = findUnsupportedOperator([layer.paint, layer.layout, layer.filter]);
  if (op) return skip('property', `the "${op}" expression`);

  if (layer.type === 'color-relief') {
    const ramp = parseReliefRamp(layer.paint?.['color-relief-color']);
    if (typeof ramp === 'string') return skip('property', ramp);
  }
  return { drawable: true };
}
