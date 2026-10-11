/**
 * Bearing & Distance measurement (#905): the readout and the range ring drawn
 * around the origin.
 */
import { getGreatCircleBearing } from 'geolib';
import Polygon, { circular } from 'ol/geom/Polygon';
import { GeoUtils } from 'src/app/lib/geoutils';
import { Position } from 'src/app/types';

/** Earth radius geolib measures with, so the ring passes through the target. */
const GEOLIB_EARTH_RADIUS = 6378137;

export interface BearingDistanceReadout {
  /** metres */
  distance: number;
  /** initial great-circle bearing origin → target, degrees */
  bearing: number;
  /** the bearing reversed, degrees */
  reciprocal: number;
}

export function bearingDistanceReadout(
  origin: Position,
  target: Position
): BearingDistanceReadout {
  const distance = GeoUtils.distanceTo(origin, target) ?? 0;
  const bearing = getGreatCircleBearing(origin, target) ?? 0;
  return { distance, bearing, reciprocal: (bearing + 180) % 360 };
}

/**
 * The points `distance` metres from `origin`, as an EPSG:4326 polygon.
 * Geodesic rather than a projected circle: a Mercator circle is stretched
 * north-south at high latitude, so it would not pass through things that are
 * actually at the same range. Longitudes are left unwrapped, so a ring that
 * crosses the antimeridian stays continuous.
 */
export function bearingDistanceRing(
  origin: Position,
  distance: number,
  points = 128
): Polygon {
  return circular(origin, distance, points, GEOLIB_EARTH_RADIUS);
}
