import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LIMITS,
  GestureMode,
  PxRect,
  SNAP_DISTANCE,
  applyGesture,
  boundedGesture,
  anchoredGeometry,
  clampToViewport,
  isValidGeometry,
  resolveGeometry,
  snapToEdges
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

describe('resolveGeometry', () => {
  it.each<[string, PxRect]>([
    ['top-left', { x: 10, y: 20, w: 200, h: 150 }],
    ['top-center', { x: 410, y: 20, w: 200, h: 150 }],
    ['top-right', { x: 790, y: 20, w: 200, h: 150 }],
    ['center-left', { x: 10, y: 345, w: 200, h: 150 }],
    ['center', { x: 410, y: 345, w: 200, h: 150 }],
    ['bottom-right', { x: 790, y: 630, w: 200, h: 150 }]
  ])('places a %s window by its inward offset', (anchor, rect) => {
    expect(
      resolveGeometry(
        {
          anchor: anchor as never,
          offset: { x: 10, y: 20 },
          width: 200,
          height: 150
        },
        vp
      )
    ).toEqual(rect);
  });

  it('takes sizes and offsets as percentages of the area', () => {
    expect(
      resolveGeometry(
        {
          anchor: 'top-left',
          offset: { x: '10%', y: '5%' },
          width: '40%',
          height: '25%'
        },
        vp
      )
    ).toEqual({ x: 100, y: 40, w: 400, h: 200 });
  });

  it('honours min and max sizes, and never goes below the host minimum', () => {
    expect(
      resolveGeometry(
        { width: 900, maxWidth: '50%', height: 50, minHeight: 300 },
        vp
      )
    ).toMatchObject({ w: 500, h: 300 });
    expect(resolveGeometry({ width: 10, height: 10 }, vp)).toMatchObject({
      w: DEFAULT_LIMITS.minW,
      h: DEFAULT_LIMITS.minH
    });
  });

  it('keeps a window that asks to be off-screen usable inside the area', () => {
    expect(
      resolveGeometry(
        {
          anchor: 'top-left',
          offset: { x: 2000, y: -500 },
          width: 300,
          height: 200
        },
        vp
      )
    ).toEqual({ x: 700, y: 0, w: 300, h: 200 });
  });

  it('never makes a window larger than the area', () => {
    expect(resolveGeometry({ width: 5000, height: 5000 }, vp)).toMatchObject({
      w: 1000,
      h: 800
    });
  });
});

describe('anchoredGeometry', () => {
  it.each<[string, PxRect, string, { x: number; y: number }]>([
    [
      'the top-left',
      { x: 30, y: 40, w: 200, h: 150 },
      'top-left',
      { x: 30, y: 40 }
    ],
    [
      'the middle',
      { x: 400, y: 325, w: 200, h: 150 },
      'center',
      { x: 0, y: 0 }
    ],
    [
      'the bottom-right',
      { x: 760, y: 610, w: 200, h: 150 },
      'bottom-right',
      { x: 40, y: 40 }
    ],
    [
      'the top middle',
      { x: 420, y: 10, w: 200, h: 150 },
      'top-center',
      { x: 20, y: 10 }
    ]
  ])('anchors a window in %s to its nearest edges', (_, r, anchor, offset) => {
    const g = anchoredGeometry(r, vp);
    expect(g).toMatchObject({ anchor, offset, width: r.w, height: r.h });
    expect(resolveGeometry(g, vp)).toEqual(r);
  });

  it('keeps the request limits', () => {
    expect(
      anchoredGeometry({ x: 0, y: 0, w: 300, h: 200 }, vp, {
        minWidth: 240,
        maxHeight: '80%'
      })
    ).toMatchObject({ minWidth: 240, maxHeight: '80%' });
  });
});

describe('isValidGeometry', () => {
  it.each<[string, boolean, unknown]>([
    ['an empty request', true, {}],
    ['px and % lengths', true, { anchor: 'center', width: 300, height: '40%' }],
    ['negative offsets', true, { offset: { x: -10, y: '-5%' } }],
    ['an unknown anchor', false, { anchor: 'middle' }],
    ['a negative size', false, { width: -1 }],
    ['a size that is not a length', false, { width: '300px' }],
    ['NaN', false, { height: NaN }],
    ['a malformed offset', false, { offset: 5 }],
    ['an array', false, []],
    ['null', false, null]
  ])('%s -> %s', (_, valid, g) => {
    expect(isValidGeometry(g)).toBe(valid);
  });
});
