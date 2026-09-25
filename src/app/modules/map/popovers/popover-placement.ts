/** Map popover placement (#827) **
 **********************************/

/** Which side of its anchor a map popover opens on. */
export type PopoverPlacement = 'top' | 'bottom';

/** Space between the anchor and the popover box (the `.popover` margin). */
export const POPOVER_ANCHOR_GAP = 10;

/**
 * Viewport measurements, in client pixels, needed to place a popover.
 * `height` is the popover's natural (uncapped) height; `top` / `bottom` bound
 * the visible map area.
 */
export interface PopoverMetrics {
  anchorY: number;
  height: number;
  top: number;
  bottom: number;
}

/** Where to open a popover, and the height to cap it at to stay on screen. */
export interface PopoverLayout {
  placement: PopoverPlacement;
  maxHeight?: number;
}

/**
 * Choose whether a popover opens above or below its anchor.
 *
 * Above is the default and is kept whenever the popover fits there. Otherwise
 * it opens below if it fits. When it fits neither way (a tall popover on a
 * short screen, e.g. a phone in landscape), it opens on the side with more
 * room and is capped to that room, so the whole popover, title bar and close
 * button included, stays on screen and its content scrolls.
 */
export function choosePopoverPlacement(
  m: PopoverMetrics,
  gap = POPOVER_ANCHOR_GAP
): PopoverLayout {
  const above = m.anchorY - m.top;
  const below = m.bottom - m.anchorY;
  if (above >= m.height + gap) {
    return { placement: 'top' };
  }
  if (below >= m.height + gap) {
    return { placement: 'bottom' };
  }
  return below > above
    ? { placement: 'bottom', maxHeight: Math.max(below - gap, 0) }
    : { placement: 'top', maxHeight: Math.max(above - gap, 0) };
}
