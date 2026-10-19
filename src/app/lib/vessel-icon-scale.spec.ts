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

  it('fills each axis to the reported length and beam', () => {
    // 100 m / 0.5 = 200 px long, 20 m / 0.5 = 40 px wide.
    expect(
      actualSizeIconScale(metrics, { lengthOverall: 100, beam: 20 }, 0.5)
    ).toEqual([2, 5]);
  });

  it('does not preserve the icon aspect ratio', () => {
    // The same vessel dimensions must give the same scale on a wide icon.
    expect(
      actualSizeIconScale(
        { width: 80, height: 10, scale: 0.5 },
        { lengthOverall: 100, beam: 20 },
        0.5
      )
    ).toEqual([0.5, 20]);
  });

  it('uses the actual size even when it is below the selected icon size', () => {
    // 4 m / 0.5 = 8 px long, 2 m / 0.5 = 4 px wide.
    expect(
      actualSizeIconScale(
        { width: 20, height: 40, scale: 1 },
        { lengthOverall: 4, beam: 2 },
        0.5
      )
    ).toEqual([0.2, 0.2]);
  });

  it('leaves an unknown axis at the selected icon scale', () => {
    expect(actualSizeIconScale(metrics, { lengthOverall: 100 }, 0.5)).toEqual([
      0.5, 5
    ]);
    expect(actualSizeIconScale(metrics, { beam: 20 }, 0.5)).toEqual([2, 0.5]);
  });
});
