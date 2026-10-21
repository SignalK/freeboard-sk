import { describe, expect, it } from 'vitest';
import {
  TOOLBAR_ITEM_PITCH,
  ToolbarItem,
  needsAttention,
  sameToolbarItems,
  splitToolbar,
  toolbarSlots
} from './map-toolbar';

const ids = (items: ToolbarItem[]) => items.map((i) => i.id);
const items = (...names: string[]): ToolbarItem[] =>
  names.map((id) => ({ id, tooltip: id }));

describe('toolbarSlots', () => {
  it('counts whole buttons only', () => {
    expect(toolbarSlots(TOOLBAR_ITEM_PITCH * 4)).toBe(4);
    expect(toolbarSlots(TOOLBAR_ITEM_PITCH * 4 - 1)).toBe(3);
    expect(toolbarSlots(0)).toBe(0);
    expect(toolbarSlots(-10)).toBe(0);
  });
});

describe('splitToolbar', () => {
  it('shows every item, with no overflow, when they all fit', () => {
    const split = splitToolbar(items('a', 'b', 'c'), 3);
    expect(ids(split.shown)).toEqual(['a', 'b', 'c']);
    expect(split.overflow).toEqual([]);
    expect(split.overflowed).toBe(false);
  });

  it('shows the first X - 1 items and overflows the rest in order', () => {
    const split = splitToolbar(items('a', 'b', 'c', 'd', 'e'), 3);
    expect(ids(split.shown)).toEqual(['a', 'b']);
    expect(ids(split.overflow)).toEqual(['c', 'd', 'e']);
    expect(split.overflowed).toBe(true);
  });

  it('shows everything when the toolbar is unmeasured', () => {
    const split = splitToolbar(items('a', 'b'), Number.POSITIVE_INFINITY);
    expect(ids(split.shown)).toEqual(['a', 'b']);
    expect(split.overflowed).toBe(false);
  });

  it('overflows every item when only the overflow button fits', () => {
    expect(ids(splitToolbar(items('a', 'b'), 1).overflow)).toEqual(['a', 'b']);
    expect(ids(splitToolbar(items('a', 'b'), 0).overflow)).toEqual(['a', 'b']);
  });

  describe('with an anchor item (the left toolbar’s More)', () => {
    // Alarms, Layers, Draw, North up, Follow, More, Exit playback, What's New
    const left = items('al', 'la', 'dr', 'nu', 'fo', 'more', 'ex', 'wn');
    const isMore = (i: ToolbarItem) => i.id === 'more';

    it('keeps the anchor in its own place when everything fits', () => {
      const split = splitToolbar(left, 8, isMore);
      expect(ids(split.shown)).toEqual(ids(left));
      expect(split.overflowed).toBe(false);
    });

    it('leaves the anchor out of shown and overflow once it overflows', () => {
      // phone landscape: room for 4 buttons, the last of which is More
      const split = splitToolbar(left, 4, isMore);
      expect(ids(split.shown)).toEqual(['al', 'la', 'dr']);
      expect(ids(split.overflow)).toEqual(['nu', 'fo', 'ex', 'wn']);
    });

    it('moves items that came after the anchor into its menu', () => {
      const split = splitToolbar(left, 7, isMore);
      expect(ids(split.shown)).toEqual(['al', 'la', 'dr', 'nu', 'fo', 'ex']);
      expect(ids(split.overflow)).toEqual(['wn']);
    });
  });
});

describe('needsAttention', () => {
  it('flags an active item, one with a badge or one with a tone', () => {
    expect(needsAttention({ id: 'a', tooltip: '', active: true })).toBe(true);
    expect(needsAttention({ id: 'a', tooltip: '', badge: 2 })).toBe(true);
    expect(needsAttention({ id: 'a', tooltip: '', tone: 'warning' })).toBe(
      true
    );
    expect(needsAttention({ id: 'a', tooltip: '', badge: 0 })).toBe(false);
    expect(needsAttention({ id: 'a', tooltip: '' })).toBe(false);
  });
});

describe('sameToolbarItems', () => {
  const build = (active: boolean): ToolbarItem[] => [
    { id: 'a', tooltip: 'A', active, action: () => undefined },
    { id: 'b', tooltip: 'B', action: () => undefined }
  ];

  it('treats lists rebuilt with new closures as the same', () => {
    expect(sameToolbarItems(build(false), build(false))).toBe(true);
  });

  it('sees a changed field, a changed length or a changed order', () => {
    expect(sameToolbarItems(build(false), build(true))).toBe(false);
    expect(sameToolbarItems(build(false), build(false).slice(1))).toBe(false);
    expect(sameToolbarItems(build(false), build(false).reverse())).toBe(false);
  });

  it('compares colours by value', () => {
    const colored = (bg: string): ToolbarItem[] => [
      { id: 'a', tooltip: 'A', colors: { bg } }
    ];
    expect(sameToolbarItems(colored('#ffd600'), colored('#ffd600'))).toBe(true);
    expect(sameToolbarItems(colored('#ffd600'), colored('#000000'))).toBe(
      false
    );
    expect(
      sameToolbarItems(colored('#ffd600'), [{ id: 'a', tooltip: 'A' }])
    ).toBe(false);
  });
});
