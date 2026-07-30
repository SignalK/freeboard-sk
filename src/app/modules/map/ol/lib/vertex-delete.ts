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

/** The Modify interaction currently editing, if any. */
function activeModify(map: Map): Modify | undefined {
  return map
    .getInteractions()
    .getArray()
    .find((i) => i instanceof Modify && i.getActive()) as Modify | undefined;
}

/**
 * Whether a `contextmenu` is the touch long-press artifact that must be ignored
 * for the vertex-delete hold to survive.
 *
 * A finger long-press on the map makes the browser/WebView emit a **native**
 * `contextmenu` at the OS long-press timeout (~500 ms) — a full second before the
 * 1500 ms vertex-delete hold timer. Handled normally it clears that timer, so the
 * delete never fires and the grabbed vertex is only ever dragged. While a route is
 * being edited that native touch event is redundant with the hold timer and must
 * be dropped. A mouse right-click (a deliberate action) and a touch long-press
 * when not editing (opens the chart menu) both stay as they were.
 *
 * `eventType` separates the native DOM `contextmenu` from the synthetic
 * pointer-down source that `touchHold` replays into this same handler.
 */
export function isTouchContextMenuWhileEditing(
  map: Map,
  eventType: string,
  pointerType: string | undefined
): boolean {
  return (
    eventType === 'contextmenu' &&
    pointerType === 'touch' &&
    !!activeModify(map)
  );
}

/**
 * Drop the "grabbed vertex" dot when a touch gesture ends (#643).
 *
 * OpenLayers retires that dot only from a `pointermove` landing clear of the
 * line, so a mouse drops it the moment the cursor moves away. Touch emits no
 * move after the finger lifts, leaving the dot lit on a vertex nothing is
 * holding — and it reads as a selection the user cannot dismiss, because the tap
 * that would clear it on a desktop instead extends the route (#549).
 *
 * `setActive(false)` is OL's own documented way to drop the dot; re-arming
 * immediately keeps the interaction ready for the next gesture, and the release
 * still reaches `handleUpEvent`, so an edit this gesture made is unaffected.
 */
export function clearHeldVertexOnRelease(map: Map, src: PointerEvent): void {
  if (src.pointerType !== 'touch') {
    return;
  }
  const modify = activeModify(map);
  if (!modify) {
    return;
  }
  modify.setActive(false);
  modify.setActive(true);
}

/**
 * On a long press during route editing, remove the grabbed vertex immediately —
 * mid-hold, while the pointer is still down, the way touch plotters work.
 *
 * Runs for **any** pointer — a long left-click gives mouse users parity with the
 * touch/pen tap-hold (alongside Ctrl-Click). A press that is really the start of a
 * drag cannot reach here: the Modify hold timer is 1500 ms and `clearTimerIfMoved`
 * disarms it once the pointer moves past its tolerance.
 *
 * `removePoint()` refuses when the interaction's last event was a POINTERDRAG, and
 * a finger always jitters past OpenLayers' 1 px move tolerance during the hold,
 * latching `MapBrowserEventHandler.dragging_` (which `isMoving_` short-circuits
 * on) for the rest of the gesture. Clearing the interaction's `lastPointerEvent_`
 * lets `removePoint()` run — it removes the grabbed vertex from `dragSegments_`
 * and carries the (now null) event only into its MODIFYSTART/MODIFYEND events,
 * which no consumer reads. `vertex-delete.spec` asserts the field still exists so
 * an OpenLayers rename fails the suite rather than silently disabling the delete.
 *
 * Returns `true` when a Modify interaction was active (delete attempted, so the
 * caller should not also open the context menu), `false` when there was none.
 */
export function tryDeleteHeldVertexOnHold(map: Map): boolean {
  const modify = activeModify(map);
  if (!modify) {
    return false;
  }
  (modify as unknown as { lastPointerEvent_: unknown }).lastPointerEvent_ =
    null;
  if (modify.removePoint()) {
    markVertexDeleted(map);
  }
  return true;
}
