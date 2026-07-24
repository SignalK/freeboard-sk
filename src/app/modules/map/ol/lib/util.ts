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
 * Unwrap longitudes for map display so consecutive points never jump more than
 * half a world.
 *
 * A line stored in [-180, 180] is ambiguous at the antimeridian: successive
 * points at 179 and -179 are 2 degrees apart on the water but 358 apart
 * numerically, so the line renders the long way around the globe. Shifting each
 * point by a multiple of 360 relative to its predecessor makes the sequence
 * continuous and the rendered segment short.
 *
 * Each longitude only ever gains a multiple of 360, so vertex count, order and
 * latitudes are preserved and the result maps 1:1 back onto the input — which is
 * what lets an unwrapped geometry stay editable. The first point is normalised
 * into [-180, 180] so the geometry starts in the primary world; OpenLayers
 * replicates geometry into adjacent world copies out to +/-540 degrees, and
 * anchoring the start keeps a line within that range.
 *
 * The input is left untouched — callers pass cached Signal K resource
 * coordinates straight in.
 */
export function mapifyCoords(coords: Array<Coordinate>): Array<Coordinate> {
  const out: Array<Coordinate> = coords.map((c) => [c[0], c[1]] as Coordinate);
  if (out.length === 0) {
    return out;
  }
  while (out[0][0] > 180) {
    out[0][0] -= 360;
  }
  while (out[0][0] < -180) {
    out[0][0] += 360;
  }
  for (let i = 1; i < out.length; i++) {
    while (out[i][0] - out[i - 1][0] > 180) {
      out[i][0] -= 360;
    }
    while (out[i - 1][0] - out[i][0] > 180) {
      out[i][0] += 360;
    }
  }
  return out;
}

// ** return adjusted radius to correctly render circle on ground at given position.
export function mapifyRadius(radius: number, position: Coordinate): number {
  if (typeof radius === 'undefined' || typeof position === 'undefined') {
    return radius;
  }
  return radius / getPointResolution('EPSG:3857', 1, fromLonLat(position));
}
