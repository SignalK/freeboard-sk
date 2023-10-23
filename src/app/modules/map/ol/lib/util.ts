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
export function mapifyCoords(coords: Array<Coordinate>): Array<Coordinate> {
  if (coords.length === 0) {
    return coords;
  }
  let dlCrossing = 0;
  const last = coords[0];
  for (let i = 0; i < coords.length; i++) {
    if (inDLCrossingZone(coords[i]) || inDLCrossingZone(last)) {
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
