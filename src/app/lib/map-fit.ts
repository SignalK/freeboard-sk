/** Fitting the map to lon/lat boxes, and testing boxes against the view.
 *
 * A box is `[west, south, east, north]` in degrees with longitudes in
 * `[-180, 180]`; `west > east` crosses the antimeridian and is read the short
 * way round (RFC 7946 §5.2, as the Signal K Track API and the Plotter
 * Extensions API write it). Pure functions, no map instance, so they can be
 * unit tested directly.
 */

import { Position } from 'src/app/types';

/** A lon/lat box `[west, south, east, north]`; see the module comment. */
export type LonLatBox = [number, number, number, number];

const EARTH_RADIUS = 6378137;

/** Web Mercator ground resolution at zoom 0 on the equator, in metres per
 * pixel: the equator's length over one 256-pixel tile. */
export const MERCATOR_RESOLUTION_Z0 = (2 * Math.PI * EARTH_RADIUS) / 256;

/** Web Mercator northing (metres) of a latitude, clamped to the projection. */
function mercatorY(lat: number): number {
  const c = Math.max(-85, Math.min(85, lat));
  return EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + (c * Math.PI) / 360));
}

/** The latitude halfway between `s` and `n` in Web Mercator, both clamped to
 * the projection's usable range. */
export function mercatorMidLatitude(s: number, n: number): number {
  const mid = (mercatorY(s) + mercatorY(n)) / 2 / EARTH_RADIUS;
  return ((2 * Math.atan(Math.exp(mid)) - Math.PI / 2) * 180) / Math.PI;
}

/** Degrees of longitude a box spans eastwards from its west edge, 0–360. */
export function lonSpan(w: number, e: number): number {
  return e >= w ? e - w : e - w + 360;
}

/** `lon` wrapped into (-180, 180]. */
function wrapLon(lon: number): number {
  return lon > 180 ? lon - 360 : lon <= -180 ? lon + 360 : lon;
}

/** Deepest zoom a fitted box is shown at. A box of one point (a single
 * waypoint, a vessel that never moved) has no size and would otherwise zoom
 * as far in as the map goes, well past any chart's detail; a tiny box nearly
 * as far. */
export const FIT_MAX_ZOOM = 16;

/** Share of the map a fitted box fills, leaving a margin round its edge. */
const FIT_FILL = 0.85;

/** The map centre and zoom that fit a box into a map `size` pixels
 * (`[width, height]`) with a margin. The centre is the box's middle in Web
 * Mercator, taken the short way round when the box crosses the antimeridian,
 * so a box near Fiji is centred near 180° rather than on Greenwich. On a map
 * turned `rotation` radians (heading-up) the box is fitted as it lies on the
 * screen, turned with it. A box with no size (a single point) gets the
 * maximum zoom. */
export function fitBbox(
  bbox: LonLatBox,
  size: [number, number],
  zoomLimits: { min: number; max: number },
  rotation = 0
): { center: Position; zoom: number } {
  const [w, s, e, n] = bbox;
  const span = lonSpan(w, e);
  const center: Position = [wrapLon(w + span / 2), mercatorMidLatitude(s, n)];
  const width = ((span * Math.PI) / 180) * EARTH_RADIUS;
  const height = mercatorY(n) - mercatorY(s);
  const cos = Math.abs(Math.cos(rotation));
  const sin = Math.abs(Math.sin(rotation));
  const resolution = Math.max(
    (width * cos + height * sin) / Math.max(1, size[0] * FIT_FILL),
    (width * sin + height * cos) / Math.max(1, size[1] * FIT_FILL)
  );
  const zoom =
    resolution > 0
      ? Math.log2(MERCATOR_RESOLUTION_Z0 / resolution)
      : zoomLimits.max;
  return {
    center,
    zoom: Math.min(zoomLimits.max, Math.max(zoomLimits.min, zoom))
  };
}

/** Whether a box reaches into a map view: `view` is the lon/lat
 * `[w, s, e, n]` viewport, whose longitudes run past ±180 when the map shows
 * another world copy. The box is tried in the world copies either side too,
 * so a box just across the antimeridian from the view still counts. */
export function bboxInView(
  bbox: LonLatBox,
  view: number[] | null | undefined
): boolean {
  if (!Array.isArray(view) || view.length !== 4) {
    return false;
  }
  const [vw, vs, ve, vn] = view;
  const [w, s, , n] = bbox;
  if (s > vn || n < vs) {
    return false;
  }
  if (ve - vw >= 360) {
    return true;
  }
  const east = w + lonSpan(w, bbox[2]);
  const shift = Math.round((vw + ve - w - east) / 2 / 360) * 360;
  return [-360, 0, 360].some(
    (k) => w + shift + k <= ve && east + shift + k >= vw
  );
}
