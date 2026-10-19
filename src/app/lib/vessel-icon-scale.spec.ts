import { describe, expect, it } from 'vitest';
import { actualSizeIconScale } from './vessel-icon-scale';

const metrics = { width: 20, height: 40, scale: 0.5 };

describe('actualSizeIconScale', () => {
  it('keeps the selected scale when no dimensions are known', () => {
    expect(actualSizeIconScale(metrics, {}, 0.5)).toBe(0.5);
    expect(
      actualSizeIconScale(metrics, { lengthOverall: 0, beam: null }, 0.5)
    ).toBe(0.5);
    expect(
      actualSizeIconScale(metrics, { lengthOverall: 10, beam: 5 }, 0)
    ).toBe(0.5);
  });

  it('never shrinks below the selected icon size', () => {
    // 10 m / 0.5 m per px = 20 px long, exactly the selected size.
    expect(
      actualSizeIconScale(metrics, { lengthOverall: 10, beam: 5 }, 0.5)
    ).toEqual([0.5, 0.5]);
  });

  it('scales each axis to the reported length and beam', () => {
    // 100 m / 0.5 = 200 px long, 20 m / 0.5 = 40 px wide.
    expect(
      actualSizeIconScale(metrics, { lengthOverall: 100, beam: 20 }, 0.5)
    ).toEqual([2, 5]);
  });

  it('derives the missing dimension from the icon aspect ratio', () => {
    expect(actualSizeIconScale(metrics, { lengthOverall: 100 }, 0.5)).toEqual([
      5, 5
    ]);
    expect(actualSizeIconScale(metrics, { beam: 20 }, 0.5)).toEqual([2, 2]);
  });
});
