import { describe, expect, it } from 'vitest';
import { isMobDestination, mobBox, mobElapsed } from './mob';

describe('mobElapsed', () => {
  const t0 = Date.UTC(2026, 10, 7, 12, 0, 0);

  it('shows minutes and seconds within the first hour', () => {
    expect(mobElapsed(t0, t0)).toBe('0:00');
    expect(mobElapsed(t0, t0 + 65_400)).toBe('1:05');
  });

  it('adds hours from an hour on', () => {
    expect(mobElapsed(t0, t0 + (3600 + 2 * 60 + 3) * 1000)).toBe('1:02:03');
  });

  it('shows no negative time when the clocks disagree', () => {
    expect(mobElapsed(t0, t0 - 5000)).toBe('0:00');
  });
});

describe('mobBox', () => {
  it('is the MOB alone without a vessel position', () => {
    expect(mobBox(null, [178.4, -18.1])).toEqual([178.4, -18.1, 178.4, -18.1]);
  });

  it('holds both the vessel and the MOB', () => {
    expect(mobBox([178.45, -18.15], [178.4, -18.1])).toEqual([
      178.4, -18.15, 178.45, -18.1
    ]);
  });

  it('goes the short way round the antimeridian', () => {
    expect(mobBox([-179.99, -17], [179.99, -17.01])).toEqual([
      179.99, -17.01, -179.99, -17
    ]);
  });
});

describe('isMobDestination', () => {
  it('matches a destination at the MOB position', () => {
    expect(isMobDestination([178.4, -18.1], [178.4, -18.1])).toBe(true);
  });

  it('does not match another destination or none', () => {
    expect(isMobDestination([178.41, -18.1], [178.4, -18.1])).toBe(false);
    expect(isMobDestination(null, [178.4, -18.1])).toBe(false);
  });
});

describe('isMobDestination across the antimeridian', () => {
  it('treats 180 and -180 as the same meridian', () => {
    expect(isMobDestination([-180, -17], [180, -17])).toBe(true);
  });
});
