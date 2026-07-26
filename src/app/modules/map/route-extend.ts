import { Position } from 'src/app/types';
import { worldCopyOffset } from './ol/lib/util';

/** EPSG:3857 world width in metres (the map's Mercator projection). */
export const WORLD_WIDTH_3857 = 2 * 20037508.342789244;

/** Per-point route metadata carried alongside the geometry. */
export interface RoutePointMeta {
  name?: string;
  description?: string;
}

/** Everything the caller needs to apply a route extension (issue #549). */
export interface RouteExtension {
  /** The route geometry with the clicked point appended (render space). */
  after: Position[];
  /** Per-point metadata, length-aligned with `after`, or undefined when the
   *  route carries none. */
  meta?: RoutePointMeta[];
  /** Pre-append snapshot for the Modify undo stack. */
  undo: { coordinates: Position[]; coordsMetadata?: RoutePointMeta[] };
}

/**
 * Render-space (EPSG:3857) coordinate to append when extending a route by a
 * clicked open-water point. `base` is the click in the primary world; the
 * result is shifted whole worlds so it lands in the same world copy as the
 * route body (given by its x-extent), keeping the new segment contiguous under
 * wrapX while the stored lon/lat stays world-agnostic (#572).
 */
export function worldAlignedPoint(
  base: Position,
  extentMinX: number,
  extentMaxX: number,
  worldWidth = WORLD_WIDTH_3857
): Position {
  const centreX = (extentMinX + extentMaxX) / 2;
  const shift = worldCopyOffset(centreX - base[0], worldWidth);
  return [base[0] + shift, base[1]];
}

/**
 * Append a clicked open-water point to the end of a route being modified, the
 * "quick add end point" behaviour of issue #549. Returns the new geometry, the
 * length-aligned metadata (the new end point has no name/description, matching a
 * drawn route), and the pre-append undo snapshot. Pure: the caller applies the
 * result to the feature and session state.
 */
export function extendRouteAtClick(
  before: Position[],
  meta: RoutePointMeta[] | undefined,
  base: Position,
  extentMinX: number,
  extentMaxX: number,
  worldWidth = WORLD_WIDTH_3857
): RouteExtension {
  const newPoint = worldAlignedPoint(base, extentMinX, extentMaxX, worldWidth);
  return {
    after: [...before, newPoint],
    meta: meta ? [...meta, { name: '' }] : undefined,
    undo: {
      coordinates: before.map((co) => [...co] as Position),
      coordsMetadata: meta ? meta.map((m) => ({ ...m })) : undefined
    }
  };
}
