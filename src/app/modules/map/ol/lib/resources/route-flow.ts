/**
 * Direction-of-travel decoration for route lines: a thin guide line either
 * side of the route and chevrons pointing along it, all laid out in screen
 * pixels so they stay equally dense at every zoom level.
 */

import type { RouteStyle } from 'src/app/types';

/** Whether a route style draws the direction chevrons. */
export function drawsFlow(style: RouteStyle): boolean {
  return style === 'chevrons' || style === 'chevrons-static';
}

/** Screen-space sizes, in CSS pixels. */
export const ROUTE_FLOW = {
  /** Distance between chevrons along the line. */
  spacing: 70,
  /** Distance of each guide line from the route line. */
  sideOffset: 8,
  /** Half the width of a chevron, across the line. */
  chevronHalfWidth: 6,
  /** Length of a chevron, along the line. */
  chevronLength: 6,
  /** Time for the chevrons to move one spacing when animated. */
  periodMs: 2000
};

/** A chevron: position and the direction of travel, both in canvas pixels. */
export interface FlowMark {
  x: number;
  y: number;
  /** Unit vector along the line, in the direction of travel. */
  dx: number;
  dy: number;
}

/** A canvas-pixel rectangle `[minX, minY, maxX, maxY]`. */
export type PixelBounds = [number, number, number, number];

/** Above this a frame carries more chevrons than anyone can follow. */
const MAX_MARKS = 2000;
/** Limits how far a guide line juts out at a sharp turn, in offsets. */
const MITER_LIMIT = 3;

/**
 * The part `[t0, t1]` (0..1) of segment a→b inside `bounds`, or null when the
 * segment misses it (Liang–Barsky). Lets a zoomed-in route skip the long
 * stretches off screen without walking them a spacing at a time.
 */
export function clipSegment(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  bounds: PixelBounds
): [number, number] | null {
  const dx = bx - ax;
  const dy = by - ay;
  let t0 = 0;
  let t1 = 1;
  const edges: [number, number][] = [
    [-dx, ax - bounds[0]],
    [dx, bounds[2] - ax],
    [-dy, ay - bounds[1]],
    [dy, bounds[3] - ay]
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return null;
    } else {
      const r = q / p;
      if (p < 0) {
        if (r > t1) return null;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return null;
        if (r < t1) t1 = r;
      }
    }
  }
  return [t0, t1];
}

/**
 * Chevron positions every `spacing` pixels along the polyline, the first at
 * `phase * spacing` from its start. Distance is measured along the whole line,
 * so a growing phase moves every chevron forward smoothly across the turns.
 * A line shorter than one spacing gets a single chevron at its middle, so
 * even a short route always shows its direction. Only chevrons inside
 * `bounds` are returned.
 */
export function flowMarks(
  coords: number[][],
  spacing: number,
  phase: number,
  bounds: PixelBounds
): FlowMark[] {
  const marks: FlowMark[] = [];
  if (spacing <= 0) return marks;
  const total = lineLength(coords);
  if (total === 0) return marks;
  if (total < spacing) {
    const mid = pointAlong(coords, total / 2);
    const [minX, minY, maxX, maxY] = bounds;
    if (mid.x >= minX && mid.x <= maxX && mid.y >= minY && mid.y <= maxY) {
      marks.push(mid);
    }
    return marks;
  }
  // along-line distance of the next chevron, relative to the segment start
  let next = (((phase % 1) + 1) % 1) * spacing;
  for (let i = 0; i < coords.length - 1; i++) {
    const [ax, ay] = coords[i];
    const [bx, by] = coords[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    if (len === 0) continue;
    const clip = clipSegment(ax, ay, bx, by, bounds);
    if (clip) {
      const ux = (bx - ax) / len;
      const uy = (by - ay) / len;
      const enter = clip[0] * len;
      if (next < enter) {
        next += Math.ceil((enter - next) / spacing) * spacing;
      }
      const leave = clip[1] * len;
      for (; next < leave; next += spacing) {
        marks.push({ x: ax + ux * next, y: ay + uy * next, dx: ux, dy: uy });
        if (marks.length >= MAX_MARKS) return marks;
      }
    }
    if (next < len) {
      next += Math.ceil((len - next) / spacing) * spacing;
    }
    next -= len;
  }
  return marks;
}

function lineLength(coords: number[][]): number {
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += Math.hypot(
      coords[i + 1][0] - coords[i][0],
      coords[i + 1][1] - coords[i][1]
    );
  }
  return total;
}

