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

  it('never shrinks below the selected icon size', () => {
    // 4 m / 0.5 = 8 px long, 2 m / 0.5 = 4 px wide.
    expect(
      actualSizeIconScale(
        { width: 20, height: 40, scale: 1 },
        { lengthOverall: 4, beam: 2 },
        0.5
      )
    ).toEqual([1, 1]);
  });

  it('scales both axes together to keep the vessel aspect at the minimum', () => {
    // 10 m / 0.5 = 20 px long, 2 m / 0.5 = 4 px wide; the length is the
    // longest dimension, so both axes grow by 2 to keep it at the floor.
    expect(
      actualSizeIconScale(
        { width: 20, height: 40, scale: 1 },
        { lengthOverall: 10, beam: 2 },
        0.5
      )
    ).toEqual([0.4, 1]);
  });

  it('does not inflate an axis that is already above the minimum', () => {
    // Width would be 4 px (scale 0.2), length 200 px (scale 5).
    expect(
      actualSizeIconScale(
        { width: 20, height: 40, scale: 1 },
        { lengthOverall: 100, beam: 2 },
        0.5
      )
    ).toEqual([0.2, 5]);
  });

  it('leaves an unknown axis at the selected icon scale', () => {
    expect(actualSizeIconScale(metrics, { lengthOverall: 100 }, 0.5)).toEqual([
      0.5, 5
    ]);
    expect(actualSizeIconScale(metrics, { beam: 20 }, 0.5)).toEqual([2, 0.5]);
  });

  it('applies the floor to a lone known dimension', () => {
    expect(actualSizeIconScale(metrics, { lengthOverall: 1 }, 0.5)).toEqual([
      0.5, 0.5
    ]);
  });
});
