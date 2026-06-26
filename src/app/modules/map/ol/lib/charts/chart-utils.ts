import { Extent, intersects } from 'ol/extent';
import { transformExtent } from 'ol/proj';

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
 * Limitation: this is a plain min/max overlap test and does not account for a
 * viewport that crosses the antimeridian (+/-180 longitude); near the dateline a
 * chart may be wrongly included or excluded.
 *
 * Example:
 *   bounds=[10, 40, 20, 50], extent=[15, 45, 30, 60] -> true  (overlap)
 *   bounds=[10, 40, 20, 50], extent=[30, 45, 40, 60] -> false (disjoint)
 *   bounds=undefined,        extent=[...]            -> true  (global chart)
 */
export function isChartInView(
  bounds: number[] | undefined,
  extent: Extent
): boolean {
  if (!Array.isArray(bounds) || bounds.length !== 4) {
    return true;
  }
  return intersects(bounds, extent);
}
