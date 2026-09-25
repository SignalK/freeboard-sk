/** Map popover placement (#827) **
 **********************************/

/** Which side of its anchor a map popover opens on. */
export type PopoverPlacement = 'top' | 'bottom';

/** Space between the anchor and the popover box (the `.popover` margin). */
export const POPOVER_ANCHOR_GAP = 10;

/**
 * Viewport measurements, in client pixels, needed to place a popover.
 * `top` / `bottom` bound the visible map area.
 */
export interface PopoverMetrics {
  anchorY: number;
  height: number;
  titleHeight: number;
  top: number;
  bottom: number;
}

/**
 * Choose whether a popover opens above or below its anchor.
 *
 * Above is the default and is kept whenever the popover fits there. Otherwise
 * it opens below if it fits. When it fits neither way (a tall popover on a
 * short screen, e.g. a phone in landscape), it opens below as long as its
 * title bar fits there: that keeps the close button on screen, which opening
 * above never can once the top is cut off.
 */
export function choosePopoverPlacement(
  m: PopoverMetrics,
  gap = POPOVER_ANCHOR_GAP
): PopoverPlacement {
  const above = m.anchorY - m.top;
  const below = m.bottom - m.anchorY;
  if (above >= m.height + gap) {
    return 'top';
  }
  if (below >= m.height + gap) {
    return 'bottom';
  }
  return below >= m.titleHeight + gap ? 'bottom' : 'top';
}
