import { resolveLayerMaxZoom } from './zoom-utils';

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
