import { describe, expect, it } from 'vitest';
import { Convert } from './convert';
import { magneticToTrue, trueWindDirection } from './true-bearing';

const rad = Convert.degreesToRadians;
const deg = Convert.radiansToDegrees;

describe('magneticToTrue (#858)', () => {
  it('adds an easterly (positive) variation', () => {
    expect(deg(magneticToTrue(rad(17.2), rad(12.8)))).toBeCloseTo(30, 9);
  });

  it('subtracts a westerly (negative) variation', () => {
    expect(deg(magneticToTrue(rad(40), rad(-10)))).toBeCloseTo(30, 9);
  });

  it('wraps into 0..360', () => {
    expect(deg(magneticToTrue(rad(355), rad(12.8)))).toBeCloseTo(7.8, 9);
    expect(deg(magneticToTrue(rad(5), rad(-10)))).toBeCloseTo(355, 9);
  });

  it('is null without a magnetic value or a variation', () => {
    expect(magneticToTrue(null, rad(12.8))).toBeNull();
    expect(magneticToTrue(rad(17), null)).toBeNull();
    expect(magneticToTrue(rad(17), undefined)).toBeNull();
  });
});

describe('trueWindDirection (#858)', () => {
  it('uses reported true wind direction as is', () => {
    const v = {
      wind: { twd: rad(30), mwd: rad(0) },
      magneticVariation: rad(5)
    };
    expect(trueWindDirection(v)).toBe(rad(30));
  });

  it('derives true wind from magnetic wind and variation', () => {
    const v = {
      wind: { twd: null, mwd: rad(17.2) },
      magneticVariation: rad(12.8)
    };
    expect(deg(trueWindDirection(v))).toBeCloseTo(30, 9);
  });

  it('is null with only magnetic wind and no variation', () => {
    const v = { wind: { twd: null, mwd: rad(17.2) }, magneticVariation: null };
    expect(trueWindDirection(v)).toBeNull();
  });
});
