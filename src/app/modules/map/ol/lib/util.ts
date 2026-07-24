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
  // Spread rather than [c[0], c[1]] so an optional third ordinate survives.
  const out: Array<Coordinate> = coords.map((c) => [...c] as Coordinate);
  if (out.length === 0) {
    return out;
  }
  // Shift by whole turns in one step. Repeated -= 360 would spin for an
  // impractical number of iterations on a wildly out-of-range longitude.
  if (out[0][0] > 180) {
    out[0][0] -= 360 * Math.ceil((out[0][0] - 180) / 360);
  } else if (out[0][0] < -180) {
    out[0][0] += 360 * Math.ceil((-180 - out[0][0]) / 360);
  }
  for (let i = 1; i < out.length; i++) {
    const delta = out[i][0] - out[i - 1][0];
    if (delta > 180) {
      out[i][0] -= 360 * Math.ceil((delta - 180) / 360);
    } else if (delta < -180) {
      out[i][0] += 360 * Math.ceil((-180 - delta) / 360);
    }
  }
  return out;
}

/**
 * Render-space offset (EPSG:3857 metres) of the world copy a Mercator x lands
 * in, relative to the primary world. OpenLayers pans horizontally without limit,
 * so a click east/west of the primary world carries an x outside
 * `[-worldWidth/2, worldWidth/2]`; this returns the whole-world shift that maps
 * the primary world onto that copy. The result is always a whole multiple of
 * `worldWidth`, so adding it to a primary-world position is visually transparent
 * under wrapX and never produces an out-of-range longitude. Returns 0 for the
 * primary world. See #572.
 */
export function worldCopyOffset(mercX: number, worldWidth: number): number {
  if (!Number.isFinite(mercX) || !(worldWidth > 0)) {
    return 0;
  }
  return Math.round(mercX / worldWidth) * worldWidth;
}

// ** return adjusted radius to correctly render circle on ground at given position.
export function mapifyRadius(radius: number, position: Coordinate): number {
  if (typeof radius === 'undefined' || typeof position === 'undefined') {
    return radius;
  }
  return radius / getPointResolution('EPSG:3857', 1, fromLonLat(position));
}
