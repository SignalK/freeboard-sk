/**
 * Placement of a panel the user can move over the chart (`fbMovablePanel`).
 *
 * A placement is kept relative to the corner of the area nearest the panel, so
 * a panel left by the bottom-right corner stays there when the screen resizes
 * or rotates, and grows or shrinks away from that corner as its content
 * changes.
 */

export type PanelCorner =
  'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/** Distance in px from the corner's two edges to the matching panel edges. */
export interface PanelPlacement {
  corner: PanelCorner;
  x: number;
  y: number;
}

export interface PanelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PanelArea {
  w: number;
  h: number;
}

const CORNERS: readonly PanelCorner[] = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right'
];

/** The placement that reproduces `rect`, anchored to the corner nearest its centre. */
export function placementFromRect(
  rect: PanelRect,
  area: PanelArea
): PanelPlacement {
  const right = rect.x + rect.w / 2 > area.w / 2;
  const bottom = rect.y + rect.h / 2 > area.h / 2;
  return {
    corner: `${bottom ? 'bottom' : 'top'}-${right ? 'right' : 'left'}`,
    x: Math.round(right ? area.w - rect.x - rect.w : rect.x),
    y: Math.round(bottom ? area.h - rect.y - rect.h : rect.y)
  };
}

/**
 * Top-left of a panel of `size` at `placement`, clamped so all of it stays in
 * the area (or its top-left corner does, when the panel is bigger than the area).
 */
export function positionFromPlacement(
  placement: PanelPlacement,
  size: PanelArea,
  area: PanelArea
): { x: number; y: number } {
  const right = placement.corner.endsWith('right');
  const bottom = placement.corner.startsWith('bottom');
  return clampPosition(
    {
      x: right ? area.w - size.w - placement.x : placement.x,
      y: bottom ? area.h - size.h - placement.y : placement.y
    },
    size,
    area
  );
}

/** Keep a panel of `size` with its top-left at `pos` inside the area. */
export function clampPosition(
  pos: { x: number; y: number },
  size: PanelArea,
  area: PanelArea
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(pos.x, area.w - size.w)),
    y: Math.max(0, Math.min(pos.y, area.h - size.h))
  };
}

export function isPanelPlacement(p: unknown): p is PanelPlacement {
  if (!p || typeof p !== 'object') {
    return false;
  }
  const { corner, x, y } = p as Record<string, unknown>;
  return (
    CORNERS.includes(corner as PanelCorner) &&
    typeof x === 'number' &&
    Number.isFinite(x) &&
    typeof y === 'number' &&
    Number.isFinite(y)
  );
}

/** The placement saved on this device under `key`, if there is a valid one. */
export function loadPlacement(key: string): PanelPlacement | null {
  try {
    const raw = localStorage.getItem(key);
    const p: unknown = raw ? JSON.parse(raw) : null;
    return isPanelPlacement(p) ? p : null;
  } catch {
    return null;
  }
}

export function savePlacement(key: string, placement: PanelPlacement) {
  try {
    localStorage.setItem(key, JSON.stringify(placement));
  } catch {
    // Storage full or blocked: the panel just won't be remembered.
  }
}
