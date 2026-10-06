import type {
  WindowAnchor,
  WindowGeometry,
  WindowLength
} from 'signalk-plotterext-bus/host';

/** A window rectangle in CSS pixels, relative to the window area. */
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

/** Where a window opens when the extension asks for no geometry. */
export const DEFAULT_GEOMETRY: WindowGeometry = {
  anchor: 'top-right',
  offset: { x: 16, y: 16 },
  width: '35%',
  height: '35%'
};

/** A modal window with no geometry: centred, half the area. */
export const MODAL_GEOMETRY: WindowGeometry = {
  anchor: 'center',
  width: '50%',
  height: '50%'
};

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

export const WINDOW_ANCHORS: readonly WindowAnchor[] = [
  'top-left',
  'top-center',
  'top-right',
  'center-left',
  'center',
  'center-right',
  'bottom-left',
  'bottom-center',
  'bottom-right'
];

type Side = 'start' | 'center' | 'end';

/** The anchor as a [vertical, horizontal] pair of sides. */
function anchorSides(anchor: WindowAnchor): [Side, Side] {
  if (anchor === 'center') return ['center', 'center'];
  const [v, h] = anchor.split('-');
  const side = (t: string): Side =>
    t === 'top' || t === 'left' ? 'start' : t === 'center' ? 'center' : 'end';
  return [side(v), side(h)];
}

const PERCENT = /^(-?\d+(?:\.\d+)?)%$/;

/** True for a CSS-pixel number or a percentage string such as "40%". */
export function isWindowLength(
  v: unknown,
  allowNegative = false
): v is WindowLength {
  const n =
    typeof v === 'number'
      ? v
      : typeof v === 'string' && PERCENT.test(v)
        ? parseFloat(v)
        : NaN;
  return Number.isFinite(n) && (allowNegative || n >= 0);
}

/** A length in pixels: CSS pixels as given, or a percentage of `total`. */
export function lengthPx(
  v: WindowLength | undefined,
  total: number
): number | undefined {
  if (v === undefined) return undefined;
  return typeof v === 'number' ? v : (parseFloat(v) / 100) * total;
}

/**
 * A structurally valid geometry request: a known anchor, and lengths that are
 * numbers or percentage strings (offsets may be negative, sizes may not).
 */
export function isValidGeometry(g: unknown): g is WindowGeometry {
  if (!g || typeof g !== 'object' || Array.isArray(g)) return false;
  const o = g as Record<string, unknown>;
  if (
    o.anchor !== undefined &&
    !WINDOW_ANCHORS.includes(o.anchor as WindowAnchor)
  ) {
    return false;
  }
  for (const k of [
    'width',
    'height',
    'minWidth',
    'minHeight',
    'maxWidth',
    'maxHeight'
  ]) {
    if (o[k] !== undefined && !isWindowLength(o[k])) return false;
  }
  if (o.offset !== undefined) {
    if (!o.offset || typeof o.offset !== 'object') return false;
    const off = o.offset as Record<string, unknown>;
    for (const k of ['x', 'y']) {
      if (off[k] !== undefined && !isWindowLength(off[k], true)) return false;
    }
  }
  return true;
}

/**
 * Resolve a geometry request against the window area: sizes clamped to the
 * request's min/max and the host's minimum, the window placed by its anchor
 * and inward offset, and the result kept usable inside the area.
 */
export function resolveGeometry(
  g: WindowGeometry,
  area: ViewportSize,
  limits: GeometryLimits = DEFAULT_LIMITS
): PxRect {
  const size = (
    v: WindowLength | undefined,
    min: WindowLength | undefined,
    max: WindowLength | undefined,
    hostMin: number,
    total: number,
    fallback: number
  ) => {
    const lo = Math.max(hostMin, lengthPx(min, total) ?? 0);
    const hi = Math.min(total, lengthPx(max, total) ?? Infinity);
    return Math.min(Math.max(lengthPx(v, total) ?? fallback * total, lo), hi);
  };
  const w = size(g.width, g.minWidth, g.maxWidth, limits.minW, area.w, 0.35);
  const h = size(g.height, g.minHeight, g.maxHeight, limits.minH, area.h, 0.35);
  const [v, hz] = anchorSides(g.anchor ?? 'top-right');
  const place = (side: Side, len: number, total: number, off: number) =>
    side === 'start'
      ? off
      : side === 'end'
        ? total - len - off
        : (total - len) / 2 + off;
  const x = place(hz, w, area.w, lengthPx(g.offset?.x, area.w) ?? 0);
  const y = place(v, h, area.h, lengthPx(g.offset?.y, area.h) ?? 0);
  return clampToViewport({ x, y, w, h }, area, limits);
}

/**
 * The geometry that reproduces a window the user just moved or resized:
 * anchored to the nearest edges (by which third of the area its centre is in)
 * with pixel offsets and size, so it keeps its place when the area changes.
 * The request's min/max limits carry over.
 */
export function anchoredGeometry(
  r: PxRect,
  area: ViewportSize,
  previous: WindowGeometry = {}
): WindowGeometry {
  const pick = (start: number, len: number, total: number): Side => {
    const c = start + len / 2;
    return c < total / 3 ? 'start' : c > (2 * total) / 3 ? 'end' : 'center';
  };
  const hz = pick(r.x, r.w, area.w);
  const v = pick(r.y, r.h, area.h);
  const offset = (side: Side, start: number, len: number, total: number) =>
    Math.round(
      side === 'start'
        ? start
        : side === 'end'
          ? total - start - len
          : start - (total - len) / 2
    );
  const name = (s: Side, a: 'top' | 'left', b: 'bottom' | 'right') =>
    s === 'start' ? a : s === 'end' ? b : 'center';
  const vn = name(v, 'top', 'bottom');
  const hn = name(hz, 'left', 'right');
  const anchor = (
    vn === 'center' && hn === 'center' ? 'center' : `${vn}-${hn}`
  ) as WindowAnchor;
  const { minWidth, minHeight, maxWidth, maxHeight } = previous;
  return {
    anchor,
    offset: { x: offset(hz, r.x, r.w, area.w), y: offset(v, r.y, r.h, area.h) },
    width: Math.round(r.w),
    height: Math.round(r.h),
    ...(minWidth !== undefined ? { minWidth } : {}),
    ...(minHeight !== undefined ? { minHeight } : {}),
    ...(maxWidth !== undefined ? { maxWidth } : {}),
    ...(maxHeight !== undefined ? { maxHeight } : {})
  };
}
