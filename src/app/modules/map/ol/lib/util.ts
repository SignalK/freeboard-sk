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

/** Named dash pattern → OL lineDash array (empty = solid) */
export const DASH_PATTERNS: Record<string, number[]> = {
  none: [],
  short: [2, 2],
  medium: [4, 4],
  long: [8, 4],
  alt: [8, 4, 2, 4]
};

export function lineDashFor(dash: string, weight = 1): number[] {
  const pattern = DASH_PATTERNS[dash] ?? [];
  return pattern.map(v => v * weight);
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

/**
 * Split a densified great-circle arc at antimeridian crossings.
 * A crossing is detected when consecutive longitudes differ by more than 180°.
 * Returns an array of coordinate segments suitable for a MultiLineString.
 */
export function splitAtAntimeridian(coords: Coordinate[]): Coordinate[][] {
  if (coords.length === 0) return [];
  const segments: Coordinate[][] = [];
  let current: Coordinate[] = [coords[0]];
  for (let i = 1; i < coords.length; i++) {
    if (Math.abs(coords[i][0] - coords[i - 1][0]) > 180) {
      segments.push(current);
      current = [coords[i]];
    } else {
      current.push(coords[i]);
    }
  }
  segments.push(current);
  return segments;
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

// ** return adjusted radius to correctly render circle on ground at given position.
export function mapifyRadius(radius: number, position: Coordinate): number {
  if (typeof radius === 'undefined' || typeof position === 'undefined') {
    return radius;
  }
  return radius / getPointResolution('EPSG:3857', 1, fromLonLat(position));
}
