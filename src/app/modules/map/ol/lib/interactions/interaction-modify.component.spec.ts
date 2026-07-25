import { expect, describe, it } from 'vitest';
import { vertexDeleteCondition } from './interaction-modify.component';

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
});
