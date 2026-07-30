import { expect, describe, it, vi } from 'vitest';
import { Map } from 'ol';
import { Collection } from 'ol';
import { Modify } from 'ol/interaction';
import {
  clearHeldVertexOnRelease,
  clearVertexDeleted,
  clearVertexDeletedOnDrag,
  isTouchContextMenuWhileEditing,
  markVertexDeleted,
  startPointerGesture,
  tryDeleteHeldVertexOnHold,
  vertexDeleted
} from './vertex-delete';

// Minimal stand-in for the OL map: only the members the helper touches.
function fakeMap(interactions: unknown[]) {
  const props: Record<string, unknown> = {};
  return {
    getInteractions: () => ({ getArray: () => interactions }),
    getViewport: () => document.createElement('div'),
    get: (k: string) => props[k],
    set: (k: string, v: unknown) => {
      props[k] = v;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function activeModify(removePointResult = true): Modify {
  const modify = new Modify({ features: new Collection() });
  vi.spyOn(modify, 'getActive').mockReturnValue(true);
  vi.spyOn(modify, 'removePoint').mockReturnValue(removePointResult);
  return modify;
}

function src(pointerType: string): MouseEvent {
  return {
    clientX: 10,
    clientY: 20,
    pointerType,
    pointerId: 1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('tryDeleteHeldVertexOnHold', () => {
  it('deletes the grabbed vertex on a long MOUSE hold — #578 parity with touch', () => {
    const modify = activeModify();
    const map = fakeMap([modify]);

    expect(tryDeleteHeldVertexOnHold(map as Map, src('mouse'))).toBe(true);
    expect(modify.removePoint).toHaveBeenCalled();
  });

  it('still deletes on a long touch hold', () => {
    const modify = activeModify();
    const map = fakeMap([modify]);

    expect(tryDeleteHeldVertexOnHold(map as Map, src('touch'))).toBe(true);
    expect(modify.removePoint).toHaveBeenCalled();
  });

  it('clears vertexDeleteOnRelease once the vertex is removed', () => {
    const map = fakeMap([activeModify(true)]);
    tryDeleteHeldVertexOnHold(map as Map, src('mouse'));
    expect(map.get('vertexDeleteOnRelease')).toBe(false);
  });

  it('leaves vertexDeleteOnRelease set as a fallback when the immediate remove is refused', () => {
    const map = fakeMap([activeModify(false)]);
    tryDeleteHeldVertexOnHold(map as Map, src('mouse'));
    expect(map.get('vertexDeleteOnRelease')).toBe(true);
  });

  it('does nothing (opens context menu instead) when no Modify is active', () => {
    const map = fakeMap([]);
    expect(tryDeleteHeldVertexOnHold(map as Map, src('mouse'))).toBe(false);
    expect(map.get('vertexDeleteOnRelease')).toBeUndefined();
  });
});

// A touch long-press makes the Android WebView emit a *native* `contextmenu` at
// ~500ms (the OS long-press timeout), a full second before the 1500ms
// vertex-delete hold timer. Left to run, its handler clears that timer and the
// delete never fires. While editing, that native touch contextmenu must be
// ignored so the hold timer survives; every other case keeps working.
describe('isTouchContextMenuWhileEditing', () => {
  it('is true for a native touch contextmenu while a Modify is active', () => {
    const map = fakeMap([activeModify()]);
    expect(
      isTouchContextMenuWhileEditing(map as Map, 'contextmenu', 'touch')
    ).toBe(true);
  });

  it('is false when no Modify is active — the not-editing menu is unchanged', () => {
    const map = fakeMap([]);
    expect(
      isTouchContextMenuWhileEditing(map as Map, 'contextmenu', 'touch')
    ).toBe(false);
  });

  it('is false for a mouse contextmenu — a real right-click still opens the menu', () => {
    const map = fakeMap([activeModify()]);
    expect(
      isTouchContextMenuWhileEditing(map as Map, 'contextmenu', 'mouse')
    ).toBe(false);
  });

  it("is false for touchHold's own pointerdown source, not a native contextmenu", () => {
    const map = fakeMap([activeModify()]);
    expect(
      isTouchContextMenuWhileEditing(map as Map, 'pointerdown', 'touch')
    ).toBe(false);
  });

  it('is false for a contextmenu with no pointer type — the keyboard menu key', () => {
    const map = fakeMap([activeModify()]);
    expect(
      isTouchContextMenuWhileEditing(map as Map, 'contextmenu', undefined)
    ).toBe(false);
  });
});

// #643: OL retires the grabbed-vertex dot only from a pointermove that lands
// clear of the line. Touch emits none once the finger lifts, so the dot stayed
// lit on a vertex nothing was holding, reading as a selection that could not be
// dismissed. Re-arming the interaction is what drops it (OL clears the dot in
// `setActive(false)`), so that toggle is the observable contract here.
describe('clearHeldVertexOnRelease', () => {
  function releaseOn(map: Map, pointerType: string) {
    clearHeldVertexOnRelease(map, { pointerType } as PointerEvent);
  }

  it('drops the dot when a touch gesture ends', () => {
    const modify = activeModify();
    const setActive = vi.spyOn(modify, 'setActive');
    const map = fakeMap([modify]);

    releaseOn(map as Map, 'touch');
    expect(setActive.mock.calls.map(([a]) => a)).toEqual([false, true]);
  });

  it('leaves a mouse release alone — moving the cursor away clears it', () => {
    const modify = activeModify();
    const setActive = vi.spyOn(modify, 'setActive');

    releaseOn(fakeMap([modify]) as Map, 'mouse');
    expect(setActive).not.toHaveBeenCalled();
  });

  it('leaves the dot when this release still has a vertex to delete', () => {
    // A tap-hold whose immediate remove was refused deletes via deleteCondition
    // on this release, which needs the dot — and this runs first.
    const modify = activeModify();
    const setActive = vi.spyOn(modify, 'setActive');
    const map = fakeMap([modify]);
    map.set('vertexDeleteOnRelease', true);

    releaseOn(map as Map, 'touch');
    expect(setActive).not.toHaveBeenCalled();
  });

  it('does nothing when no Modify is active', () => {
    expect(() => releaseOn(fakeMap([]) as Map, 'touch')).not.toThrow();
  });
});

// OpenLayers delays `singleclick` by 250 ms, so the click completing a delete
// can arrive after the user has pressed down again. The marker is therefore
// retired only where that click resolves — never as a side effect of a new
// gesture starting (#608).
describe('vertexDeleted marker', () => {
  it('reads false on a map that has never deleted a vertex', () => {
    expect(vertexDeleted(fakeMap([]))).toBe(false);
  });

  it('stays set until explicitly cleared, outliving the gesture that set it', () => {
    const map = fakeMap([]);
    startPointerGesture(map);
    markVertexDeleted(map);
    expect(vertexDeleted(map)).toBe(true);

    // A fast follow-up press begins a new gesture while the delete's click is
    // still pending — the marker must survive it.
    startPointerGesture(map);
    expect(vertexDeleted(map)).toBe(true);

    clearVertexDeleted(map); // the pending singleclick finally lands
    expect(vertexDeleted(map)).toBe(false);
  });

  it('is left set by a long-press delete, for the pending click to consume', () => {
    // The delete lands mid-hold, so the release still produces a click — the
    // marker must survive the whole gesture for that click to be suppressed.
    const map = fakeMap([activeModify(true)]);
    startPointerGesture(map);
    tryDeleteHeldVertexOnHold(map as Map, src('mouse'));
    expect(vertexDeleted(map)).toBe(true);
  });

  it('is retired when the deleting gesture itself drags (no click will come)', () => {
    const map = fakeMap([]);
    startPointerGesture(map);
    markVertexDeleted(map);

    clearVertexDeletedOnDrag(map);
    expect(vertexDeleted(map)).toBe(false);
  });

  it('survives a LATER gesture dragging while the delete click is pending', () => {
    // Delete a vertex, then immediately pan the chart. That drag belongs to a
    // new gesture; retiring the marker there would let the still-pending
    // singleclick from the delete append an end point.
    const map = fakeMap([]);
    startPointerGesture(map);
    markVertexDeleted(map);

    startPointerGesture(map); // the pan begins
    clearVertexDeletedOnDrag(map);
    expect(vertexDeleted(map)).toBe(true);
  });
});
