import { describe, expect, it } from 'vitest';
import {
  clampRatio,
  DEFAULT_SPLIT_VIEW,
  parseSplitViewState,
  ratioFromPointer,
  SPLIT_RATIO_MAX,
  SPLIT_RATIO_MIN,
  viewFootprint
} from './split-view';

describe('clampRatio', () => {
  it('keeps a ratio inside the allowed range', () => {
    expect(clampRatio(0.5)).toBe(0.5);
    expect(clampRatio(0.05)).toBe(SPLIT_RATIO_MIN);
    expect(clampRatio(0.99)).toBe(SPLIT_RATIO_MAX);
  });

  it('falls back to the default for a non-number', () => {
    expect(clampRatio(NaN)).toBe(DEFAULT_SPLIT_VIEW.ratio);
    expect(clampRatio(Infinity)).toBe(DEFAULT_SPLIT_VIEW.ratio);
  });
});

describe('ratioFromPointer', () => {
  const rect = { left: 100, top: 50, width: 1000, height: 600 };

  it('measures across the panel when the panes are side by side', () => {
    expect(ratioFromPointer(rect, 600, 999, false)).toBe(0.5);
  });

  it('measures down the panel when the panes are stacked', () => {
    expect(ratioFromPointer(rect, 999, 290, true)).toBeCloseTo(0.4);
  });

  it('never lets either pane collapse', () => {
    expect(ratioFromPointer(rect, 100, 0, false)).toBe(SPLIT_RATIO_MIN);
    expect(ratioFromPointer(rect, 1100, 0, false)).toBe(SPLIT_RATIO_MAX);
  });
});

describe('parseSplitViewState', () => {
  it('returns the defaults when nothing is stored', () => {
    expect(parseSplitViewState(null)).toEqual(DEFAULT_SPLIT_VIEW);
  });

  it('returns the defaults for a corrupt entry', () => {
    expect(parseSplitViewState('{not json')).toEqual(DEFAULT_SPLIT_VIEW);
    expect(parseSplitViewState('42')).toEqual(DEFAULT_SPLIT_VIEW);
  });

  it('restores a stored state', () => {
    const stored = {
      enabled: true,
      ratio: 0.45,
      northUp: false,
      follow: true,
      zoom: 9.5,
      center: [22.1, 60.2]
    };
    expect(parseSplitViewState(JSON.stringify(stored))).toEqual(stored);
  });

  it('replaces each malformed field with its default, keeping the rest', () => {
    const state = parseSplitViewState(
      JSON.stringify({
        enabled: 'yes',
        ratio: 2,
        northUp: false,
        zoom: 'far',
        center: [22.1]
      })
    );
    expect(state).toEqual({
      ...DEFAULT_SPLIT_VIEW,
      ratio: SPLIT_RATIO_MAX,
      northUp: false
    });
  });

  it('drops anything after lon/lat from a stored centre', () => {
    const state = parseSplitViewState(
      JSON.stringify({ center: [22.1, 60.2, 15] })
    );
    expect(state.center).toEqual([22.1, 60.2]);
  });
});

describe('viewFootprint', () => {
  // A map showing [0, 0]..[200, 100] in render space, 2 units per pixel.
  const map = (size: number[] | undefined, rendered = true) => ({
    getSize: () => size,
    getCoordinateFromPixel: (p: number[]) =>
      rendered ? [p[0] * 2, 100 - p[1] * 2] : null
  });

  it('outlines the viewport as a closed ring, corner by corner', () => {
    expect(viewFootprint(map([100, 50]))).toEqual([
      [0, 100],
      [200, 100],
      [200, 0],
      [0, 0],
      [0, 100]
    ]);
  });

  it('is null before the map has a size', () => {
    expect(viewFootprint(map(undefined))).toBeNull();
    expect(viewFootprint(map([0, 50]))).toBeNull();
  });

  it('is null before the map has rendered', () => {
    expect(viewFootprint(map([100, 50], false))).toBeNull();
  });
});
