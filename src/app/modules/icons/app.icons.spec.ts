import { describe, it, expect } from 'vitest';
import { getAisIcon } from './app.icons';

// The AIS list and the vessel properties dialog show this icon (#1236).
describe('getAisIcon', () => {
  it('returns the fishing icon for AIS type 30', () => {
    expect(getAisIcon(30).svgIcon).toBe('ais_fishing');
  });

  it('returns the type 30 icon for sailing and pleasure craft', () => {
    expect(getAisIcon(36).svgIcon).toBe('ais_active');
    expect(getAisIcon(37).svgIcon).toBe('ais_active');
  });

  it('buckets other types by tens', () => {
    expect(getAisIcon(74).svgIcon).toBe('ais_cargo');
  });
});
