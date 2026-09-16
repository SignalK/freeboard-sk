import { describe, expect, it } from 'vitest';

import { isPanKey } from './pan-keys';

/**
 * The arrow-key pan guard (#725): recognises exactly the keydowns OpenLayers'
 * KeyboardPan will pan on, so the app applies "Map Pan When Following" to a
 * keyboard pan and to nothing else.
 */
describe('isPanKey', () => {
  const ev = (o: Partial<Record<string, unknown>>): KeyboardEvent =>
    ({
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      key: '',
      target: null,
      ...o
    }) as unknown as KeyboardEvent;

  it('recognises the four arrow keys', () => {
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
      expect(isPanKey(ev({ key }))).toBe(true);
    }
  });

  it('ignores any other key', () => {
    expect(isPanKey(ev({ key: '+' }))).toBe(false);
    expect(isPanKey(ev({ key: 'a' }))).toBe(false);
    expect(isPanKey(ev({ key: 'Home' }))).toBe(false);
  });

  it('ignores a modifier chord, Shift included, as KeyboardPan does', () => {
    expect(isPanKey(ev({ key: 'ArrowUp', ctrlKey: true }))).toBe(false);
    expect(isPanKey(ev({ key: 'ArrowDown', metaKey: true }))).toBe(false);
    expect(isPanKey(ev({ key: 'ArrowLeft', altKey: true }))).toBe(false);
    expect(isPanKey(ev({ key: 'ArrowRight', shiftKey: true }))).toBe(false);
  });

  it('is ignored while a text-editing target has focus', () => {
    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) {
      expect(isPanKey(ev({ key: 'ArrowUp', target: { tagName } }))).toBe(false);
    }
    expect(
      isPanKey(ev({ key: 'ArrowUp', target: { isContentEditable: true } }))
    ).toBe(false);
  });
});
