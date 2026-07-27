import { Map } from 'ol';
import { Modify } from 'ol/interaction';

/**
 * Map property holding a monotonic id for the pointer gesture in progress.
 *
 * Gestures need identity because a delete marker can outlive the gesture that
 * set it (see `VERTEX_DELETED_IN_GESTURE`): without an id, a *later* gesture's
 * drag would retire a marker whose click is still pending, and that click would
 * then extend the route. OpenLayers offers nothing usable here — `down_`, the
 * clone its click events carry, does not exist yet when a long-press sets the
 * marker mid-gesture, and it is a fresh `PointerEvent`, so a tag put on the DOM
 * `pointerdown` never reaches it.
 */
export const POINTER_GESTURE_SEQ = 'pointerGestureSeq';

/**
 * Map property naming the gesture whose vertex delete is still awaiting its
 * click, or `null` when none is outstanding. The release completing a delete
 * also produces a `singleclick`, which would otherwise be read as a click in
 * open water and extend the route (#608) — the delete has already moved the
 * line away from the clicked pixel, so a hit-test alone cannot tell the two
 * apart.
 *
 * The marker deliberately outlives the gesture that set it: OpenLayers delays
 * `singleclick` by 250 ms (`MapBrowserEventHandler`), so a fast follow-up press
 * begins a new gesture while that click is still pending. It is retired where
 * the click resolves instead — see `clearVertexDeleted`. It records *which*
 * gesture deleted rather than a bare flag so a later gesture cannot retire a
 * marker that is not its own.
 */
export const VERTEX_DELETED_IN_GESTURE = 'vertexDeletedInGesture';

/** Open a new pointer gesture, called from the `pointerdown` handler. */
export function startPointerGesture(map: Pick<Map, 'get' | 'set'>): void {
  map.set(POINTER_GESTURE_SEQ, gestureSeq(map) + 1);
}

function gestureSeq(map: Pick<Map, 'get'>): number {
  return (map.get(POINTER_GESTURE_SEQ) as number) ?? 0;
}

/** Mark that the current gesture has deleted a vertex (#608). */
export function markVertexDeleted(map: Pick<Map, 'get' | 'set'>): void {
  map.set(VERTEX_DELETED_IN_GESTURE, gestureSeq(map));
}

/**
 * Whether the click being handled is the tail of a vertex delete, and so must
 * not also extend the route.
 */
export function vertexDeleted(map: Pick<Map, 'get'>): boolean {
  return map.get(VERTEX_DELETED_IN_GESTURE) != null;
}

/**
 * Retire the marker once the click it belongs to has resolved — at `singleclick`
 * (after consumers have read it) and at `dblclick` (which cancels the pending
 * `singleclick`, so no click is coming).
 */
export function clearVertexDeleted(map: Pick<Map, 'set'>): void {
  map.set(VERTEX_DELETED_IN_GESTURE, null);
}

/**
 * Retire the marker when the gesture that set it starts dragging: a gesture that
 * has dragged emits no click at all, so nothing is left to consume the marker
 * and it would otherwise go stale.
 *
 * Only that gesture's own drag counts. A *later* gesture may begin dragging
 * while the delete's `singleclick` is still pending (delete a vertex, then
 * immediately pan the chart), and retiring the marker there would let that
 * pending click extend the route — the very bug this guards against.
 */
export function clearVertexDeletedOnDrag(map: Pick<Map, 'get' | 'set'>): void {
  if (map.get(VERTEX_DELETED_IN_GESTURE) === gestureSeq(map)) {
    clearVertexDeleted(map);
  }
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
