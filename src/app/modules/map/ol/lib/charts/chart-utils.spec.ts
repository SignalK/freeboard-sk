import { expect, describe, it } from 'vitest';
import {
  extentFromBounds,
  isChartInView,
  resolveLayerMaxZoom
} from './chart-utils';

describe('resolveLayerMaxZoom', () => {
  it('returns chart max when over-zoom disabled', () => {
    expect(resolveLayerMaxZoom(12, 20, false)).toBe(12);
  });

  it('returns chart max when map max is not a number', () => {
    expect(resolveLayerMaxZoom(12, undefined, true)).toBe(12);
  });

  it('uses map max when chart max is undefined and over-zoom enabled', () => {
    expect(resolveLayerMaxZoom(undefined, 20, true)).toBe(20);
  });

  it('uses the larger of chart and map max when over-zoom enabled', () => {
    expect(resolveLayerMaxZoom(12, 20, true)).toBe(20);
    expect(resolveLayerMaxZoom(24, 20, true)).toBe(24);
  });
});

describe('extentFromBounds', () => {
  it('returns undefined for missing bounds', () => {
    expect(extentFromBounds()).toBe(undefined);
  });

  it('returns undefined for invalid bounds length', () => {
    expect(extentFromBounds([90, 90, 90])).toBe(undefined);
  });

  it('returns undefined for invalid bounds values', () => {
    expect(extentFromBounds([90, 90, 90, 300])).toBe(undefined);
  });

  it('returns a transformed extent for valid mid-range bounds', () => {
    const extent = extentFromBounds([-10, -10, 10, 10]);
    expect(extent).toBeDefined();
    expect(extent).toHaveLength(4);
    expect(extent?.every((n) => Number.isFinite(n))).toBe(true);
  });

  it('rejects bounds that touch the +/-180 / +/-90 edges', () => {
    expect(extentFromBounds([-180, 0, 10, 10])).toBe(undefined);
    expect(extentFromBounds([-10, -90, 10, 10])).toBe(undefined);
    expect(extentFromBounds([-10, -10, 180, 10])).toBe(undefined);
    expect(extentFromBounds([-10, -10, 10, 90])).toBe(undefined);
  });

  it('accepts bounds just inside the edges', () => {
    expect(extentFromBounds([-179.99, -89.99, 179.99, 89.99])).toBeDefined();
  });
});

describe('isChartInView', () => {
  const extent = [10, 40, 20, 50];

  it('keeps a chart whose bounds overlap the extent', () => {
    expect(isChartInView([15, 45, 30, 60], extent)).toBe(true);
  });

  it('keeps a chart fully contained within the extent', () => {
    expect(isChartInView([12, 42, 18, 48], extent)).toBe(true);
  });

  it('drops a chart whose bounds are disjoint from the extent', () => {
    expect(isChartInView([30, 45, 40, 60], extent)).toBe(false);
  });

  it('keeps a chart that only touches the extent edge', () => {
    expect(isChartInView([20, 40, 30, 50], extent)).toBe(true);
  });

  it('keeps charts with missing or malformed bounds (treated as global)', () => {
    expect(isChartInView(undefined, extent)).toBe(true);
    expect(isChartInView([10, 40, 20], extent)).toBe(true);
    expect(isChartInView([], extent)).toBe(true);
  });
});
