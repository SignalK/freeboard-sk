import { afterEach, describe, expect, it } from 'vitest';
import {
  PanelPlacement,
  clampPosition,
  isPanelPlacement,
  loadPlacement,
  placementFromRect,
  positionFromPlacement,
  savePlacement
} from './movable-panel';

const AREA = { w: 1000, h: 600 };
const SIZE = { w: 200, h: 100 };

describe('movable panel placement', () => {
  it.each<[string, { x: number; y: number }, PanelPlacement]>([
    ['top-left', { x: 10, y: 20 }, { corner: 'top-left', x: 10, y: 20 }],
    ['top-right', { x: 780, y: 20 }, { corner: 'top-right', x: 20, y: 20 }],
    ['bottom-left', { x: 10, y: 470 }, { corner: 'bottom-left', x: 10, y: 30 }],
    [
      'bottom-right',
      { x: 790, y: 490 },
      { corner: 'bottom-right', x: 10, y: 10 }
    ]
  ])('anchors a panel nearest the %s corner to it', (_, pos, expected) => {
    expect(placementFromRect({ ...pos, ...SIZE }, AREA)).toEqual(expected);
  });

  it('round-trips a placement in the same area', () => {
    const rect = { x: 640, y: 410, ...SIZE };
    const p = placementFromRect(rect, AREA);
    expect(positionFromPlacement(p, SIZE, AREA)).toEqual({ x: 640, y: 410 });
  });

  it('keeps the anchored corner when the area resizes', () => {
    const p = placementFromRect({ x: 790, y: 490, ...SIZE }, AREA);
    expect(positionFromPlacement(p, SIZE, { w: 800, h: 500 })).toEqual({
      x: 590,
      y: 390
    });
  });

  it('keeps the anchored corner when the panel changes size', () => {
    const p = placementFromRect({ x: 790, y: 490, ...SIZE }, AREA);
    expect(positionFromPlacement(p, { w: 300, h: 100 }, AREA)).toEqual({
      x: 690,
      y: 490
    });
  });

  it('brings a placement that no longer fits back inside the area', () => {
    const p = { corner: 'top-left' as const, x: 900, y: 550 };
    expect(positionFromPlacement(p, SIZE, AREA)).toEqual({ x: 800, y: 500 });
  });

  it('pins a panel bigger than the area to its top-left', () => {
    expect(clampPosition({ x: 50, y: 50 }, { w: 1200, h: 700 }, AREA)).toEqual({
      x: 0,
      y: 0
    });
  });
});

describe('movable panel storage', () => {
  const KEY = 'movable-panel-spec';

  afterEach(() => localStorage.removeItem(KEY));

  it('saves and loads a placement', () => {
    savePlacement(KEY, { corner: 'bottom-right', x: 12, y: 34 });
    expect(loadPlacement(KEY)).toEqual({
      corner: 'bottom-right',
      x: 12,
      y: 34
    });
  });

  it('has no placement until one is saved', () => {
    expect(loadPlacement(KEY)).toBeNull();
  });

  it.each<[string, string]>([
    ['not JSON', '{oops'],
    ['an unknown corner', '{"corner":"middle","x":1,"y":2}'],
    ['a missing offset', '{"corner":"top-left","x":1}'],
    ['a non-numeric offset', '{"corner":"top-left","x":"1","y":2}']
  ])('ignores a stored value that is %s', (_, raw) => {
    localStorage.setItem(KEY, raw);
    expect(loadPlacement(KEY)).toBeNull();
  });

  it('rejects non-finite offsets', () => {
    expect(isPanelPlacement({ corner: 'top-left', x: NaN, y: 0 })).toBe(false);
  });
});
