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
 *    remain; and
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
  /** Extra attempts after the first before the tile is marked as errored. */
  retries?: number;
  /** Base back-off between attempts, multiplied by the (1-based) attempt number. */
  backoffMs?: number;
}

const DEFAULT_RESILIENT_TILE_OPTIONS: Required<ResilientTileLoadingOptions> = {
  timeoutMs: 30000,
  retries: 2,
  backoffMs: 1000
};

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

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
  const opts: Required<ResilientTileLoadingOptions> = {
    timeoutMs: options?.timeoutMs ?? DEFAULT_RESILIENT_TILE_OPTIONS.timeoutMs,
    retries: options?.retries ?? DEFAULT_RESILIENT_TILE_OPTIONS.retries,
    backoffMs: options?.backoffMs ?? DEFAULT_RESILIENT_TILE_OPTIONS.backoffMs
  };
  let lastError: unknown;
  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    if (attempt > 0) {
      await delay(opts.backoffMs * attempt);
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
      // A 4xx (other than 429 Too Many Requests) is a definitive answer: stop.
      if (response.status < 500 && response.status !== 429) {
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
 * Build a vector tile load function that fetches via
 * {@link fetchArrayBufferWithRetry} and parses the result with the tile's own
 * format, only marking the tile as errored once every attempt has failed.
 *
 * Retrying happens inside the loader, before the tile ever reaches the `ERROR`
 * state, so it does not rely on `tileloaderror` handling or on calling
 * `source.refresh()` — both of which are documented to cause render loops with
 * vector tile sources (https://github.com/openlayers/openlayers/issues/17389).
 */
function resilientVectorTileLoader(
  options?: ResilientTileLoadingOptions
): (tile: Tile, url: string) => void {
  return (tile: Tile, url: string): void => {
    const vectorTile = tile as VectorTile<FeatureLike>;
    vectorTile.setLoader(
      (extent: Extent, resolution: number, projection: Projection) => {
        fetchArrayBufferWithRetry(url, options)
          .then((data) => {
            const format = vectorTile.getFormat();
            const features = format.readFeatures(data, {
              extent,
              featureProjection: projection
            });
            vectorTile.setFeatures(features);
          })
          .catch(() => {
            vectorTile.setState(TileState.ERROR);
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
 * have been created.
 */
export function makeChartTilesResilient(
  group: LayerGroup,
  options?: ResilientTileLoadingOptions
): void {
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
 * The interval is clamped to [{@link MIN_CHART_REFRESH_INTERVAL_MS},
 * {@link MAX_CHART_REFRESH_INTERVAL_MS}]. An absent, non-finite or non-positive
 * interval, or a source that is not URL-based, installs no timer (returns a
 * no-op), so static charts are unaffected.
 */
export function startChartTileRefresh(
  source: TileSource | null | undefined,
  refreshInterval?: number
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
