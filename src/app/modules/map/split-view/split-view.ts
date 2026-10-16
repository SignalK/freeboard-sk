import { Coordinate } from 'ol/coordinate';
import { Position } from 'src/app/types';

/**
 * The split view's state. Kept per device, not in the synced config: a layout
 * that suits a laptop rarely suits a phone.
 */
export interface SplitViewState {
  enabled: boolean;
  /** Share of the map area the main chart keeps; the second pane gets the rest. */
  ratio: number;
  northUp: boolean;
  follow: boolean;
  /** Where the second pane was last left; null until it has been moved. */
  zoom: number | null;
  center: Position | null;
}

export const SPLIT_VIEW_STORAGE_KEY = 'fb-split-view';
/**
 * CSS variable on the map panel: the main chart's share while the divider is
 * dragged, so the panes resize live without a change detection run a frame.
 */
export const SPLIT_SHARE_VAR = '--split-main-share';
export const SPLIT_RATIO_MIN = 0.3;
export const SPLIT_RATIO_MAX = 0.7;
/**
 * The least a pane keeps along the split, so neither collapses to a strip.
 * Small enough that a phone (about 650 px along the split) still has nearly
 * the whole ratio range to drag the divider through.
 */
export const MIN_PANE_PX = 200;

export const DEFAULT_SPLIT_VIEW: SplitViewState = {
  enabled: false,
  ratio: 0.6,
  northUp: true,
  follow: false,
  zoom: null,
  center: null
};

export function clampRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) {
    return DEFAULT_SPLIT_VIEW.ratio;
  }
  return Math.min(SPLIT_RATIO_MAX, Math.max(SPLIT_RATIO_MIN, ratio));
}

/**
 * The ratio for a divider dragged to client point (x, y). `stacked` is true
 * when the panes are above each other (the panel is taller than wide). Null
 * when the panel has no size along the divider's axis, so the divider stays
 * put.
 */
export function ratioFromPointer(
  rect: { left: number; top: number; width: number; height: number },
  x: number,
  y: number,
  stacked: boolean
): number | null {
  const size = stacked ? rect.height : rect.width;
  if (!(size > 0)) {
    return null;
  }
  return clampRatio(stacked ? (y - rect.top) / size : (x - rect.left) / size);
}

/**
 * The share the main chart actually gets of a panel `size` pixels long along
 * the split: `ratio`, moved in so the second pane keeps `minPane` pixels and
 * the main chart `minMain`. When the panel cannot give both that much, the
 * second pane keeps its `minPane` (half the panel, if even that will not fit)
 * and the main chart gets the rest.
 */
export function fitRatio(
  ratio: number,
  size: number,
  minPane = MIN_PANE_PX,
  minMain = minPane
): number {
  if (!(size > 0)) {
    return ratio;
  }
  const ceiling = 1 - Math.min(0.5, minPane / size);
  const floor = Math.min(ceiling, minMain / size);
  return Math.min(ceiling, Math.max(floor, ratio));
}

/**
 * How far down from the top of the map panel a map toolbar reaches: its top,
 * the lowest bottom edge of its items (laid out from its padding box,
 * `offsetTop`; an item's content can run past its box) and its bottom
 * padding. Measured from the items, not the toolbar, so a toolbar cut short
 * and scrolling still reports its full reach. 0 with no item shown.
 */
export function toolbarReach(
  top: number,
  items: ArrayLike<{
    offsetTop: number;
    offsetHeight: number;
    scrollHeight: number;
  }>,
  paddingBottom: number
): number {
  let bottom = 0;
  for (let i = 0; i < items.length; i++) {
    const { offsetTop, offsetHeight, scrollHeight } = items[i];
    if (offsetHeight > 0) {
      bottom = Math.max(
        bottom,
        offsetTop + Math.max(offsetHeight, scrollHeight)
      );
    }
  }
  return bottom > 0 ? top + bottom + paddingBottom : 0;
}

const isPosition = (p: unknown): p is Position =>
  Array.isArray(p) &&
  p.length >= 2 &&
  p.slice(0, 2).every((n) => typeof n === 'number' && Number.isFinite(n)) &&
  Math.abs(p[0]) <= 180 &&
  Math.abs(p[1]) <= 90;

/** Reads stored state, falling back field by field on anything malformed. */
export function parseSplitViewState(raw: string | null): SplitViewState {
  let v: Partial<Record<keyof SplitViewState, unknown>> = {};
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') {
      v = parsed;
    }
  } catch {
    // Corrupt entry: start from the defaults.
  }
  const flag = (value: unknown, fallback: boolean) =>
    typeof value === 'boolean' ? value : fallback;
  return {
    enabled: flag(v.enabled, DEFAULT_SPLIT_VIEW.enabled),
    ratio:
      typeof v.ratio === 'number'
        ? clampRatio(v.ratio)
        : DEFAULT_SPLIT_VIEW.ratio,
    northUp: flag(v.northUp, DEFAULT_SPLIT_VIEW.northUp),
    follow: flag(v.follow, DEFAULT_SPLIT_VIEW.follow),
    zoom: typeof v.zoom === 'number' && Number.isFinite(v.zoom) ? v.zoom : null,
    center: isPosition(v.center) ? [v.center[0], v.center[1]] : null
  };
}

/**
 * The zoom a layer shown from some zoom on is gated by: the closer in of the
 * two charts, as it shows on whichever is zoomed in far enough (each chart
 * applies the layer's minZoom itself). `paneZoom` is null with the second
 * pane closed.
 */
export function gateZoom(mainZoom: number, paneZoom: number | null): number {
  return Math.max(mainZoom, paneZoom ?? 0);
}

/**
 * The zoom of the chart the zoom buttons act on: the second pane's while it
 * is the active one and has reported its zoom, else the main chart's.
 */
export function activeZoom(
  mainZoom: number,
  paneZoom: number | null,
  paneActive: boolean
): number {
  return paneActive ? (paneZoom ?? mainZoom) : mainZoom;
}

/** The part of an OpenLayers map the footprint reads. */
export interface FootprintSource {
  getSize(): number[] | undefined;
  getCoordinateFromPixel(pixel: number[]): Coordinate | null;
}

/**
 * The viewport of `map` as a closed ring of render-space coordinates, rotation
 * included. Null until the map has a size and has rendered.
 */
export function viewFootprint(map: FootprintSource): Coordinate[] | null {
  const size = map.getSize();
  if (!size || !size[0] || !size[1]) {
    return null;
  }
  const [w, h] = size;
  const corners = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h]
  ].map((pixel) => map.getCoordinateFromPixel(pixel));
  if (corners.some((c) => !c)) {
    return null;
  }
  return [...corners, corners[0]];
}
