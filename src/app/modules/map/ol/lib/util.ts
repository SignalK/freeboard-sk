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

export function osmLayer() {
  return new TileLayer({ source: new OSM() });
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

/** DateLine Crossing:
 * returns true if point is in the zone for dateline transition
 * zoneValue: lower end of 180 to xx range within which Longitude must fall for retun value to be true
 **/
export function inDLCrossingZone(coord: Coordinate, zoneValue = 170) {
  return Math.abs(coord[0]) >= zoneValue ? true : false;
}

// update linestring coords for map display (including dateline crossing)
export function mapifyCoords(
  coords: Array<Coordinate>,
  zoneValue?: number
): Array<Coordinate> {
  if (coords.length === 0) {
    return coords;
  }
  let dlCrossing = 0;
  const last = coords[0];
  for (let i = 0; i < coords.length; i++) {
    if (
      inDLCrossingZone(coords[i], zoneValue) ||
      inDLCrossingZone(last, zoneValue)
    ) {
      dlCrossing =
        last[0] > 0 && coords[i][0] < 0
          ? 1
          : last[0] < 0 && coords[i][0] > 0
            ? -1
            : 0;
      if (dlCrossing === 1) {
        coords[i][0] = coords[i][0] + 360;
      }
      if (dlCrossing === -1) {
        coords[i][0] = Math.abs(coords[i][0]) - 360;
      }
    }
  }
  return coords;
}

/**
 * Split a LineString at each antimeridian (±180°) crossing.
 * Input coordinates must be in [-180, 180].
 * Returns an array of segments, each fully within [-180, 180], with
 * interpolated endpoints at exactly ±180° where crossings occur.
 * Each segment can be passed independently to fromLonLatArray so that
 * OpenLayers wrapX cloning works correctly on each compact piece.
 */
/** Convert latitude (degrees) to Mercator Y. */
function latToMercY(latDeg: number): number {
  const latRad = (latDeg * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + latRad / 2));
}

/** Convert Mercator Y back to latitude (degrees). */
function mercYToLat(mercY: number): number {
  return ((2 * Math.atan(Math.exp(mercY)) - Math.PI / 2) * 180) / Math.PI;
}

export function splitAtAntimeridian(coords: Coordinate[]): Coordinate[][] {
  if (coords.length < 2) return coords.length === 0 ? [] : [coords];

  const segments: Coordinate[][] = [];
  let current: Coordinate[] = [[coords[0][0], coords[0][1]]];

  for (let i = 1; i < coords.length; i++) {
    const [x0, y0] = current[current.length - 1];
    const [x1, y1] = [coords[i][0], coords[i][1]];
    const dLon = x1 - x0;

    if (dLon > 180) {
      // Westward crossing: x0 is east (positive), x1 is west (negative)
      const dLonUnwrapped = dLon - 360;
      const t = (-180 - x0) / dLonUnwrapped;
      const yIntercept = mercYToLat(
        latToMercY(y0) + t * (latToMercY(y1) - latToMercY(y0))
      );
      current.push([-180, yIntercept]);
      segments.push(current);
      current = [[180, yIntercept], [x1, y1]];
    } else if (dLon < -180) {
      // Eastward crossing: x0 is west (negative), x1 is east (positive)
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
