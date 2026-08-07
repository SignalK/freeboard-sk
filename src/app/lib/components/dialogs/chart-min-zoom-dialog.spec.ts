import { describe, it, expect } from 'vitest';
import {
  displayMinZoomError,
  displayMinZoomLabel,
  parseZoomBound,
  zoomToBoundText,
  ZOOM_ENTRY_MAX,
  ZOOM_ENTRY_MIN
} from './chart-min-zoom-dialog';

describe('parseZoomBound', () => {
  it('reads a typed zoom level', () => {
    expect(parseZoomBound('12')).toEqual({ value: 12, invalid: false });
  });

  it('keeps a fractional level', () => {
    expect(parseZoomBound('12.4')).toEqual({ value: 12.4, invalid: false });
  });

  it('treats an empty field as no bound rather than an error', () => {
    expect(parseZoomBound('')).toEqual({ invalid: false });
    expect(parseZoomBound('   ')).toEqual({ invalid: false });
    expect(parseZoomBound(null)).toEqual({ invalid: false });
  });

  it('rejects a non-numeric entry', () => {
    expect(parseZoomBound('abc').invalid).toBe(true);
  });

  it('rejects levels outside the map zoom range', () => {
    expect(parseZoomBound(ZOOM_ENTRY_MIN - 1).invalid).toBe(true);
    expect(parseZoomBound(ZOOM_ENTRY_MAX + 1).invalid).toBe(true);
    expect(parseZoomBound(ZOOM_ENTRY_MIN).invalid).toBe(false);
    expect(parseZoomBound(ZOOM_ENTRY_MAX).invalid).toBe(false);
  });
});

describe('displayMinZoomError', () => {
  it('accepts a level in range', () => {
    expect(displayMinZoomError({ value: 12, invalid: false })).toBeNull();
  });

  it('accepts an empty bound', () => {
    expect(displayMinZoomError({ invalid: false })).toBeNull();
  });

  it('reports an out-of-range entry', () => {
    expect(displayMinZoomError({ invalid: true })).toContain('between');
  });
});

describe('displayMinZoomLabel', () => {
  it('matches the dialog wording', () => {
    expect(displayMinZoomLabel(12)).toBe('from z12');
  });

  it('labels nothing when no minimum is set', () => {
    expect(displayMinZoomLabel()).toBe('');
    expect(displayMinZoomLabel(undefined)).toBe('');
  });

  it('labels a minimum of 0', () => {
    expect(displayMinZoomLabel(0)).toBe('from z0');
  });
});

describe('zoomToBoundText', () => {
  it('reports the map zoom to one decimal, rounding down', () => {
    expect(zoomToBoundText(12.37)).toBe('12.3');
    expect(zoomToBoundText(12)).toBe('12');
  });

  it('never yields a bound above the zoom it was captured at', () => {
    // The bound must not hide the chart at the very zoom the user took it from:
    // the layer minimum is bound - MIN_ZOOM_EPSILON and OL's minimum is exclusive.
    for (const zoom of [12.35, 12.36, 12.37, 9.99, 15.05, 2.5]) {
      expect(Number(zoomToBoundText(zoom))).toBeLessThanOrEqual(zoom);
    }
  });

  it('yields an empty field for an unknown zoom', () => {
    expect(zoomToBoundText(undefined as unknown as number)).toBe('');
  });
});
