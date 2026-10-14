import { normalizeBounds } from 'signalk-plotterext-bus/host';
import { worldCopyOffset } from '../util';

/**
 * Frame-request geometry for image map overlays (`overlays.image`): turns the
 * map view into the north-up EPSG:3857 box, pixel size and pixel ratio an
 * overlay's runtime is asked to draw. Pure, so the maths is testable without a
 * map.
 */

const EARTH_RADIUS = 6378137;
export const MERC_HALF_WORLD = Math.PI * EARTH_RADIUS;
export const WORLD_WIDTH = 2 * MERC_HALF_WORLD;

/** Highest pixel ratio an overlay frame is drawn at, whatever the screen. */
export const MAX_OVERLAY_PIXEL_RATIO = 2;
/**
 * Most pixels in one frame (~32 MB at 4 bytes each). A bigger view is drawn at
 * a lower pixel ratio, keeping each overlay well inside the iOS canvas budget.
 */
export const MAX_OVERLAY_PIXELS = 8_000_000;
/** Rotation change (radians) that earns a fresh frame on its own: 5°. */
export const OVERLAY_ROTATION_THRESHOLD = (5 * Math.PI) / 180;

export interface OverlayViewInput {
  /**
   * Render-space extent covering the whole (possibly rotated) viewport, as
   * `View.calculateExtent(size)` returns it — may sit in any world copy.
   */
  extent: number[];
  /** Map units (metres) per CSS pixel. */
  resolution: number;
  /** View rotation, radians clockwise. */
  rotation: number;
  zoom: number;
  devicePixelRatio: number;
}

/** The request body (minus ids) plus the world copy it was made for. */
export interface OverlayView {
  view: {
    extent: [number, number, number, number];
    bounds: [number, number, number, number];
    width: number;
    height: number;
    pixelRatio: number;
    resolution: number;
    zoom: number;
    rotation: number;
  };
  /** Render-space shift of the viewed world copy (a multiple of WORLD_WIDTH). */
  worldOffset: number;
}

const lonOf = (x: number) => (x / MERC_HALF_WORLD) * 180;
const latOf = (y: number) =>
  ((2 * Math.atan(Math.exp(y / EARTH_RADIUS)) - Math.PI / 2) * 180) / Math.PI;

/**
 * The frame to ask for, given the current view; null when the view has no
 * usable size. The box is moved into the primary world (centre within
 * ±MERC_HALF_WORLD), so across the antimeridian it runs past ±MERC_HALF_WORLD
 * as one continuous box; it is never wider than one world, and is clipped to
 * the Mercator latitude limit.
 */
export function overlayView(input: OverlayViewInput): OverlayView | null {
  const [ex0, ey0, ex1, ey1] = input.extent;
  if (
    ![ex0, ey0, ex1, ey1, input.resolution].every(Number.isFinite) ||
    !(input.resolution > 0) ||
    !(ex1 > ex0 && ey1 > ey0)
  ) {
    return null;
  }
  const cx = (ex0 + ex1) / 2;
  const worldOffset = worldCopyOffset(cx, WORLD_WIDTH);
  const ccx = cx - worldOffset;
  const halfW = Math.min((ex1 - ex0) / 2, MERC_HALF_WORLD);
  const x0 = ccx - halfW;
  const x1 = ccx + halfW;
  const y0 = Math.max(ey0, -MERC_HALF_WORLD);
  const y1 = Math.min(ey1, MERC_HALF_WORLD);
  if (!(y1 > y0)) {
    return null;
  }

  const cssW = (x1 - x0) / input.resolution;
  const cssH = (y1 - y0) / input.resolution;
  let pixelRatio = Math.min(
    Math.max(input.devicePixelRatio || 1, 0.1),
    MAX_OVERLAY_PIXEL_RATIO
  );
  if (cssW * cssH * pixelRatio * pixelRatio > MAX_OVERLAY_PIXELS) {
    pixelRatio = Math.sqrt(MAX_OVERLAY_PIXELS / (cssW * cssH));
  }
  const width = Math.max(1, Math.round(cssW * pixelRatio));
  const height = Math.max(1, Math.round(cssH * pixelRatio));

  const bounds = normalizeBounds([lonOf(x0), latOf(y0), lonOf(x1), latOf(y1)]);
  if (!bounds) {
    return null;
  }
  return {
    view: {
      extent: [x0, y0, x1, y1],
      bounds,
      width,
      height,
      pixelRatio: Math.round(pixelRatio * 1000) / 1000,
      resolution: (x1 - x0) / width,
      zoom: input.zoom,
      rotation: input.rotation
    },
    worldOffset
  };
}

/** The view state a frame was last requested for. */
export interface RequestedView {
  extent: number[];
  /** Map size in CSS pixels. */
  size: number[];
  resolution: number;
  rotation: number;
}

/**
 * Whether a settled view needs a new frame: the visible area, scale or map
 * size changed, or the rotation changed past the threshold. A heading-up chart re-rotates
 * (and fires `moveend`) on every heading change, so small rotations alone are
 * deliberately ignored — the host rotates the last frame with the map.
 */
export function needsNewFrame(
  prev: RequestedView | null,
  next: RequestedView
): boolean {
  if (!prev) return true;
  if (
    prev.resolution !== next.resolution ||
    prev.size[0] !== next.size[0] ||
    prev.size[1] !== next.size[1]
  ) {
    return true;
  }
  let dr = Math.abs(next.rotation - prev.rotation) % (2 * Math.PI);
  dr = Math.min(dr, 2 * Math.PI - dr);
  if (dr > OVERLAY_ROTATION_THRESHOLD) return true;
  // compare centres: a pure rotation grows the covering box but keeps its centre
  const centre = (e: number[]) => [(e[0] + e[2]) / 2, (e[1] + e[3]) / 2];
  const pc = centre(prev.extent);
  const nc = centre(next.extent);
  const tolerance = next.resolution / 2;
  return (
    Math.abs(pc[0] - nc[0]) > tolerance || Math.abs(pc[1] - nc[1]) > tolerance
  );
}
