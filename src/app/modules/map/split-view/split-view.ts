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
  /** Where the second pane was last left; null until the user has moved it. */
  zoom: number | null;
  center: Position | null;
}

export const SPLIT_VIEW_STORAGE_KEY = 'fb-split-view';
export const SPLIT_RATIO_MIN = 0.3;
export const SPLIT_RATIO_MAX = 0.7;

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
 * when the panes are above each other (a portrait screen).
 */
export function ratioFromPointer(
  rect: { left: number; top: number; width: number; height: number },
  x: number,
  y: number,
  stacked: boolean
): number {
  return clampRatio(
    stacked ? (y - rect.top) / rect.height : (x - rect.left) / rect.width
  );
}

const isPosition = (p: unknown): p is Position =>
  Array.isArray(p) &&
  p.length >= 2 &&
  p.slice(0, 2).every((n) => typeof n === 'number' && Number.isFinite(n));

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
