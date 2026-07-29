import { describe, expect, it } from 'vitest';

import { zoomKeyDirection } from './zoom-keys';

/**
 * The +/- keyboard-zoom guard: fires only for the bare +/- keys, never under a
 * platform modifier (the browser's own page zoom should win) and never while a
 * text-editing element has focus.
 */
describe('zoomKeyDirection', () => {
  const ev = (o: Partial<Record<string, unknown>>): KeyboardEvent =>
    ({
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      key: '',
      target: null,
      ...o
    }) as unknown as KeyboardEvent;

  it('maps + to zoom in and - to zoom out', () => {
    expect(zoomKeyDirection(ev({ key: '+' }))).toBe('in');
    expect(zoomKeyDirection(ev({ key: '-' }))).toBe('out');
  });

  it('ignores any other key', () => {
    expect(zoomKeyDirection(ev({ key: '=' }))).toBeNull();
    expect(zoomKeyDirection(ev({ key: 'a' }))).toBeNull();
    expect(zoomKeyDirection(ev({ key: 'ArrowUp' }))).toBeNull();
  });

  it('leaves a platform-modifier chord to the browser', () => {
    expect(zoomKeyDirection(ev({ key: '+', ctrlKey: true }))).toBeNull();
    expect(zoomKeyDirection(ev({ key: '-', metaKey: true }))).toBeNull();
    expect(zoomKeyDirection(ev({ key: '+', altKey: true }))).toBeNull();
  });

  it('is ignored while a text-editing target has focus', () => {
    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) {
      expect(
        zoomKeyDirection(ev({ key: '+', target: { tagName } }))
      ).toBeNull();
    }
    expect(
      zoomKeyDirection(ev({ key: '-', target: { isContentEditable: true } }))
    ).toBeNull();
  });
});
