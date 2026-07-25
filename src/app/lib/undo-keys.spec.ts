import { describe, expect, it } from 'vitest';

import { isUndoKeyEvent } from './undo-keys';

/**
 * The Ctrl-Z / Cmd-Z guard for route-editing undo (#542): fires only for the
 * undo chord, and never when a text-editing element has focus (the browser's
 * own undo should win there).
 */
describe('isUndoKeyEvent', () => {
  const ev = (o: Partial<Record<string, unknown>>): KeyboardEvent =>
    ({
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      key: 'z',
      target: null,
      ...o
    }) as unknown as KeyboardEvent;

  it('matches Ctrl-Z and Cmd-Z', () => {
    expect(isUndoKeyEvent(ev({ ctrlKey: true }))).toBe(true);
    expect(isUndoKeyEvent(ev({ metaKey: true }))).toBe(true);
  });

  it('still matches with CapsLock on (uppercase key)', () => {
    expect(isUndoKeyEvent(ev({ ctrlKey: true, key: 'Z' }))).toBe(true);
  });

  it('ignores the redo chord (Shift) and plain z', () => {
    expect(isUndoKeyEvent(ev({ ctrlKey: true, shiftKey: true }))).toBe(false);
    expect(isUndoKeyEvent(ev({ key: 'z' }))).toBe(false);
    expect(isUndoKeyEvent(ev({ ctrlKey: true, key: 'a' }))).toBe(false);
  });

  it('is ignored while a text-editing target has focus', () => {
    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) {
      expect(isUndoKeyEvent(ev({ ctrlKey: true, target: { tagName } }))).toBe(
        false
      );
    }
    expect(
      isUndoKeyEvent(ev({ ctrlKey: true, target: { isContentEditable: true } }))
    ).toBe(false);
  });
});
