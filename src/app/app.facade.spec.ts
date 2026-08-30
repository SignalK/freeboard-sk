import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import '@vitest/web-worker';
import { AppFacade } from './app.facade';
import { SignalKClient } from 'signalk-client-angular';
import { version as PACKAGE_VERSION } from '../../package.json';

describe('AppFacade app version (#458)', () => {
  it('reports the version from package.json, not a hardcoded literal', () => {
    TestBed.configureTestingModule({});
    const app = TestBed.inject(AppFacade);
    // The About box renders app.version; it must track `npm version` bumps.
    expect(app.version).toBe(PACKAGE_VERSION);
  });
});

describe('AppFacade.IGNORE_RESOURCES (#514)', () => {
  let app: AppFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    app = TestBed.inject(AppFacade);
  });

  // plotterExtensions and symbols are consumed by dedicated subsystems, not
  // rendered as user-selectable layers — they must be filtered out of the
  // Settings › Resources › Custom Resources selection list.
  it('excludes plotterExtensions and symbols from the custom-resource list', () => {
    expect(app.IGNORE_RESOURCES).toContain('plotterExtensions');
    expect(app.IGNORE_RESOURCES).toContain('symbols');
  });
});

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

describe('AppFacade per-path display units (#304)', () => {
  const windMeta = {
    displayUnits: { category: 'speed', targetUnit: 'm/s', symbol: 'm/s' }
  };

  const mockClient = (getImpl: (url: string) => unknown) => ({
    get: vi.fn(getImpl),
    setAppId: vi.fn(),
    setAppVersion: vi.fn()
  });

  const setup = (getImpl: (url: string) => unknown) => {
    TestBed.configureTestingModule({
      providers: [{ provide: SignalKClient, useValue: mockClient(getImpl) }]
    });
    return TestBed.inject(AppFacade);
  };

  it('caches wind display units from the server when server prefs are on', () => {
    const app = setup((url) =>
      of(url.includes('speedApparent') ? {} : windMeta)
    );
    app.config.units.useServerPrefs = true;
    app.config.units.preferredPaths.tws = 'environment.wind.speedTrue';

    app.refreshPathDisplayUnits();

    expect(
      app.getPathDisplayUnits('environment.wind.speedTrue')?.targetUnit
    ).toBe('m/s');
    // Wind speed now displays in m/s while boat speed stays the preset (kn).
    expect(
      app.formatValueForDisplay(1, 'm/s', {
        path: 'environment.wind.speedTrue'
      })
    ).toBe('1.0m/s');
    expect(app.formatValueForDisplay(1, 'm/s', {})).toBe('1.9kn');
  });

  it('clears the cache and does not fetch when server prefs are off', () => {
    const client = mockClient(() => of(windMeta));
    TestBed.configureTestingModule({
      providers: [{ provide: SignalKClient, useValue: client }]
    });
    const app = TestBed.inject(AppFacade);
    const getSpy = client.get;
    app.setPathDisplayUnits(
      'environment.wind.speedTrue',
      windMeta.displayUnits
    );
    app.config.units.useServerPrefs = false;

    app.refreshPathDisplayUnits();

    expect(getSpy).not.toHaveBeenCalled();
    expect(
      app.getPathDisplayUnits('environment.wind.speedTrue')
    ).toBeUndefined();
  });

  it('evicts a cached override when the server no longer publishes one', () => {
    const app = setup(() => of({}));
    app.config.units.useServerPrefs = true;
    app.setPathDisplayUnits(
      'environment.wind.speedTrue',
      windMeta.displayUnits
    );

    app.fetchPathDisplayUnits('environment.wind.speedTrue');

    expect(
      app.getPathDisplayUnits('environment.wind.speedTrue')
    ).toBeUndefined();
  });

  it('does not re-add an override if server prefs were turned off mid-fetch', () => {
    const app = setup(() => of(windMeta));
    app.setPathDisplayUnits(
      'environment.wind.speedTrue',
      windMeta.displayUnits
    );
    // Simulate the toggle flipping off before the (synchronous mock) response.
    app.config.units.useServerPrefs = false;

    app.fetchPathDisplayUnits('environment.wind.speedTrue');

    expect(
      app.getPathDisplayUnits('environment.wind.speedTrue')
    ).toBeUndefined();
  });
});

