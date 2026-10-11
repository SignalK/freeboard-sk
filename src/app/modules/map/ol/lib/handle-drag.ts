import { Map } from 'ol';

/**
 * Map property holding the pointer that is dragging a map handle (such as the
 * Bearing & Distance end point), or `null` when none is.
 *
 * A press on a handle is the start of a drag, never a long-press. On touch the
 * browser fires a native `contextmenu` at the OS long-press timeout (~500 ms),
 * and the map runs its own hold timer, so a finger that rests on the handle
 * for a moment before moving would otherwise open the chart menu on top of the
 * drag. The map component reads this to drop both.
 */
export const HANDLE_DRAG_POINTER = 'handleDragPointer';

/** Record the pointer that grabbed a handle, or `null` when it lets go. */
export function setHandleDrag(
  map: Pick<Map, 'set'>,
  pointerId: number | null
): void {
  map.set(HANDLE_DRAG_POINTER, pointerId);
}

/** Whether a handle is being held, so a long-press must not open the menu. */
export function isHandleDrag(map: Pick<Map, 'get'>): boolean {
  const id = map.get(HANDLE_DRAG_POINTER);
  return id !== null && id !== undefined;
}
