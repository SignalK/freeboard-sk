import { Extent } from 'ol/extent';
import { transformExtent } from 'ol/proj';

/**
 * Convert chart bounds [minLon, minLat, maxLon, maxLat] to an EPSG:3857 extent
 * suitable for use as a layer extent. Returns undefined if bounds are missing
 * or cover the full world (no constraint needed).
 */
export function chartExtent(bounds?: number[]): Extent | undefined {
  if (!Array.isArray(bounds) || bounds.length < 4) return undefined;
  if (
    bounds[0] <= -180 &&
    bounds[1] <= -90 &&
    bounds[2] >= 180 &&
    bounds[3] >= 90
  ) {
    return undefined;
  }
  return transformExtent(bounds, 'EPSG:4326', 'EPSG:3857');
}
