import { Extent, intersects } from 'ol/extent';
import { transformExtent } from 'ol/proj';
import TileLayer from 'ol/layer/Tile';
import RenderEvent from 'ol/render/Event';
import { ChartImageAdjustment } from 'src/app/types';

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
