import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import '@vitest/web-worker';
import { AppFacade } from './app.facade';

describe('AppFacade.formatValueForDisplay', () => {
  let app: AppFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    app = TestBed.inject(AppFacade);
  });

  it('uses the category preset when no path is supplied (speed → kn)', () => {
    expect(app.formatValueForDisplay(1, 'm/s', { precision: 2 })).toBe(
      '1.94kn'
    );
  });

  it('applies a per-path displayUnits override in place of the category preset', () => {
    app.setPathDisplayUnits('environment.wind.speedApparent', {
      category: 'speed',
      targetUnit: 'm/s',
      symbol: 'm/s'
    });
    expect(
      app.formatValueForDisplay(1, 'm/s', {
        path: 'environment.wind.speedApparent',
        precision: 1
      })
    ).toBe('1.0m/s');
  });

  it('omits the symbol when noSymbol is set on a per-path override', () => {
    app.setPathDisplayUnits('navigation.speedOverGround', {
      category: 'speed',
      targetUnit: 'm/s',
      symbol: 'm/s'
    });
    expect(
      app.formatValueForDisplay(1, 'm/s', {
        path: 'navigation.speedOverGround',
        noSymbol: true
      })
    ).toBe('1.0');
  });

  it('derives the symbol from the target unit when the override omits one', () => {
    app.setPathDisplayUnits('environment.wind.speedTrue', {
      category: 'speed',
      targetUnit: 'km/h'
    });
    expect(
      app.formatValueForDisplay(1, 'm/s', {
        path: 'environment.wind.speedTrue',
        precision: 1
      })
    ).toBe('3.6km/h');
  });

  it('falls back to the category preset when the override target unit is unknown', () => {
    app.setPathDisplayUnits('some.path', {
      category: 'speed',
      targetUnit: 'not-a-unit',
      symbol: 'zz'
    });
    const withPath = app.formatValueForDisplay(1, 'm/s', {
      path: 'some.path',
      precision: 2
    });
    expect(withPath).toBe(
      app.formatValueForDisplay(1, 'm/s', { precision: 2 })
    );
  });

  it('uses the category preset for a path that has no override', () => {
    expect(
      app.formatValueForDisplay(1, 'm/s', {
        path: 'navigation.speedThroughWater',
        precision: 2
      })
    ).toBe('1.94kn');
  });

  it('formats a ratio override like the category preset (0-1 → %)', () => {
    app.setPathDisplayUnits('tanks.fuel.0.currentLevel', {
      category: 'percentage',
      targetUnit: 'percent',
      symbol: '%'
    });
    const opts = { path: 'tanks.fuel.0.currentLevel', precision: 1 };
    expect(app.formatValueForDisplay(0.5, 'ratio', opts)).toBe(
      app.formatValueForDisplay(0.5, 'ratio', { precision: 1 })
    );
    expect(app.formatValueForDisplay(0.5, 'ratio', opts)).toBe('50.0%');
  });

  it('shows an out-of-range ratio override raw, matching the preset', () => {
    app.setPathDisplayUnits('tanks.fuel.0.currentLevel', {
      category: 'percentage',
      targetUnit: 'percent',
      symbol: '%'
    });
    expect(
      app.formatValueForDisplay(1.5, 'ratio', {
        path: 'tanks.fuel.0.currentLevel'
      })
    ).toBe(app.formatValueForDisplay(1.5, 'ratio', {}));
  });
});
