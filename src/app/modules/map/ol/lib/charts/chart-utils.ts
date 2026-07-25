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