/** The point `distance` along a polyline of non-zero length. */
function pointAlong(coords: number[][], distance: number): FlowMark {
  let left = distance;
  let last: FlowMark | undefined;
  for (let i = 0; i < coords.length - 1; i++) {
    const [ax, ay] = coords[i];
    const [bx, by] = coords[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    if (len === 0) continue;
    const dx = (bx - ax) / len;
    const dy = (by - ay) / len;
    const t = Math.min(left, len);
    last = { x: ax + dx * t, y: ay + dy * t, dx, dy };
    if (left <= len) break;
    left -= len;
  }
  return last as FlowMark;
}

/**
 * The polyline moved `offset` pixels sideways (positive to the right of the
 * direction of travel on a y-down canvas), with mitred joins clamped at sharp
 * turns.
 */
export function offsetLine(coords: number[][], offset: number): number[][] {
  // drop repeated points: they have no direction to offset along
  const pts = coords.filter(
    (c, i) => i === 0 || c[0] !== coords[i - 1][0] || c[1] !== coords[i - 1][1]
  );
  if (pts.length < 2) return [];
  const normals = pts.slice(1).map((b, i) => {
    const a = pts[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
  });
  return pts.map((p, i) => {
    const n0 = normals[Math.max(0, i - 1)];
    const n1 = normals[Math.min(normals.length - 1, i)];
    let mx = n0[0] + n1[0];
    let my = n0[1] + n1[1];
    const mlen = Math.hypot(mx, my);
    if (mlen === 0) {
      // the line doubles back on itself
      mx = n1[0];
      my = n1[1];
    } else {
      mx /= mlen;
      my /= mlen;
    }
    const cos = mx * n1[0] + my * n1[1];
    const scale = Math.min(1 / Math.max(cos, 1e-6), MITER_LIMIT);
    return [p[0] + mx * offset * scale, p[1] + my * offset * scale];
  });
}

/** How a route's direction decoration is drawn. */
export interface RouteFlowStyle {
  color: string;
  /** Draw from the last point to the first. */
  reverse: boolean;
  /** 0..1, where the chevrons sit within one spacing. */
  phase: number;
}

/** Draw the guide lines and chevrons for one route onto a layer canvas. */
export function drawRouteFlow(
  ctx: CanvasRenderingContext2D,
  pixelCoords: number[][],
  pixelRatio: number,
  style: RouteFlowStyle
) {
  if (pixelCoords.length < 2) return;
  const coords = style.reverse ? [...pixelCoords].reverse() : pixelCoords;
  const s = (v: number) => v * pixelRatio;
  const margin = s(ROUTE_FLOW.spacing);
  const bounds: PixelBounds = [
    -margin,
    -margin,
    ctx.canvas.width + margin,
    ctx.canvas.height + margin
  ];

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.strokeStyle = style.color;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = s(1.5);
  ctx.beginPath();
  for (const side of [-1, 1]) {
    offsetLine(coords, side * s(ROUTE_FLOW.sideOffset)).forEach((p, i) =>
      i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])
    );
  }
  ctx.stroke();

  ctx.globalAlpha = 1;
  const half = s(ROUTE_FLOW.chevronHalfWidth);
  const len = s(ROUTE_FLOW.chevronLength);
  ctx.beginPath();
  for (const m of flowMarks(
    coords,
    s(ROUTE_FLOW.spacing),
    style.phase,
    bounds
  )) {
    // tip ahead of the mark, arms behind it either side of the line
    const tipX = m.x + m.dx * len * 0.5;
    const tipY = m.y + m.dy * len * 0.5;
    const backX = m.x - m.dx * len * 0.5;
    const backY = m.y - m.dy * len * 0.5;
    ctx.moveTo(backX - m.dy * half, backY + m.dx * half);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(backX + m.dy * half, backY - m.dx * half);
  }
  ctx.strokeStyle = 'white';
  ctx.lineWidth = s(5);
  ctx.stroke();
  ctx.strokeStyle = style.color;
  ctx.lineWidth = s(2.5);
  ctx.stroke();
  ctx.restore();
}

/** Where the chevrons sit at time `now` (ms) when animated, else mid-spacing. */
export function flowPhase(animate: boolean, now: number): number {
  return animate ? (now % ROUTE_FLOW.periodMs) / ROUTE_FLOW.periodMs : 0.5;
}
