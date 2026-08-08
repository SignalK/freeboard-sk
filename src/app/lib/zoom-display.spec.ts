import { expect, describe, it } from 'vitest';
import { truncateZoomToDisplay, zoomDisplayText } from './zoom-display';
import {
  isZoomWithinLayerRange,
  resolveLayerZoomRange
} from 'src/app/modules/map/ol/lib/charts/chart-utils';

describe('truncateZoomToDisplay', () => {
  it('truncates to a tenth rather than rounding', () => {
    expect(truncateZoomToDisplay(13.9757)).toBe(13.9);
    expect(truncateZoomToDisplay(15.05)).toBe(15);
    expect(truncateZoomToDisplay(9.99)).toBe(9.9);
  });

  it('leaves a level already on a tenth alone', () => {
    // 12.3 * 10 is 122.99999999999999, which a bare floor drops to 12.2.
    expect(truncateZoomToDisplay(12.3)).toBe(12.3);
    expect(truncateZoomToDisplay(14)).toBe(14);
  });

  it('yields a value that prints without floating-point noise', () => {
    for (let tenths = 0; tenths <= 280; tenths++) {
      const text = String(truncateZoomToDisplay(tenths / 10 + 0.03));
      expect(text.length).toBeLessThanOrEqual(4);
    }
  });
});

describe('zoomDisplayText', () => {
  it('carries one decimal', () => {
    expect(zoomDisplayText(14)).toBe('14.0');
    expect(zoomDisplayText(13.9757)).toBe('13.9');
  });

  it('never names a level a chart set to it would be hidden at', () => {
    // The bug this pins: a rounding readout showed "14.0" from z13.95 up, while
    // a chart with a z14 minimum stayed off the map until z14 — the user was
    // told they were at the level they had configured, and saw nothing.
    const resolved = resolveLayerZoomRange(
      { minZoom: 5, maxZoom: 15, displayMinZoom: 14 },
      20,
      true
    );
    for (const zoom of [13.9, 13.95, 13.9757, 13.999, 14, 14.05]) {
      if (zoomDisplayText(zoom) === '14.0') {
        expect(isZoomWithinLayerRange(resolved, zoom)).toBe(true);
      }
    }
  });
});
