import { Extent, intersects } from 'ol/extent';
import { transformExtent } from 'ol/proj';
import TileLayer from 'ol/layer/Tile';
import RenderEvent from 'ol/render/Event';
import LayerGroup from 'ol/layer/Group';
import BaseLayer from 'ol/layer/Base';
import Layer from 'ol/layer/Layer';
import Tile from 'ol/Tile';
import VectorTile from 'ol/VectorTile';
import { FeatureLike } from 'ol/Feature';
import VectorTileSource from 'ol/source/VectorTile';
import TileSource from 'ol/source/Tile';
import UrlTile from 'ol/source/UrlTile';
import TileWMS from 'ol/source/TileWMS';
import WMTS from 'ol/source/WMTS';
import TileState from 'ol/TileState';
import Projection from 'ol/proj/Projection';
import { UrlFunction } from 'ol/Tile';
import apply from 'ol-mapbox-style';
import {
  isExpression,
  createPropertyExpression,
  v8,
  type StylePropertySpecification
} from '@maplibre/maplibre-gl-style-spec';
import { ChartImageAdjustment } from 'src/app/types';
import {
  chartRefreshIntervalMs,
  chartTimeTileUrl
} from 'src/app/lib/chart-time';

/**
 * Build a CSS canvas `filter` string from a chart's image adjustment, or `''`
 * when the adjustment is absent or neutral (so no filter is applied).
 */
export function imageAdjustmentToFilter(adj?: ChartImageAdjustment): string {
  if (!adj) {
    return '';
  }
  const brightness = Number.isFinite(adj.brightness)
    ? Math.max(0, adj.brightness)
    : 1;
  const contrast = Number.isFinite(adj.contrast)
    ? Math.max(0, adj.contrast)
    : 1;
  if (brightness === 1 && contrast === 1) {
    return '';
  }
  return `brightness(${brightness}) contrast(${contrast})`;
}

/**
 * Apply a per-chart brightness/contrast adjustment to a raster (canvas) tile
 * layer as a CSS filter on the layer's canvas element. A CSS element filter is
 * used (rather than a `CanvasRenderingContext2D.filter`) because WebKit ships
 * the context filter disabled by default, making it a silent no-op on iOS
 * browsers. The layer MUST have a unique `className` (see
 * `chartLayerClassName`) so OpenLayers renders it into its own canvas — layers
 * sharing the default class are composited into one canvas and would all be
 * filtered together.
 * Returns a setter the caller invokes whenever the chart's adjustment changes;
 * a subsequent `map.render()` repaints with the new values.
 */
export function attachImageAdjustmentFilter(
  layer: TileLayer
): (adj?: ChartImageAdjustment) => void {
  let filter = '';
  let canvas: HTMLCanvasElement | null = null;
  const apply = () => {
    if (canvas && canvas.style.filter !== filter) {
      canvas.style.filter = filter;
    }
  };
  layer.on('postrender', (evt: RenderEvent) => {
    const cnv = (evt.context as CanvasRenderingContext2D)?.canvas;
    if (cnv instanceof HTMLCanvasElement) {
      canvas = cnv;
      apply();
    }
  });
  return (adj?: ChartImageAdjustment) => {
    filter = imageAdjustmentToFilter(adj);
    apply();
  };
}

/**
 * Unique layer class name for a chart so OpenLayers renders the layer into its
 * own canvas element (required for the per-chart CSS image-adjustment filter).
 * Retains the default `ol-layer` class alongside the chart-specific one.
 */
export function chartLayerClassName(id: string): string {
  return 'ol-layer chart-' + String(id).replace(/[^\w-]/g, '-');
}

/**
 * Compensates for OpenLayers' exclusive layer minimum-zoom bound so a display
 * minimum of z12 shows the chart at exactly z12. Small enough that the bound
 * stays sharp between adjacent chart bands, unlike the historic 0.1 applied to
 * a chart's declared minimum.
 */
const MIN_ZOOM_EPSILON = 1e-6;

/**
 * Layer min/max zoom for a chart, combining its declared range (what tiles
 * exist), the user's display minimum (the lowest zoom they want it drawn at)
 * and the global over-zoom setting.
 *
 * The display minimum only ever restricts: a chart is never drawn below the
 * zoom its own tiles start at. The maximum is untouched by it, so which chart
 * wins where several overlap stays a question of layer order. With no display
 * minimum the result is what the layers used before it existed.
 */
export function resolveLayerZoomRange(
  chart: {
    minZoom?: number;
    maxZoom?: number;
    displayMinZoom?: number;
  },
  mapMaxZoom?: number,
  overZoomTiles = false
): { min: number | undefined; max: number | undefined } {
  const declaredMin = chart.minZoom;
  const displayMin = chart.displayMinZoom;

  // A display minimum below the chart's own is meaningless — there are no tiles
  // down there — so the declared one wins. At or above it, the user's bound
  // applies with the sharp offset.
  const displayMinApplies =
    typeof displayMin === 'number' &&
    (typeof declaredMin !== 'number' || displayMin >= declaredMin);

  // Historic offset, kept so charts without a display minimum render exactly as
  // they did before.
  const declaredLayerMin = declaredMin >= 0.1 ? declaredMin - 0.1 : declaredMin;

  return {
    min: displayMinApplies ? displayMin - MIN_ZOOM_EPSILON : declaredLayerMin,
    max: resolveLayerMaxZoom(chart.maxZoom, mapMaxZoom, overZoomTiles)
  };
}