describe('AppFacade nautical-mile short-distance formatting (#474)', () => {
  let app: AppFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    app = TestBed.inject(AppFacade);
    app.config.units.distance = 'naut-mile';
  });

  // A distance below 0.5 NM (500 m ≈ 0.27 NM) must drop to the length unit and
  // show the real value — the regression floored it to "0m" by displaying the
  // sub-1 nautical-mile number under a metre symbol.
  it('shows sub-0.5 NM distances granularly in the length unit, not a floored 0', () => {
    app.config.units.length = 'm';
    expect(app.formatValueForDisplay(500, 'm')).toBe('500m');
  });

  it('honours a feet length preference for sub-0.5 NM distances', () => {
    app.config.units.length = 'foot';
    expect(app.formatValueForDisplay(500, 'm')).toBe('1640ft');
  });

  // At/above 0.5 NM (2000 m ≈ 1.08 NM) the value stays in nautical miles.
  it('shows distances at or above 0.5 NM in nautical miles', () => {
    app.config.units.length = 'm';
    expect(app.formatValueForDisplay(2000, 'm')).toBe('1.1nmi');
  });
});

describe('AppFacade.calcMapCenter pending rotation (#715)', () => {
  // A viewport one "unit" square about [0, 0]; the exact ground distances do
  // not matter, only that the offset resolves to a direction on the ground.
  const setup = () => {
    TestBed.configureTestingModule({});
    const app = TestBed.inject(AppFacade);
    app.config.map.center = [0, 0];
    app.mapExtent.set([-0.01, -0.01, 0.01, 0.01]);
    app.mapViewTopCenter.set([0, 0.01]);
    app.mapViewRightCenter.set([0.01, 0]);
    // What move-end last reported — the map has not rotated yet as far as the
    // app-level signal is concerned.
    app.mapViewRotation.set(0);
    // Pure "look ahead" offset: map centre half a screen up from the vessel.
    app.config.map.centerOffset = { x: 0, y: 50 };
    // `active` is null until a vessel is selected; follow mode tracks self.
    app.data.vessels.active = app.data.vessels.self;
    app.data.vessels.active.position = [0, 0];
    return app;
  };

  it('resolves a screen-up offset to due north when the view is unrotated', () => {
    const [lon, lat] = setup().calcMapCenter();
    expect(lat).toBeGreaterThan(0);
    expect(Math.abs(lon)).toBeLessThan(1e-6);
  });

  // The regression. rotateMap() sets the map's rotation and centerVessel() runs
  // in the SAME render, but app.mapViewRotation is not refreshed until OL fires
  // move-end. Resolving against the stale signal puts the centre due north while
  // the view renders rotated a quarter turn, so the vessel lands rotated off its
  // screen-fixed spot. Passing the pending rotation must win over the signal.
  it('resolves against the pending rotation, not the stale move-end rotation', () => {
    const app = setup();
    const stale = app.calcMapCenter();
    // Screen-up is world-west once the view is rotated a quarter turn.
    const [lon, lat] = app.calcMapCenter(true, 0, Math.PI / 2);
    expect(lon).toBeLessThan(0);
    expect(Math.abs(lat)).toBeLessThan(1e-6);
    expect([lon, lat]).not.toEqual(stale);
  });

  it('still falls back to the move-end rotation when none is supplied', () => {
    const app = setup();
    app.mapViewRotation.set(Math.PI / 2);
    const [lon, lat] = app.calcMapCenter();
    expect(lon).toBeLessThan(0);
    expect(Math.abs(lat)).toBeLessThan(1e-6);
  });
});
