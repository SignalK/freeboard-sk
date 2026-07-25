import { Map } from 'ol';
import { Modify } from 'ol/interaction';

/**
 * On a long press during route editing, remove the grabbed vertex.
 *
 * Runs for **any** pointer — a long left-click gives mouse users parity with the
 * touch/pen tap-hold (alongside Ctrl-Click). A press that is really the start of a
 * drag cannot reach here: the Modify hold timer is 1500 ms and `clearTimerIfMoved`
 * disarms it once the pointer moves past its tolerance.
 *
 * Returns `true` when a Modify interaction was active (delete attempted, so the
 * caller should not also open the context menu), `false` when there was none.
 */
export function tryDeleteHeldVertexOnHold(map: Map, src: MouseEvent): boolean {
  const modify = map
    .getInteractions()
    .getArray()
    .find((i) => i instanceof Modify && i.getActive()) as Modify | undefined;
  if (!modify) {
    return false;
  }
  // Flag a delete-on-release as the reliable fallback, then try to remove the
  // grabbed vertex immediately (mid-hold, the way touch plotters work).
  // removePoint() refuses if the last event was a drag, so replay a pointermove at
  // the press point to clear that state first.
  map.set('vertexDeleteOnRelease', true);
  try {
    map.getViewport().dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: src.clientX,
        clientY: src.clientY,
        bubbles: true,
        cancelable: true,
        pointerId: (src as PointerEvent).pointerId ?? 1,
        pointerType: (src as PointerEvent).pointerType ?? 'touch'
      })
    );
    if (modify.removePoint()) {
      map.set('vertexDeleteOnRelease', false);
    }
  } catch {
    // Fall back to delete-on-release via the deleteCondition flag.
  }
  return true;
}