/**
 * Whether a layer resolved to this zoom range is drawn at the given zoom,
 * following OpenLayers' bounds: the minimum is exclusive, the maximum
 * inclusive. Lets the chart list report visibility the same way the map
 * decides it.
 */
export function isZoomWithinLayerRange(
  range: { min?: number; max?: number },
  zoom: number
): boolean {
  return (
    (typeof range.min !== 'number' || zoom > range.min) &&
    (typeof range.max !== 'number' || zoom <= range.max)
  );
}

export function resolveLayerMaxZoom(
  chartMax?: number,
  mapMax?: number,
  overZoomTiles = false
): number | undefined {
  if (overZoomTiles && typeof mapMax === 'number') {
    return typeof chartMax === 'number' ? Math.max(chartMax, mapMax) : mapMax;
  }
  return chartMax;
}

/**
 * Convert bounds in  chart metadata [minLon, minLat, maxLon, maxLat] to an EPSG:3857 extent
 * @returns undefined if bounds are invalid or missing
 */
export function extentFromBounds(bounds?: number[]): Extent | undefined {
  if (!Array.isArray(bounds) || bounds.length < 4) return undefined;
  if (
    bounds[0] <= -180 ||
    bounds[1] <= -90 ||
    bounds[2] >= 180 ||
    bounds[3] >= 90
  ) {
    return undefined;
  }
  return transformExtent(bounds, 'EPSG:4326', 'EPSG:3857');
}

/**
 * Determines whether a chart should remain visible when the chart list is
 * filtered to the current map view.
 *
 * Charts without valid bounds metadata are treated as global (not tied to a
 * region) and are always kept. Both `bounds` and `extent` are EPSG:4326
 * [minLon, minLat, maxLon, maxLat], so they are compared directly without
 * re-projection.
 *
 * A viewport that crosses the antimeridian (+/-180 longitude) is reported by
 * OpenLayers with a longitude range that runs past the dateline (e.g. a view
 * straddling +/-180 arrives as minLon=170, maxLon=190). Chart bounds are always
 * normalised to [-180, 180], so such a view is split into its two normalised
 * longitude ranges and the chart is kept if it overlaps either.
 *
 * Example:
 *   bounds=[10, 40, 20, 50],   extent=[15, 45, 30, 60]  -> true  (overlap)
 *   bounds=[10, 40, 20, 50],   extent=[30, 45, 40, 60]  -> false (disjoint)
 *   bounds=[-178, 40, -170, 50], extent=[170, 40, 190, 60] -> true (dateline)
 *   bounds=undefined,          extent=[...]             -> true  (global chart)
 */
export function isChartInView(
  bounds: number[] | undefined,
  extent: Extent
): boolean {
  if (!Array.isArray(bounds) || bounds.length !== 4) {
    return true;
  }
  const [minLon, , maxLon] = extent;
  if (maxLon > 180 || minLon < -180) {
    return splitExtentAtAntimeridian(extent).some((range) =>
      intersects(bounds, range)
    );
  }
  return intersects(bounds, extent);
}

/**
 * Split a map extent that crosses the antimeridian into normalised longitude
 * ranges within [-180, 180].
 *
 * OpenLayers reports a dateline-crossing viewport with a longitude that runs
 * past the antimeridian; the wrapped portion has to be brought back into range
 * before it can be compared with chart bounds, which are always normalised.
 *
 * Input:  [170, 40, 190, 60]
 * Output: [[170, 40, 180, 60], [-180, 40, -170, 60]]
 */
function splitExtentAtAntimeridian(extent: Extent): Extent[] {
  const [minLon, minLat, maxLon, maxLat] = extent;
  // A span of a full turn or more means the whole world is longitudinally
  // visible, so there is nothing to exclude on longitude.
  if (maxLon - minLon >= 360) {
    return [[-180, minLat, 180, maxLat]];
  }
  // Normalise both edges to [-180, 180). Input:  190 -> Output: -170
  const wrap = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180;
  const west = wrap(minLon);
  const east = wrap(maxLon);
  // When the view genuinely crosses the dateline the normalised west edge sits
  // east of the normalised east edge; emit the two pieces either side of it.
  if (west > east) {
    return [
      [west, minLat, 180, maxLat],
      [-180, minLat, east, maxLat]
    ];
  }
  return [[west, minLat, east, maxLat]];
}

/**
 * Layer types the ol-mapbox-style (OpenLayers) renderer can draw. A MapLibre
 * style may declare layer types it cannot — the one that matters in practice is
 * `color-relief`: when such a layer is the *first* layer of its source,
 * ol-mapbox-style's `setupLayer()` leaves `layer` undefined and the whole
 * `apply()` call rejects, blanking the entire chart instead of skipping the one
 * layer. (Other unsupported types such as `heatmap` are already skipped by
 * ol-mapbox-style itself and do not reject; dropping them here is harmless.)
 */
export const OL_RENDERABLE_LAYER_TYPES: ReadonlySet<string> = new Set([
  'background',
  'fill',
  'fill-extrusion',
  'line',
  'symbol',
  'circle',
  'raster',
  'hillshade'
]);

/** Minimal shape of a MapLibre/Mapbox GL style document we touch here. */
export interface MapStyleDocument {
  layers?: Array<{ type?: string; [key: string]: unknown }>;
  sprite?: string | Array<{ id: string; url: string }>;
  [key: string]: unknown;
}

/**
 * The MapLibre style spec keyed by `<group>_<layerType>` (e.g. `paint_line`,
 * `layout_symbol`) → property name → property spec, exactly as
 * `ol-mapbox-style` sees it (both depend on `@maplibre/maplibre-gl-style-spec`).
 */
