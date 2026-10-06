import { PipRect } from './types';

/** A window rectangle in CSS pixels, relative to the viewport. */
export interface PxRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ViewportSize {
  w: number;
  h: number;
}

/** What a pointer gesture changes: the whole window, or one edge / corner. */
export type GestureMode =
  'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export interface GeometryLimits {
  minW: number;
  minH: number;
  /**
   * Height of a collapsed window: the title bar plus the window's top and
   * bottom border. This much must always stay on screen to grab the window.
   */
  barH: number;
}

export const DEFAULT_LIMITS: GeometryLimits = {
  minW: 160,
  minH: 120,
  barH: 34
};

/** Size and place a new window relative to the viewport. */
export const DEFAULT_RECT: PipRect = { x: 0.55, y: 0.12, w: 0.35, h: 0.35 };

/**
 * Apply a pointer delta to the rectangle a gesture started from. Resizing from
 * the north or west edge moves the origin so the opposite edge stays put; a
 * resize that would go below the minimum size stops at it instead of flipping.
 */
export function applyGesture(
  start: PxRect,
  mode: GestureMode,
  dx: number,
  dy: number,
  limits: GeometryLimits = DEFAULT_LIMITS
): PxRect {
  if (mode === 'move') {
    return { ...start, x: start.x + dx, y: start.y + dy };
  }
  let { x, y, w, h } = start;
  if (mode.includes('e')) {
    w = Math.max(limits.minW, start.w + dx);
  }
  if (mode.includes('s')) {
    h = Math.max(limits.minH, start.h + dy);
  }
  if (mode.includes('w')) {
    w = Math.max(limits.minW, start.w - dx);
    x = start.x + start.w - w;
  }
  if (mode.includes('n')) {
    h = Math.max(limits.minH, start.h - dy);
    y = start.y + start.h - h;
  }
  return { x, y, w, h };
}

/** Distance in px within which a moved window snaps to a viewport edge. */
export const SNAP_DISTANCE = 12;

/** Snap a window flush to any viewport edge it is within `threshold` of. */
export function snapToEdges(
  r: PxRect,
  viewport: ViewportSize,
  threshold = SNAP_DISTANCE
): PxRect {
  let { x, y } = r;
  if (Math.abs(x) <= threshold) x = 0;
  else if (Math.abs(viewport.w - (x + r.w)) <= threshold) x = viewport.w - r.w;
  if (Math.abs(y) <= threshold) y = 0;
  else if (Math.abs(viewport.h - (y + r.h)) <= threshold) y = viewport.h - r.h;
  return { ...r, x, y };
}

/**
 * `applyGesture` for a live pointer: resize deltas are limited so the dragged
 * edge stops at the viewport edge (the opposite edge never moves), a move
 * snaps to nearby viewport edges, and the result is clamped with
 * `clampToViewport`.
 */
export function boundedGesture(
  start: PxRect,
  mode: GestureMode,
  dx: number,
  dy: number,
  viewport: ViewportSize,
  limits: GeometryLimits = DEFAULT_LIMITS
): PxRect {
  if (mode !== 'move') {
    if (mode.includes('e')) dx = Math.min(dx, viewport.w - start.x - start.w);
    if (mode.includes('w')) dx = Math.max(dx, -start.x);
    if (mode.includes('s')) dy = Math.min(dy, viewport.h - start.y - start.h);
    if (mode.includes('n')) dy = Math.max(dy, -start.y);
  }
  // A move keeps the height on screen (a collapsed window is only its title
  // bar); only a resize enforces the minimum size.
  const bounds =
    mode === 'move'
      ? { ...limits, minH: Math.min(limits.minH, start.h) }
      : limits;
  const r = clampToViewport(
    applyGesture(start, mode, dx, dy, bounds),
    viewport,
    bounds
  );
  // Snapping only ever moves a clamped window flush to an edge it fits on.
  return mode === 'move' ? snapToEdges(r, viewport) : r;
}

/**
 * Keep a window usable inside the viewport: never larger than the viewport,
 * never smaller than the minimum (unless the viewport itself is smaller), and
 * always with its whole title bar on screen so it can be dragged back.
 */
export function clampToViewport(
  r: PxRect,
  viewport: ViewportSize,
  limits: GeometryLimits = DEFAULT_LIMITS
): PxRect {
  const w = Math.min(Math.max(r.w, limits.minW), viewport.w);
  const h = Math.min(Math.max(r.h, limits.minH), viewport.h);
  const x = Math.min(Math.max(r.x, 0), Math.max(0, viewport.w - w));
  const y = Math.min(
    Math.max(r.y, 0),
    Math.max(0, viewport.h - Math.min(h, limits.barH))
  );
  return { x, y, w, h };
}

export function toFractions(r: PxRect, viewport: ViewportSize): PipRect {
  if (viewport.w <= 0 || viewport.h <= 0) {
    return { ...DEFAULT_RECT };
  }
  return {
    x: r.x / viewport.w,
    y: r.y / viewport.h,
    w: r.w / viewport.w,
    h: r.h / viewport.h
  };
}

export function fromFractions(r: PipRect, viewport: ViewportSize): PxRect {
  return {
    x: r.x * viewport.w,
    y: r.y * viewport.h,
    w: r.w * viewport.w,
    h: r.h * viewport.h
  };
}

/** True when every field is a finite number within the 0..1 range. */
export function isValidRect(r: unknown): r is PipRect {
  if (!r || typeof r !== 'object') return false;
  const o = r as Record<string, unknown>;
  return ['x', 'y', 'w', 'h'].every(
    (k) =>
      typeof o[k] === 'number' &&
      Number.isFinite(o[k]) &&
      (o[k] as number) >= 0 &&
      (o[k] as number) <= 1
  );
}
