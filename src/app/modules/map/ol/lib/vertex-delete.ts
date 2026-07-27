import { Map } from 'ol';
import { Modify } from 'ol/interaction';

/**
 * Map property marking that a vertex delete has been performed and the click it
 * produces is still outstanding. The release completing a delete also produces a
 * `singleclick`, which would otherwise be read as a click in open water and
 * extend the route (#608) — the delete has already moved the line away from the
 * clicked pixel, so a hit-test alone cannot tell the two apart.
 *
 * The marker deliberately outlives the gesture that set it: OpenLayers delays
 * `singleclick` by 250 ms (`MapBrowserEventHandler`), so a fast follow-up press
 * begins a new gesture while that click is still pending. It is cleared where
 * the click resolves instead — see `clearVertexDeleted`.
 */
export const VERTEX_DELETED_IN_GESTURE = 'vertexDeletedInGesture';

/** Mark that a vertex delete has been performed (#608). */
export function markVertexDeleted(map: Pick<Map, 'set'>): void {
  map.set(VERTEX_DELETED_IN_GESTURE, true);
}

/**
 * Whether the click being handled is the tail of a vertex delete, and so must
 * not also extend the route.
 */
export function vertexDeleted(map: Pick<Map, 'get'>): boolean {
  return !!map.get(VERTEX_DELETED_IN_GESTURE);
}

/**
 * Release the marker once the click it belongs to has resolved. OpenLayers
 * resolves a gesture as exactly one of `singleclick`, `dblclick` (which cancels
 * the pending `singleclick`) or a drag (a gesture that has dragged emits no
 * click at all), so clearing at those three points retires the marker without
 * ever cutting short a click that is still pending.
 */
export function clearVertexDeleted(map: Pick<Map, 'set'>): void {
  map.set(VERTEX_DELETED_IN_GESTURE, false);
}

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
      markVertexDeleted(map);
    }
  } catch {
    // Fall back to delete-on-release via the deleteCondition flag.
  }
  return true;
}
