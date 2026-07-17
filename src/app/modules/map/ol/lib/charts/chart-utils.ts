import { Extent } from 'ol/extent';
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
