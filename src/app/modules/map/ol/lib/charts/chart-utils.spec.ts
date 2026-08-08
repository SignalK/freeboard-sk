import { expect, describe, it } from 'vitest';
import {
  extentFromBounds,
  isChartInView,
  isZoomWithinLayerRange,
  resolveLayerMaxZoom,
  resolveLayerZoomRange
} from './chart-utils';

describe('resolveLayerZoomRange', () => {
  // A chart declaring tiles for z5-z15, the shape the Traficom raster sets have.
  const chart = (displayMinZoom?: number) => ({
    minZoom: 5,
    maxZoom: 15,
    displayMinZoom
  });

  describe('without a display minimum (existing behaviour)', () => {
    it('matches the current max resolution with over-zoom on and off', () => {
      expect(resolveLayerZoomRange(chart(), 20, true).max).toBe(
        resolveLayerMaxZoom(15, 20, true)
      );
      expect(resolveLayerZoomRange(chart(), 20, false).max).toBe(
        resolveLayerMaxZoom(15, 20, false)
      );
    });

    it('keeps the legacy 0.1 offset on the declared minimum', () => {
      expect(resolveLayerZoomRange(chart(), 20, true).min).toBeCloseTo(4.9);
    });

    it('leaves a declared minimum below the offset untouched', () => {
      expect(
        resolveLayerZoomRange({ minZoom: 0, maxZoom: 24 }, 20, true).min
      ).toBe(0);
    });
  });

  describe('display minimum', () => {
    it('shows the chart at exactly the configured level', () => {
      const { min } = resolveLayerZoomRange(chart(12), 20, true);
      // OpenLayers' layer minimum is exclusive: visible while zoom > min.
      expect(12).toBeGreaterThan(min);
      expect(11.99).toBeLessThan(min);
    });

    it('does not inherit the legacy 0.1 offset', () => {
      expect(resolveLayerZoomRange(chart(12), 20, true).min).toBeGreaterThan(
        11.9
      );
    });

    it('yields to a higher declared minimum', () => {
      expect(resolveLayerZoomRange(chart(3), 20, true).min).toBeCloseTo(4.9);
    });

    it('honours a bound set at the chart’s own declared minimum', () => {
      // The common case: the user picks the level the chart's data starts at.
      // The legacy 0.1 offset would draw it from 4.9, ignoring the bound.
      const { min } = resolveLayerZoomRange(chart(5), 20, true);
      expect(5).toBeGreaterThan(min);
      expect(4.99).toBeLessThan(min);
    });

    it('applies to a chart that declares no minimum', () => {
      const { min } = resolveLayerZoomRange(
        { maxZoom: 15, displayMinZoom: 12 },
        20,
        true
      );
      expect(12).toBeGreaterThan(min);
      expect(11.99).toBeLessThan(min);
    });

    it('leaves the maximum entirely alone', () => {
      expect(resolveLayerZoomRange(chart(12), 20, true).max).toBe(
        resolveLayerMaxZoom(15, 20, true)
      );
      expect(resolveLayerZoomRange(chart(12), 20, false).max).toBe(15);
    });

    it('never draws a chart below the zoom its tiles start at', () => {
      // Asking for z3 on a chart whose data starts at z5 must not invent tiles.
      const { min } = resolveLayerZoomRange(chart(3), 20, true);
      expect(min).toBeGreaterThanOrEqual(4.9);
    });
  });

  it('hands over between charts at the level the next one starts', () => {
    // Coastal charts from z9, boating charts from z12: at z12 the boating
    // chart is drawn, and the coastal one is still there underneath it.
    const coastal = resolveLayerZoomRange(chart(9), 20, true);
    const boating = resolveLayerZoomRange(chart(12), 20, true);
    expect(isZoomWithinLayerRange(coastal, 11.99)).toBe(true);
    expect(isZoomWithinLayerRange(boating, 11.99)).toBe(false);
    expect(isZoomWithinLayerRange(coastal, 12)).toBe(true);
    expect(isZoomWithinLayerRange(boating, 12)).toBe(true);
  });
});

describe('isZoomWithinLayerRange', () => {
  it('follows OpenLayers bounds: minimum exclusive, maximum inclusive', () => {
    const range = { min: 9, max: 13 };
    expect(isZoomWithinLayerRange(range, 9)).toBe(false);
    expect(isZoomWithinLayerRange(range, 9.0001)).toBe(true);
    expect(isZoomWithinLayerRange(range, 13)).toBe(true);
    expect(isZoomWithinLayerRange(range, 13.0001)).toBe(false);
  });

  it('treats an absent bound as unbounded at that end', () => {
    expect(isZoomWithinLayerRange({ max: 13 }, 2)).toBe(true);
    expect(isZoomWithinLayerRange({ min: 9 }, 28)).toBe(true);
    expect(isZoomWithinLayerRange({}, 11)).toBe(true);
  });

  it('reports a chart hidden by its declared minimum as not visible', () => {
    // Display minimum asks for z8 up, but the chart has no tiles below z10.
    const resolved = resolveLayerZoomRange(
      { minZoom: 10, maxZoom: 15, displayMinZoom: 8 },
      20,
      true
    );
    expect(isZoomWithinLayerRange(resolved, 9)).toBe(false);
  });
});

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

  describe('antimeridian-crossing view', () => {
    // View straddling the dateline reported by OpenLayers as maxLon > 180.
    const eastWrapped = [170, 40, 190, 60];
    // Equivalent view reported with minLon < -180.
    const westWrapped = [-190, 40, -170, 60];

    it('keeps a chart just west of the dateline (maxLon > 180 view)', () => {
      expect(isChartInView([172, 42, 178, 58], eastWrapped)).toBe(true);
    });

    it('keeps a chart just east of the dateline (maxLon > 180 view)', () => {
      expect(isChartInView([-178, 42, -172, 58], eastWrapped)).toBe(true);
    });

    it('keeps a chart east of the dateline (minLon < -180 view)', () => {
      expect(isChartInView([-178, 42, -172, 58], westWrapped)).toBe(true);
    });

    it('drops a chart outside a dateline-crossing view', () => {
      expect(isChartInView([100, 42, 120, 58], eastWrapped)).toBe(false);
    });

    it('drops a chart within the view longitude but outside its latitude', () => {
      expect(isChartInView([172, 0, 178, 20], eastWrapped)).toBe(false);
    });

    it('keeps every chart when the view spans the whole globe', () => {
      const worldView = [-200, 40, 200, 60];
      expect(isChartInView([-178, 42, -172, 58], worldView)).toBe(true);
      expect(isChartInView([0, 42, 10, 58], worldView)).toBe(true);
      expect(isChartInView([172, 42, 178, 58], worldView)).toBe(true);
    });
  });
});
