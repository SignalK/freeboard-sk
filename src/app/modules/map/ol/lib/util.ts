import TileLayer from 'ol/layer/Tile.js';
import OSM from 'ol/source/OSM.js';
import { getPointResolution, fromLonLat } from 'ol/proj';

import { Coordinate } from './models';

export function stringToEl(html: string) {
  const parser = new DOMParser();
  const DOM = parser.parseFromString(html, 'text/html');
  return DOM.body.firstChild;
}

export function defaultLayers() {
  return [osmLayer()];
}

export function osmLayer(className?: string) {
  return new TileLayer({ source: new OSM(), className });
}

export function osmSource() {
  return new OSM();
}

// Point | LineString | MultiLineString
export function fromLonLatArray(
  coords: Array<Array<Coordinate>> | Array<Coordinate> | Coordinate
) {
  if (!Array.isArray(coords)) {
    return coords;
  }
  if (typeof coords[0] === 'number') {
    return fromLonLat(coords as Coordinate);
  } else if (Array.isArray(coords[0])) {
    return coords.map((c) => {
      return fromLonLatArray(c);
    });
  } else {
    return coords;
  }
}

/**
 * Unwrap longitudes so that consecutive points never jump by more than 180°,
 * then shift the whole line so the first coordinate is in [-180, 180].
 * This keeps the resulting extent within one Mercator world width so that
 * OpenLayers wrapX can clone the feature correctly in adjacent world copies.
 */
export function mapifyCoords(coords: Array<Coordinate>): Array<Coordinate> {
  if (coords.length < 2) {
    return coords;
  }
  // Deep-copy the tuples so the caller's coordinate objects are not modified.
  const out: Array<Coordinate> = coords.map((p) => [p[0], p[1]] as Coordinate);
  // Normalise the first point to [-180, 180].
  while (out[0][0] > 180) out[0][0] -= 360;
  while (out[0][0] < -180) out[0][0] += 360;
  // Unwrap subsequent points relative to their predecessor.
  for (let i = 1; i < out.length; i++) {
    while (out[i][0] - out[i - 1][0] > 180) out[i][0] -= 360;
    while (out[i - 1][0] - out[i][0] > 180) out[i][0] += 360;
  }
  return out;
}

/** Convert latitude (degrees) to Mercator Y. */
function latToMercY(latDeg: number): number {
  const latRad = (latDeg * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + latRad / 2));
}

/** Convert Mercator Y back to latitude (degrees). */
function mercYToLat(mercY: number): number {
  return ((2 * Math.atan(Math.exp(mercY)) - Math.PI / 2) * 180) / Math.PI;
}

/**
 * Split a LineString at each antimeridian (±180°) crossing.
 * Input coordinates must be in [-180, 180].
 * Returns an array of segments, each fully within [-180, 180], with
 * interpolated endpoints at exactly ±180° where crossings occur.
 * Each segment can be passed independently to fromLonLatArray so that
 * OpenLayers wrapX cloning works correctly on each compact piece.
 */
export function splitAtAntimeridian(coords: Coordinate[]): Coordinate[][] {
  if (coords.length < 2) return coords.length === 0 ? [] : [coords];

  const segments: Coordinate[][] = [];
  let current: Coordinate[] = [[coords[0][0], coords[0][1]]];

  for (let i = 1; i < coords.length; i++) {
    const [x0, y0] = current[current.length - 1];
    const [x1, y1] = [coords[i][0], coords[i][1]];
    const dLon = x1 - x0;

    if (dLon > 180) {
      // Westward crossing: x0 is west (negative), x1 is east (positive)
      const dLonUnwrapped = dLon - 360;
      const t = (-180 - x0) / dLonUnwrapped;
      const yIntercept = mercYToLat(
        latToMercY(y0) + t * (latToMercY(y1) - latToMercY(y0))
      );
      current.push([-180, yIntercept]);
      segments.push(current);
      current = [[180, yIntercept], [x1, y1]];
    } else if (dLon < -180) {
      // Eastward crossing: x0 is east (positive), x1 is west (negative)
      const dLonUnwrapped = dLon + 360;
      const t = (180 - x0) / dLonUnwrapped;
      const yIntercept = mercYToLat(
        latToMercY(y0) + t * (latToMercY(y1) - latToMercY(y0))
      );
      current.push([180, yIntercept]);
      segments.push(current);
      current = [[-180, yIntercept], [x1, y1]];
    } else {
      current.push([x1, y1]);
    }
  }

  if (current.length >= 2) {
    segments.push(current);
  }

  return segments;
}

// ** return adjusted radius to correctly render circle on ground at given position.
export function mapifyRadius(radius: number, position: Coordinate): number {
  if (typeof radius === 'undefined' || typeof position === 'undefined') {
    return radius;
  }
  return radius / getPointResolution('EPSG:3857', 1, fromLonLat(position));
}
