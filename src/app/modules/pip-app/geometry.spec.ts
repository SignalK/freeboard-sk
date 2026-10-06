import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LIMITS,
  GestureMode,
  PxRect,
  SNAP_DISTANCE,
  applyGesture,
  boundedGesture,
  clampToViewport,
  fromFractions,
  isValidRect,
  snapToEdges,
  toFractions
} from './geometry';

const start = { x: 100, y: 100, w: 300, h: 200 };
const vp = { w: 1000, h: 800 };

describe('applyGesture', () => {
  it.each<[GestureMode, PxRect]>([
    ['move', { x: 150, y: 140, w: 300, h: 200 }],
    ['n', { x: 100, y: 140, w: 300, h: 160 }],
    ['s', { x: 100, y: 100, w: 300, h: 240 }],
    ['e', { x: 100, y: 100, w: 350, h: 200 }],
    ['w', { x: 150, y: 100, w: 250, h: 200 }],
    ['ne', { x: 100, y: 140, w: 350, h: 160 }],
    ['nw', { x: 150, y: 140, w: 250, h: 160 }],
    ['se', { x: 100, y: 100, w: 350, h: 240 }],
    ['sw', { x: 150, y: 100, w: 250, h: 240 }]
  ])('applies a (50, 40) delta in mode %s', (mode, expected) => {
    expect(applyGesture(start, mode, 50, 40)).toEqual(expected);
  });

  it('keeps the opposite edge fixed when resizing from north or west', () => {
    const r = applyGesture(start, 'nw', -50, -20);
    expect(r).toEqual({ x: 50, y: 80, w: 350, h: 220 });
    expect(r.x + r.w).toBe(start.x + start.w);
    expect(r.y + r.h).toBe(start.y + start.h);
  });

  it('stops at the minimum size instead of flipping', () => {
    const shrunk = applyGesture(start, 'w', 1000, 0);
    expect(shrunk.w).toBe(DEFAULT_LIMITS.minW);
    expect(shrunk.x + shrunk.w).toBe(start.x + start.w);
    expect(applyGesture(start, 'n', 0, 1000).h).toBe(DEFAULT_LIMITS.minH);
  });
});

describe('boundedGesture', () => {
  it('stops a west resize at the left edge without moving the east edge', () => {
    const r = boundedGesture(start, 'w', -500, 0, vp);
    expect(r.x).toBe(0);
    expect(r.x + r.w).toBe(start.x + start.w);
  });

  it('stops an east resize at the right edge', () => {
    const r = boundedGesture(start, 'e', 5000, 0, vp);
    expect(r.x).toBe(start.x);
    expect(r.x + r.w).toBe(vp.w);
  });

  it('keeps a moved window inside the viewport', () => {
    const r = boundedGesture(start, 'move', 5000, 5000, vp);
    expect(r.x).toBe(vp.w - start.w);
    expect(r.y).toBe(vp.h - DEFAULT_LIMITS.barH);
  });
});

describe('snapToEdges', () => {
  // SNAP_DISTANCE is 12 and inclusive
  it.each([
    [8, 0],
    [SNAP_DISTANCE, 0],
    [SNAP_DISTANCE + 1, SNAP_DISTANCE + 1]
  ])('an x of %i snaps to %i', (x, snapped) => {
    expect(snapToEdges({ x, y: 300, w: 200, h: 100 }, vp).x).toBe(snapped);
  });

  it('snaps to the far edges and leaves a window in the middle alone', () => {
    expect(snapToEdges({ x: 790, y: 690, w: 200, h: 100 }, vp)).toEqual({
      x: 800,
      y: 700,
      w: 200,
      h: 100
    });
    expect(snapToEdges({ x: 30, y: 30, w: 200, h: 100 }, vp)).toEqual({
      x: 30,
      y: 30,
      w: 200,
      h: 100
    });
  });

  it('keeps a short (collapsed) window short while it moves and snaps', () => {
    const bar = { x: 100, y: 100, w: 300, h: 34 };
    const moved = boundedGesture(bar, 'move', 50, 5000, vp);
    expect(moved.h).toBe(34);
    expect(moved.y + moved.h).toBe(vp.h);
    expect(boundedGesture(bar, 'move', 10, 20, vp).h).toBe(34);
  });

  it('snaps a dragged window but not a resize', () => {
    expect(boundedGesture(start, 'move', -92, 0, vp).x).toBe(0);
    expect(boundedGesture(start, 'w', -92, 0, vp).x).toBe(8);
  });
});

describe('clampToViewport', () => {
  it('pulls an off-screen window back so its title bar is reachable', () => {
    const r = clampToViewport({ x: -200, y: 900, w: 300, h: 200 }, vp);
    expect(r.x).toBe(0);
    expect(r.y).toBe(vp.h - DEFAULT_LIMITS.barH);
  });

  it('never makes a window larger than the viewport', () => {
    const r = clampToViewport({ x: 0, y: 0, w: 5000, h: 5000 }, vp);
    expect(r).toEqual({ x: 0, y: 0, w: vp.w, h: vp.h });
  });

  it('enforces the minimum size', () => {
    const r = clampToViewport({ x: 10, y: 10, w: 20, h: 20 }, vp);
    expect(r.w).toBe(DEFAULT_LIMITS.minW);
    expect(r.h).toBe(DEFAULT_LIMITS.minH);
  });
});

describe('viewport fractions', () => {
  it('round-trips through fractions and scales to another viewport', () => {
    const f = toFractions(start, vp);
    expect(f).toEqual({ x: 0.1, y: 0.125, w: 0.3, h: 0.25 });
    expect(fromFractions(f, vp)).toEqual(start);
    expect(fromFractions(f, { w: 500, h: 400 })).toEqual({
      x: 50,
      y: 50,
      w: 150,
      h: 100
    });
  });

  it.each<[string, boolean, unknown]>([
    ['all fields in range', true, { x: 0, y: 0.5, w: 1, h: 0.2 }],
    ['a negative field', false, { x: -0.1, y: 0, w: 0.5, h: 0.5 }],
    ['a field above 1', false, { x: 0, y: 0, w: 1.5, h: 0.5 }],
    ['NaN', false, { x: 0, y: 0, w: NaN, h: 0.5 }],
    ['a missing field', false, { x: 0, y: 0, w: 0.5 }],
    ['null', false, null]
  ])('isValidRect: %s -> %s', (_, valid, rect) => {
    expect(isValidRect(rect)).toBe(valid);
  });
});
