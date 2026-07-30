import { expect, describe, it } from 'vitest';
import { Collection } from 'ol';
import {
  PointerAwareModify,
  vertexDeleteCondition
} from './interaction-modify.component';
import { vertexDeleted } from '../vertex-delete';

// Minimal stand-in for the OL map: only get/set of the delete-on-release flag
// are read by the condition.
function fakeMap(vertexDeleteOnRelease = false) {
  const store: Record<string, unknown> = { vertexDeleteOnRelease };
  return {
    get: (k: string) => store[k],
    set: (k: string, v: unknown) => {
      store[k] = v;
    }
  };
}

// Build a MapBrowserEvent-shaped object with only the fields the condition reads.
function ev(
  type: string,
  opts: { ctrlKey?: boolean; map?: ReturnType<typeof fakeMap> } = {}
) {
  return {
    type,
    originalEvent: { ctrlKey: opts.ctrlKey ?? false },
    map: opts.map ?? fakeMap()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('vertexDeleteCondition', () => {
  it('does NOT delete on a right-click (contextmenu) — regression for #575', () => {
    // A right-click never re-snaps the grabbed vertex, so treating it as a delete
    // removed the last-touched vertex instead of the clicked one.
    expect(vertexDeleteCondition(ev('contextmenu'))).toBe(false);
  });

  it('deletes on Ctrl-Click (mouse gesture)', () => {
    expect(vertexDeleteCondition(ev('click', { ctrlKey: true }))).toBe(true);
  });

  it('does not delete on a plain left click', () => {
    expect(vertexDeleteCondition(ev('click', { ctrlKey: false }))).toBe(false);
  });

  it('deletes on release when tap-hold flagged vertexDeleteOnRelease, and clears the flag', () => {
    const map = fakeMap(true);
    expect(vertexDeleteCondition(ev('pointerup', { map }))).toBe(true);
    expect(map.get('vertexDeleteOnRelease')).toBe(false);
  });

  it('does not delete on release when the tap-hold flag is not set', () => {
    expect(
      vertexDeleteCondition(ev('pointerup', { map: fakeMap(false) }))
    ).toBe(false);
  });

  // #608: the release that deletes also produces a click, which the route
  // extend handler would read as open water once the line has snapped away.
  it('flags vertexDeletedInGesture when a tap-hold release deletes', () => {
    const map = fakeMap(true);
    vertexDeleteCondition(ev('pointerup', { map }));
    expect(vertexDeleted(map)).toBe(true);
  });

  it('flags vertexDeletedInGesture when Ctrl-Click deletes', () => {
    const map = fakeMap();
    vertexDeleteCondition(ev('click', { ctrlKey: true, map }));
    expect(vertexDeleted(map)).toBe(true);
  });

  it('leaves vertexDeletedInGesture unset when nothing is deleted', () => {
    const map = fakeMap(false);
    vertexDeleteCondition(ev('click', { map }));
    expect(vertexDeleted(map)).toBe(false);
  });
});

// #643: a fingertip lands further from a vertex than OL's 10px default allows,
// so the press grabbed the segment and inserted a point instead of the vertex.
// Whether a given press *snaps* can only be observed against a rendered map, so
// these assert the tolerance the interaction will apply — including that the
// field OL keeps it in still exists, which is what makes the switch work at all.
describe('PointerAwareModify vertex tolerance', () => {
  const toleranceOf = (m: PointerAwareModify) =>
    (m as unknown as { pixelTolerance_: number }).pixelTolerance_;

  function modify() {
    return new PointerAwareModify({
      features: new Collection(),
      pixelTolerance: 10
    });
  }

  // Interacting view => OL skips the hover re-snap, keeping the event harmless.
  function pointerEv(pointerType?: string) {
    return {
      type: 'pointerdown',
      originalEvent: pointerType ? { pointerType } : {},
      map: { getView: () => ({ getInteracting: () => true }) }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  it('stores the constructed tolerance where OL can read it', () => {
    // Canary: an OL upgrade that renames the field would otherwise leave every
    // pointer silently stuck on the mouse radius.
    expect(toleranceOf(modify())).toBe(10);
  });

  it('widens the tolerance to the touch radius for a touch pointer', () => {
    const m = modify();
    m.handleEvent(pointerEv('touch'));
    expect(toleranceOf(m)).toBe(15);
  });

  it('keeps the mouse radius for a mouse pointer', () => {
    const m = modify();
    m.handleEvent(pointerEv('mouse'));
    expect(toleranceOf(m)).toBe(10);
  });

  it('leaves the tolerance alone for an event carrying no pointer type', () => {
    // A wheel or key event mid-gesture must not reset a touch gesture's radius.
    const m = modify();
    m.handleEvent(pointerEv('touch'));
    m.handleEvent(pointerEv());
    expect(toleranceOf(m)).toBe(15);
  });
});