const STYLE_SPEC = v8 as unknown as Record<
  string,
  Record<string, StylePropertySpecification>
>;

/**
 * Whether ol-mapbox-style would fail to evaluate `value` as the given
 * layout/paint property. The renderer runs the MapLibre spec's
 * `createPropertyExpression` at render time; for a *data* expression on a
 * property that only accepts constants or zoom (camera) expressions — the
 * cross-faded `line-dasharray` is the one Open Waters trips over — it throws an
 * uncaught `"data expressions not supported"` from inside the render loop and
 * freezes the whole OpenLayers map (pan and zoom stop, only the background
 * paints). Because higher-zoom layers carry these, the chart renders until it
 * is zoomed in and then locks up.
 *
 * Asking the spec's own parser here drops precisely what the renderer would
 * throw on — any property, any reason — and nothing that renders fine. Deriving
 * it from the spec rather than a hand-list matters: 72 properties reject data
 * expressions, so a fixed list is both too broad (it would drop
 * `line-pattern`, `fill-pattern` and the `*-sort-key`s, which are data-driven
 * and evaluate cleanly) and too narrow (the next style freezes on a different
 * one). Constants and zoom-only expressions pass; properties with no spec entry
 * (e.g. non-standard `icon-sort-key`) are left untouched.
 */
export function isUnevaluableByOl(
  group: 'layout' | 'paint',
  layerType: string,
  key: string,
  value: unknown
): boolean {
  if (!isExpression(value)) {
    return false;
  }
  const propertySpec = STYLE_SPEC[`${group}_${layerType}`]?.[key];
  if (!propertySpec) {
    return false;
  }
  try {
    return createPropertyExpression(value, propertySpec).result === 'error';
  } catch {
    // If the spec parser throws here, it would throw in the renderer too — drop.
    return true;
  }
}

/**
 * Normalise a MapLibre/Mapbox GL style so it renders through the
 * ol-mapbox-style (OpenLayers) renderer instead of rejecting or later crashing:
 *  - drop the layer types the renderer cannot draw (see
 *    `OL_RENDERABLE_LAYER_TYPES`), preserving the order of the layers that
 *    remain. A `background` layer is kept: the style's author draws the
 *    ocean with it, and a Mapbox-style chart is a basemap — dropping it
 *    renders black water wherever the style relies on its background; and
 *  - drop any layout/paint property whose value the renderer cannot evaluate
 *    (see `isUnevaluableByOl`), so a higher-zoom layer cannot freeze the map.
 *    The layer still renders (e.g. a solid line); only that one unusable
 *    property is lost.
 *
 * Mutates and returns the passed object. A pure transform on the parsed style,
 * kept separate from the component so it can be unit-tested without it.
 */
export function normaliseStyleForOl(style: MapStyleDocument): MapStyleDocument {
  if (style && Array.isArray(style.layers)) {
    style.layers = style.layers.filter(
      (layer) =>
        typeof layer?.type === 'string' &&
        OL_RENDERABLE_LAYER_TYPES.has(layer.type)
    );
    for (const layer of style.layers) {
      const layerType = layer.type as string;
      for (const group of ['layout', 'paint'] as const) {
        const props = (layer as Record<string, unknown>)[group];
        if (props && typeof props === 'object') {
          const bag = props as Record<string, unknown>;
          for (const key of Object.keys(bag)) {
            if (isUnevaluableByOl(group, layerType, key, bag[key])) {
              delete bag[key];
            }
          }
        }
      }
    }
  }
  return style;
}

/** A sprite set as declared in a style's `sprite` array. */
type SpriteSet = { id: string; url: string };

/**
 * The `.json` URL ol-mapbox-style ends up requesting for a sprite set (it
 * tries `@2x.json` first on hi-DPI screens and falls back to this), resolved
 * against the style's URL. `undefined` for anything that is not a plain
 * http(s) URL — a `mapbox://` sprite needs an access token to resolve and is
 * left for ol-mapbox-style to deal with.
 */
function spriteIndexUrl(url: string, styleUrl: string): string | undefined {
  let resolved: URL;
  try {
    resolved = new URL(url, styleUrl);
  } catch {
    return undefined;
  }
  if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
    return undefined;
  }
  return `${resolved.origin}${resolved.pathname}.json${resolved.search}`;
}

/**
 * Drop from `style.sprite` every sprite set whose index cannot be fetched, so
 * that one dead sprite URL cannot blank the whole chart.
 *
 * ol-mapbox-style loads every sprite set a style declares before it styles a
 * single layer, and rejects the entire `apply()` if any one of them fails
 * ("Sprites cannot be loaded: …"). The chart's layers are already in the
 * group by then but never receive a style, so the chart is ticked, occupies
 * its slot in the stack and draws nothing — no fills, no lines, not even the
 * layers that never reference an icon. A sprite set an upstream provider has
 * moved (the Open Waters Seamap's `basics` set on versatiles) is enough.
 *
 * Checking the index up front and removing the sets that fail turns that into
 * the degradation a missing glyph range or a failed tile already gets: the
 * symbols whose icons lived in the dropped set render without an icon (an
 * `icon-image` that resolves to nothing is tolerated), everything else
 * renders normally. The GET is the same request ol-mapbox-style makes
 * moments later, so on a healthy style it costs one cached round trip per
 * sprite set.
 *
 * Mutates `style`. Resolves to the index URLs that were dropped, for the
 * caller to report; a style with no `sprite` resolves to `[]` untouched.
 */
