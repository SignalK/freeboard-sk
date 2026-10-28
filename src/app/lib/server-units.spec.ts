import { describe, expect, it } from 'vitest';
import { serverUnit } from './server-units';
import { SKServerUnitPrefs } from '../types';

const prefs = (category: string, targetUnit: string): SKServerUnitPrefs => ({
  name: 'preset',
  categories: {
    [category]: { baseUnit: '', targetUnit, displayFormat: '0.0', symbol: '' }
  }
});

describe('serverUnit', () => {
  it('returns the server unit when the setting offers it', () => {
    expect(serverUnit(prefs('distance', 'naut-mile'), 'distance')).toBe(
      'naut-mile'
    );
    expect(serverUnit(prefs('speed', 'mph'), 'speed')).toBe('mph');
  });

  it('ignores a server unit the setting does not offer', () => {
    expect(serverUnit(prefs('distance', 'mile'), 'distance')).toBeUndefined();
  });

  it('ignores a category the server does not publish', () => {
    expect(serverUnit(prefs('speed', 'kn'), 'depth')).toBeUndefined();
    expect(serverUnit(undefined, 'depth')).toBeUndefined();
  });
});
