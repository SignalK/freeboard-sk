import { expect, describe, it, vi } from 'vitest';
import { Map } from 'ol';
import { Collection } from 'ol';
import { Modify } from 'ol/interaction';
import {
  clearVertexDeleted,
  markVertexDeleted,
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

// OpenLayers delays `singleclick` by 250 ms, so the click completing a delete
// can arrive after the user has pressed down again. The marker is therefore
// retired only by an explicit clear at the points where a click resolves —
// never as a side effect of a new gesture starting (#608).
describe('vertexDeleted marker', () => {
  it('reads false on a map that has never deleted a vertex', () => {
    expect(vertexDeleted(fakeMap([]))).toBe(false);
  });

  it('stays set until explicitly cleared, outliving the gesture that set it', () => {
    const map = fakeMap([]);
    markVertexDeleted(map);
    expect(vertexDeleted(map)).toBe(true);

    clearVertexDeleted(map);
    expect(vertexDeleted(map)).toBe(false);
  });

  it('is left set by a long-press delete, for the pending click to consume', () => {
    // The delete lands mid-hold, so the release still produces a click — the
    // marker must survive the whole gesture for that click to be suppressed.
    const map = fakeMap([activeModify(true)]);
    tryDeleteHeldVertexOnHold(map as Map, src('mouse'));
    expect(vertexDeleted(map)).toBe(true);
  });
});