export async function dropUnreachableSprites(
  style: MapStyleDocument,
  styleUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<string[]> {
  const declared = style?.sprite;
  if (!declared) {
    return [];
  }
  const sets: SpriteSet[] =
    typeof declared === 'string'
      ? [{ id: 'default', url: declared }]
      : Array.isArray(declared)
        ? (declared as SpriteSet[])
        : [];
  if (sets.length === 0) {
    return [];
  }
  const dropped: string[] = [];
  const reachable = await Promise.all(
    sets.map(async (set) => {
      const indexUrl =
        typeof set?.url === 'string'
          ? spriteIndexUrl(set.url, styleUrl)
          : undefined;
      if (!indexUrl) {
        return true;
      }
      try {
        const response = await fetchImpl(indexUrl);
        if (response.ok) {
          return true;
        }
      } catch {
        // network failure — treated the same as a bad status below
      }
      dropped.push(indexUrl);
      return false;
    })
  );
  if (dropped.length === 0) {
    return [];
  }
  const kept = sets.filter((_, i) => reachable[i]);
  if (kept.length === 0) {
    delete style.sprite;
  } else if (typeof declared !== 'string') {
    style.sprite = kept;
  }
  return dropped;
}

/** Injectable collaborators for {@link applyMapStyle}, for unit testing. */
export interface ApplyMapStyleDeps {
  fetchImpl?: typeof fetch;
  applyFn?: (
    group: LayerGroup,
    style: MapStyleDocument | string,
    options: { styleUrl: string }
  ) => Promise<unknown>;
  makeResilient?: (group: LayerGroup) => (() => void) | void;
}

/**
 * Fetch a Mapbox/MapLibre style, normalise it for the ol-mapbox-style
 * (OpenLayers) renderer (see `normaliseStyleForOl`), drop any sprite set that
 * cannot be loaded (see `dropUnreachableSprites`) and apply it to `group`.
 *
 * The style is applied **exactly once**. Only a failure to *fetch or parse* the
 * document falls back to handing the raw URL to ol-mapbox-style, so styles that
 * need no normalisation behave as they always have. A failure inside `apply()`
 * itself — typically a sprite set that no longer resolves, which makes
 * ol-mapbox-style reject the whole style — is logged and left there. It must
 * not be retried with the raw style: by then ol-mapbox-style has already added
 * the normalised layers to the group, and a second `apply()` stacks every layer
 * the normalisation removed on top of them — the opaque `background` layer
 * among them, which then hides every chart beneath (#796) — while failing on
 * the very same sprites.
 *
 * Resolves rather than rejects: a chart that cannot be styled is a warning,
 * not an error the caller can act on.
 */
export async function applyMapStyle(
  group: LayerGroup,
  url: string,
  deps: ApplyMapStyleDeps = {}
): Promise<() => void> {
  const {
    fetchImpl = fetch,
    applyFn = apply,
    makeResilient = makeChartTilesResilient
  } = deps;
  let style: MapStyleDocument | string = url;
  let styleUrl = url;
  let stopRecovery: () => void = () => undefined;
  try {
    const response = await fetchImpl(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    style = normaliseStyleForOl(await response.json());
    // Resolve relative sprite/glyph/tile URLs against the style's final URL
    // (after any redirect), falling back to the requested URL.
    styleUrl = response.url || url;
  } catch (err) {
    console.warn(
      `MapStyleJsonChart: could not normalise style ${url}, applying as-is`,
      err
    );
  }
  if (typeof style !== 'string') {
    // One unreachable sprite set would otherwise blank the whole chart (#800).
    const dropped = await dropUnreachableSprites(style, styleUrl, fetchImpl);
    if (dropped.length > 0) {
      console.warn(
        `MapStyleJsonChart: ${url} references sprite sets that cannot be ` +
          `loaded; their icons will not draw:`,
        dropped
      );
    }
  }
  try {
    await applyFn(group, style, { styleUrl });
    const stop = makeResilient(group);
    if (typeof stop === 'function') {
      stopRecovery = stop;
    }
  } catch (err) {
    console.warn(`MapStyleJsonChart: could not apply style ${url}`, err);
  }
  return stopRecovery;
}

/**
 * Options controlling how {@link makeChartTilesResilient} retries a stalled or
 * failed vector tile request.
 */
export interface ResilientTileLoadingOptions {
  /**
   * Abort a single attempt after this many milliseconds and count it as a
   * failure. Generous by design: it exists to break an indefinite stall, not to
   * cut off a slow-but-progressing download, so on a healthy connection it
   * never fires.
   */
  timeoutMs?: number;
  /**
   * Extra attempts after the first before the tile is marked as errored. May be
   * `Number.POSITIVE_INFINITY` to retry indefinitely — used by the self-healing
   * tile loader so a stalled tile recovers on its own once the link returns,
   * instead of giving up and waiting for the user to pan or zoom.
   */
  retries?: number;
  /** Base back-off between attempts, multiplied by the (1-based) attempt number. */
  backoffMs?: number;
  /**
   * Upper bound on a single back-off wait. With linear growth the delay would
   * otherwise increase without limit when retrying indefinitely; this caps it so
   * an offline tile keeps re-checking at a steady interval.
   */
  maxBackoffMs?: number;
  /**
   * Give up (let the tile error) once this many milliseconds have elapsed across
   * all attempts. Bounds an otherwise-indefinite retry so a tile OpenLayers has
   * dropped without disposing it (e.g. via `removeSourceTiles`, which leaves
   * `disposed` false) cannot keep re-requesting forever. `0`/omitted = no limit.
   */
  maxElapsedMs?: number;
  /**
   * Consulted before each retry, and again after each back-off wait. Returning
   * `false` cancels the retry loop with an `AbortError` instead of continuing —
   * used to stop retrying a tile OpenLayers has already discarded.
   */
  shouldContinue?: () => boolean;
}

const DEFAULT_RESILIENT_TILE_OPTIONS = {
  timeoutMs: 30000,
  retries: 2,
  backoffMs: 1000,
  maxBackoffMs: 30000
};

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Parse an HTTP `Retry-After` header (delta-seconds or an HTTP-date) into a
 * non-negative millisecond delay, or `undefined` when it is absent/unparseable.
 */
function parseRetryAfterMs(header: string | null): number | undefined {
  if (!header) {
    return undefined;
  }
  const trimmed = header.trim();
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed) * 1000;
  }
  const when = Date.parse(trimmed);
  if (!Number.isNaN(when)) {
    return Math.max(0, when - Date.now());
  }
  return undefined;
}

