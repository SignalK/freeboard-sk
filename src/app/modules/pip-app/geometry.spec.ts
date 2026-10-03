import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LIMITS,
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
  it('moves the whole window', () => {
    expect(applyGesture(start, 'move', 20, -30)).toEqual({
      x: 120,
      y: 70,
      w: 300,
      h: 200
    });
  });

  it('resizes from the east and south edges without moving the origin', () => {
    expect(applyGesture(start, 'se', 50, 40)).toEqual({
      x: 100,
      y: 100,
      w: 350,
      h: 240
    });
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

  it('changes only the dragged axis for a single edge', () => {
    expect(applyGesture(start, 'e', 30, 99)).toEqual({ ...start, w: 330 });
    expect(applyGesture(start, 's', 99, 30)).toEqual({ ...start, h: 230 });
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
    expect(r.y).toBeLessThanOrEqual(vp.h - DEFAULT_LIMITS.barH);
  });
});

describe('snapToEdges', () => {
  it('snaps to an edge within the threshold and leaves others alone', () => {
    expect(snapToEdges({ x: 8, y: 300, w: 200, h: 100 }, vp)).toEqual({
      x: 0,
      y: 300,
      w: 200,
      h: 100
    });
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

  it('validates stored rectangles', () => {
    expect(isValidRect({ x: 0, y: 0.5, w: 1, h: 0.2 })).toBe(true);
    expect(isValidRect({ x: -0.1, y: 0, w: 0.5, h: 0.5 })).toBe(false);
    expect(isValidRect({ x: 0, y: 0, w: 1.5, h: 0.5 })).toBe(false);
    expect(isValidRect({ x: 0, y: 0, w: NaN, h: 0.5 })).toBe(false);
    expect(isValidRect({ x: 0, y: 0, w: 0.5 })).toBe(false);
    expect(isValidRect(null)).toBe(false);
  });
});