/**
 * Fetch a vector tile as an `ArrayBuffer`, retrying on failure with a
 * per-attempt timeout and linear back-off.
 *
 * The default OpenLayers vector tile loader issues a single request with no
 * application-level timeout and never retries: a request that stalls (a flaky
 * or high-latency link that accepts the connection but never delivers the body)
 * leaves the tile in the `LOADING` state indefinitely. OpenLayers treats such a
 * tile as still in flight, so it is never re-requested — panning or zooming
 * away and back reuses the stuck tile rather than reloading it, and the map
 * keeps showing the over-zoomed parent tile from the previous level (see
 * https://github.com/openlayers/openlayers/issues/4338). This retries the
 * request instead of stalling forever.
 *
 * Only failures worth retrying are retried: network errors, aborts/timeouts,
 * 5xx and 429. A 4xx is a definitive answer (some tile servers return 404 for
 * empty tiles) — retrying it would only triple traffic and add back-off latency
 * on exactly the slow link this is meant to help — so it fails immediately.
 *
 * `fetchImpl` is injectable purely so the retry logic can be unit-tested; it
 * defaults to the global `fetch`.
 */
export async function fetchArrayBufferWithRetry(
  url: string,
  options?: ResilientTileLoadingOptions,
  fetchImpl: typeof fetch = fetch
): Promise<ArrayBuffer> {
  const opts = {
    timeoutMs: options?.timeoutMs ?? DEFAULT_RESILIENT_TILE_OPTIONS.timeoutMs,
    retries: options?.retries ?? DEFAULT_RESILIENT_TILE_OPTIONS.retries,
    backoffMs: options?.backoffMs ?? DEFAULT_RESILIENT_TILE_OPTIONS.backoffMs,
    maxBackoffMs:
      options?.maxBackoffMs ?? DEFAULT_RESILIENT_TILE_OPTIONS.maxBackoffMs,
    maxElapsedMs: options?.maxElapsedMs ?? 0
  };
  const shouldContinue = options?.shouldContinue;
  const start = Date.now();
  let lastError: unknown;
  // When a 429 asks us to wait a specific time, it overrides the next back-off.
  let retryAfterMs: number | undefined;
  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    if (attempt > 0) {
      if (shouldContinue && !shouldContinue()) {
        throw new DOMException('tile retry cancelled', 'AbortError');
      }
      const backoff =
        retryAfterMs ?? Math.min(opts.backoffMs * attempt, opts.maxBackoffMs);
      retryAfterMs = undefined;
      // Give up if this wait would carry us past the self-heal window, counting
      // the wait itself — otherwise a long back-off (a 429 `Retry-After`, or the
      // >=60s floor) would hold a shared TileQueue slot well past the window.
      // The tile errors instead, and startChartTileRecovery retries it later
      // without pinning a slot.
      if (
        opts.maxElapsedMs > 0 &&
        Date.now() - start + backoff >= opts.maxElapsedMs
      ) {
        break;
      }
      await delay(backoff);
      if (shouldContinue && !shouldContinue()) {
        throw new DOMException('tile retry cancelled', 'AbortError');
      }
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
    let definitive = false;
    try {
      const response = await fetchImpl(url, { signal: controller.signal });
      if (response.ok) {
        return await response.arrayBuffer();
      }
      lastError = new Error(`HTTP ${response.status}`);
      if (response.status === 429) {
        // Rate-limited: honour Retry-After, else back off much harder than a
        // network failure — hammering a rate-limiting free tile server every
        // few seconds (15-30 tiles on screen) only deepens the limit and burns
        // data on a metered link.
        retryAfterMs =
          parseRetryAfterMs(response.headers?.get('Retry-After') ?? null) ??
          Math.max(opts.maxBackoffMs, 60000);
      } else if (response.status < 500) {
        // Any other 4xx is a definitive answer (e.g. a 404 for an empty tile).
        // Flag it so the loader can render an empty tile rather than an errored
        // one, which would otherwise trip outage recovery on a healthy link.
        (lastError as { definitive?: boolean }).definitive = true;
        definitive = true;
      }
    } catch (err) {
      // Network error, abort or timeout — worth retrying.
      lastError = err;
    } finally {
      clearTimeout(timer);
    }
    if (definitive) {
      break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/**
 * Build a self-healing vector tile load function that fetches via
 * {@link fetchArrayBufferWithRetry} and parses the result with the tile's own
 * format.
 *
 * It absorbs a brief blip (a Starlink re-handshake, a VPN hiccup) by retrying
 * with a capped back-off for a short window, then lets the tile go to `ERROR` so
 * it does not keep holding a TileQueue slot — the queue is shared with any local
 * chart sources (e.g. NOAA/ENC MBTiles on the same Pi), which must not be starved
 * while an online basemap is unreachable. Recovery from a longer outage is
 * handled at the source level by {@link startChartTileRecovery}, which rotates
 * the source key once tiles start failing so OpenLayers rebuilds them (it will
 * not re-request an `ERROR` tile on its own) — for an outage of any duration, and
 * without the `source.refresh()` render loop (openlayers#17389). The retry also
 * stops immediately once OpenLayers discards the tile (pan/zoom). A definitive
 * 4xx (e.g. a 404 for an empty tile) renders as an empty tile rather than an
 * error, so only an exhausted transient failure reaches `ERROR` — which
 * startChartTileRecovery then rebuilds.
 */
function resilientVectorTileLoader(
  options?: ResilientTileLoadingOptions
): (tile: Tile, url: string) => void {
  return (tile: Tile, url: string): void => {
    const vectorTile = tile as VectorTile<FeatureLike>;
    const isDiscarded = () =>
      (vectorTile as unknown as { disposed?: boolean }).disposed === true;
    vectorTile.setLoader(
      (extent: Extent, resolution: number, projection: Projection) => {
        fetchArrayBufferWithRetry(url, {
          ...options,
          retries: options?.retries ?? Number.POSITIVE_INFINITY,
          // Keep re-checking a stalled tile at least every 15 s so it recovers
          // on its own once the link returns, without pinning the queue forever.
          maxBackoffMs: options?.maxBackoffMs ?? 15000,
          // Short self-heal window for brief blips: retry a few times, then let
          // the tile error so it stops holding a shared TileQueue slot. Longer
          // outages are recovered by startChartTileRecovery (key rotation), which
          // does not pin slots; this also means a tile OpenLayers dropped without
          // disposing (removeSourceTiles leaves `disposed` false) cannot keep
          // re-requesting beyond this window.
          maxElapsedMs: options?.maxElapsedMs ?? 45000,
          shouldContinue: () =>
            !isDiscarded() && (options?.shouldContinue?.() ?? true)
        })
          .then((data) => {
            if (isDiscarded()) {
              return;
            }
            const format = vectorTile.getFormat();
            const features = format.readFeatures(data, {
              extent,
              featureProjection: projection
            });
            vectorTile.setFeatures(features);
          })
          .catch((err) => {
            if (isDiscarded()) {
              // The tile has been discarded by OpenLayers — it's already gone.
              return;
            }
            if (err && (err as { definitive?: boolean }).definitive) {
              // A definitive 4xx (e.g. a 404 for an empty tile) is not a
              // connectivity failure: render an empty tile so it does not trip
              // startChartTileRecovery into rotating keys on a healthy link.
              vectorTile.setFeatures([]);
            } else {
              // Transient failure exhausted the short window: error so the slot
              // frees; startChartTileRecovery rebuilds it once the link returns.
              vectorTile.setState(TileState.ERROR);
            }
          });
      }
    );
  };
}

/**
 * Install a resilient tile loader on every {@link VectorTileSource} within a
 * chart's layer group (recursing into nested groups), so a stalled or failed
 * vector tile is retried instead of leaving the chart stuck on the previous
 * zoom level.
 *
 * Only vector tile sources are touched. Raster (image) tile sources are left on
 * the OpenLayers default loader: the browser already surfaces image load
 * errors, and fetching image tiles through `fetch` rather than an `<img>`
 * element would impose CORS requirements that many public raster tile servers
 * do not satisfy.
 *
 * Call after `apply()` has resolved, when the sources described by the style
 * have been created. Returns a teardown that stops the outage-recovery watcher
 * it starts (see {@link startChartTileRecovery}); call it when the chart layer
 * is destroyed or before re-applying a style to the same group.
 */
export function makeChartTilesResilient(
  group: LayerGroup,
  options?: ResilientTileLoadingOptions
): () => void {
  const loader = resilientVectorTileLoader(options);
  const walk = (layers: BaseLayer[]): void => {
    for (const child of layers) {
      if (child instanceof LayerGroup) {
        walk(child.getLayers().getArray());
      } else if (child instanceof Layer) {
        const source = child.getSource();
        if (source instanceof VectorTileSource) {
          source.setTileLoadFunction(loader);
        }
      }
    }
  };
  walk(group.getLayers().getArray());
  // Longer outages are recovered at the source level (the in-loader retry only
  // covers short blips); return that watcher's teardown for the caller to stop.
  return startChartTileRecovery(group);
}

/**
 * Turns a stream of tile-load failures into at most one pending key-rotation,
 * with exponential back-off between attempts (reset by a successful load or an
 * immediate trigger). Kept free of OpenLayers so the timing can be unit-tested.
 */
export interface TileRecoveryScheduler {
  /** A tile failed to load: arm a (debounced) rotation if none is pending. */
  onError(): void;
  /** A tile loaded: connectivity looks healthy again, so reset the back-off. */
  onLoadEnd(): void;
  /** Rotate now and reset the back-off (e.g. the browser came back online). */
  triggerNow(): void;
  /** Stop scheduling and drop any pending rotation. */
  teardown(): void;
}

export function createTileRecoveryScheduler(config: {
  rotate: () => void;
  minDelayMs?: number;
  maxDelayMs?: number;
}): TileRecoveryScheduler {
  const minDelayMs = config.minDelayMs ?? 15000;
  const maxDelayMs = config.maxDelayMs ?? 120000;
  let delayMs = minDelayMs;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let torn = false;
  const clear = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };
  return {
    onError(): void {
      if (torn || timer !== undefined) {
        return;
      }
      timer = setTimeout(() => {
        timer = undefined;
        if (torn) {
          return;
        }
        config.rotate();
        // Grow the wait for the next attempt; a still-failing rotation fires
        // another tileloaderror, which re-arms at this larger delay.
        delayMs = Math.min(delayMs * 2, maxDelayMs);
      }, delayMs);
    },
    onLoadEnd(): void {
      // Only treat a success as "recovered" when no rotation is pending. While a
      // rotation is armed (a tile is still failing), a sibling tile that loads
      // from cache must not reset the back-off, or one persistently-failing tile
      // would keep the whole style rotating at the minimum interval forever.
      if (timer === undefined) {
        delayMs = minDelayMs;
      }
    },
    triggerNow(): void {
      if (torn) {
        return;
      }
      clear();
      delayMs = minDelayMs;
      config.rotate();
    },
    teardown(): void {
      torn = true;
      clear();
    }
  };
}

/**
 * Recover a chart's resilient vector tiles from an outage of any length, and
 * return a function that stops it.
 *
 * {@link resilientVectorTileLoader} only absorbs short blips before letting a
 * tile error (so it doesn't hold a shared TileQueue slot). OpenLayers never
 * re-requests an errored vector tile on its own, so on a longer outage the chart
 * would stay frozen on the last-drawn tiles until the user pans. This watches
 * each vector source for load failures and, with an exponential back-off,
 * rotates the source key — the same non-destructive mechanism as
 * {@link startChartTileRefresh}: OpenLayers keeps drawing the stale tiles while
 * fresh ones are rebuilt, so the chart never blanks and there is no
 * `source.refresh()` render loop (openlayers#17389). A successful load resets
 * the back-off; a browser `online` event rotates immediately. Because rotations
 * are spaced by the back-off, during an outage the online tiles occupy the
 * TileQueue only in brief bursts, leaving room for local chart sources.
 */
export function startChartTileRecovery(
  group: LayerGroup,
  config?: { minDelayMs?: number; maxDelayMs?: number }
): () => void {
  const sources: VectorTileSource[] = [];
  const collect = (layers: BaseLayer[]): void => {
    for (const child of layers) {
      if (child instanceof LayerGroup) {
        collect(child.getLayers().getArray());
      } else if (child instanceof Layer) {
        const source = child.getSource();
        if (source instanceof VectorTileSource) {
          sources.push(source);
        }
      }
    }
  };
  collect(group.getLayers().getArray());
  if (sources.length === 0) {
    return () => undefined;
  }

  const rotate = (): void => {
    // Rotate the source key ONLY, leaving the tile URL unchanged. A failed
    // request was never cached, so a new key is enough to re-request it; tiles
    // that had loaded come back from the browser/HTTP cache or a local caching
    // proxy at the same URL rather than re-downloading (which matters on a
    // metered Starlink/cellular link). This is the opposite of
    // startChartTileRefresh, whose tiles are time-varying and must cache-bust
    // the URL to fetch new data — recovery must NOT.
    for (const source of sources) {
      source.setTileUrlFunction(
        source.getTileUrlFunction(),
        String(Date.now())
      );
    }
  };
  const scheduler = createTileRecoveryScheduler({ ...config, rotate });

  const onError = (): void => scheduler.onError();
  const onLoadEnd = (): void => scheduler.onLoadEnd();
  for (const source of sources) {
    source.on('tileloaderror', onError);
    source.on('tileloadend', onLoadEnd);
  }
  const onOnline = (): void => scheduler.triggerNow();
  const hasWindow = typeof window !== 'undefined';
  if (hasWindow) {
    window.addEventListener('online', onOnline);
  }

  return () => {
    for (const source of sources) {
      source.un('tileloaderror', onError);
      source.un('tileloadend', onLoadEnd);
    }
    if (hasWindow) {
      window.removeEventListener('online', onOnline);
    }
    scheduler.teardown();
  };
}

export {
  MIN_CHART_REFRESH_INTERVAL_MS,
  MAX_CHART_REFRESH_INTERVAL_MS
} from 'src/app/lib/chart-time';

/**
 * Start a periodic, non-destructive refresh of a chart's raster tile source and
 * return a function that stops it. Used for time-varying charts (weather radar,
 * satellite) that declare a `refreshInterval`.
 *
 * It rotates the source key rather than calling `source.refresh()`. `refresh()`
 * clears the tile cache, so the layer goes blank whenever the re-fetch fails —
 * being offline is the normal case on a boat, and a blank radar is worse than a
 * slightly stale one. Rotating the key (via `setTileUrlFunction`, the public
 * path to the source's protected `setKey`) creates fresh tile objects while the
 * previous key lands on the renderer's stale-tile list, so OpenLayers keeps
 * drawing the last successfully-loaded tile until its replacement reaches
 * `LOADED`. A failed or offline refresh therefore just leaves the current frame
 * in place, silently, and the next tick tries again.
 *
 * Each tick also stamps the tile URL with a `_refresh=<key>` query parameter
 * ({@link cacheBustTileUrl}). Rotating the key alone re-requests the *same*
 * URL, and Chrome serves an image it already holds straight back from its
 * in-memory cache for the life of the page — even when the server sent no
 * caching headers at all (IEM's NEXRAD WMS, for one) — so the "refresh" shows
 * the old frame. A user adding a public WMS/WMTS cannot make the server send
 * `Cache-Control: no-cache`; a changed URL is the one thing that works
 * everywhere. Servers ignore unknown query parameters, and re-fetching every
 * tile on each tick is what the interval asks for anyway.
 *
 * `beforeTick` runs first on each tick, before the key rotates: a
 * time-varying chart showing its newest frame re-resolves which frame that is
 * there (an archival source has no live frame, so "newest" is an instant that
 * moves on), and a retarget it makes is picked up by the wrapper below.
 *
 * The interval is clamped to [{@link MIN_CHART_REFRESH_INTERVAL_MS},
 * {@link MAX_CHART_REFRESH_INTERVAL_MS}]. An absent, non-finite or non-positive
 * interval, or a source that is not URL-based, installs no timer (returns a
 * no-op), so static charts are unaffected.
 */
export function startChartTileRefresh(
  source: TileSource | null | undefined,
  refreshInterval?: number,
  beforeTick?: () => void
): () => void {
  const interval = chartRefreshIntervalMs(refreshInterval);
  if (!(source instanceof UrlTile) || interval === undefined) {
    return () => undefined;
  }
  if (interval !== refreshInterval) {
    console.debug(
      `startChartTileRefresh: refreshInterval ${refreshInterval}ms clamped to ${interval}ms`
    );
  }
  const timer = setInterval(() => {
    beforeTick?.();
    // Cache-busted URL function, new key -- rotates the tile cache key
    // non-destructively. Wrap the source's own URL builder (never a previous
    // tick's wrapper, or the parameter would stack), so LAYERS / TIME changes
    // made on the source since the last tick are still honoured.
    const current = source.getTileUrlFunction();
    const base = refreshWrapperBase.get(current) ?? current;
    const key = String(Date.now());
    const wrapped: UrlFunction = (tileCoord, pixelRatio, projection) =>
      cacheBustTileUrl(base(tileCoord, pixelRatio, projection), key);
    refreshWrapperBase.set(wrapped, base);
    source.setTileUrlFunction(wrapped, key);
  }, interval);
  return () => clearInterval(timer);
}

/** Query parameter a refresh tick stamps on every tile URL. */
export const CHART_REFRESH_URL_PARAM = '_refresh';

/**
 * A tile URL function installed by a refresh tick, mapped to the source's own
 * URL function it wraps, so the next tick (or a restart with a new interval)
 * wraps the original rather than stacking wrappers.
 */
const refreshWrapperBase = new WeakMap<UrlFunction, UrlFunction>();

/**
 * The tile URL with a refresh key appended as a query parameter, so the
 * browser treats it as a new resource rather than reusing the image it cached
 * for the previous tick. The parameter goes before any `#` fragment -- a
 * fragment is never sent, so a key placed after it would change nothing. An
 * undefined URL (no tile there) stays undefined.
 */
export function cacheBustTileUrl(
  url: string | undefined,
  key: string
): string | undefined {
  if (!url) {
    return url;
  }
  const hash = url.indexOf('#');
  const base = hash === -1 ? url : url.slice(0, hash);
  const fragment = hash === -1 ? '' : url.slice(hash);
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}${CHART_REFRESH_URL_PARAM}=${key}${fragment}`;
}

/**
 * Source key used when a URL-template tile source returns to its live frame
 * by tile-URL function (tileJSON), where there is no URL to derive one from.
 * Any instant's key is its tile URL, so this can never collide with one.
 */
export const CHART_TIME_LIVE_KEY = 'live';

/**
 * Show a selected instant on a URL-template tile source (tilelayer / XYZ,
 * tileJSON), or its live frame for `null`. Non-destructive, the same way
 * {@link startChartTileRefresh} is: a new URL (or function) rotates the source
 * key, so the previous frame stays on screen until the new one has loaded —
 * playback steps every few hundred milliseconds, and at sea a frame may never
 * arrive.
 *
 * `live` is what draws the live frame: the plain chart URL for XYZ, or the
 * tile-URL function a tileJSON source built from its document (which has no
 * template URL of its own). An instant needs the resource's `time.url`
 * template; without one it cannot be shown and the source is left as it is.
 */
export function applyChartTimeToTileSource(
  source: UrlTile,
  time: string | null,
  timeUrl: string | undefined,
  live: string | UrlFunction
): void {
  if (time === null) {
    if (typeof live === 'string') {
      source.setUrl(live);
    } else {
      source.setTileUrlFunction(live, CHART_TIME_LIVE_KEY);
    }
    return;
  }
  if (typeof timeUrl !== 'string' || !timeUrl) {
    return;
  }
  source.setUrl(chartTimeTileUrl(timeUrl, time));
}

/**
 * Show a selected instant on a WMS source through the standard `TIME`
 * parameter, or drop it for `null` so the server's declared default frame
 * applies. `updateParams` rotates the source key, so the swap is
 * non-destructive (OpenLayers skips an undefined parameter when building the
 * request).
 */
export function applyChartTimeToWms(
  source: TileWMS,
  time: string | null
): void {
  source.updateParams({ TIME: time ?? undefined });
}

/**
 * Show a selected instant on a WMTS source through its `Time` dimension, or
 * restore the dimension the capabilities document declared as default for
 * `null`. The default is restored rather than removed because a RESTful
 * template would otherwise stringify the missing value into the URL. The
 * dimension is matched by name case-insensitively against `defaults` (services
 * spell it `Time`, `TIME` or `time`); `Time` is used when the capabilities
 * declared none. `updateDimensions` rotates the source key, so the swap is
 * non-destructive.
 */
export function applyChartTimeToWmts(
  source: WMTS,
  time: string | null,
  defaults: Record<string, unknown> = {}
): void {
  const key =
    Object.keys(defaults).find((k) => k.toLowerCase() === 'time') ?? 'Time';
  source.updateDimensions({ [key]: time ?? defaults[key] });
}
