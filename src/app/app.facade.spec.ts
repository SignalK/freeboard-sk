import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY, of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import '@vitest/web-worker';
import { Map as OlMap } from 'ol';
import { AppFacade } from './app.facade';
import { defaultConfig } from './app.config';
import { LineStyleDash } from './modules/settings/components/linestyle-select.component';
import { SplitViewService } from './modules/map/split-view/split-view.service';
import { SPLIT_VIEW_STORAGE_KEY } from './modules/map/split-view/split-view';
import { APPDATA_CONTEXT, SignalKClient } from 'signalk-client-angular';
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

  // A meteo station or AtoN can publish null for a value it lost; the popover
  // and properties sheet must show the missing-value dash, not "nullK".
  it('shows -- for a missing value', () => {
    const missing: Array<number | null | undefined> = [null, undefined];
    for (const value of missing) {
      expect(app.formatValueForDisplay(value, 'K')).toBe('--');
      expect(
        app.formatValueForDisplay(value, 'm', { category: 'length' })
      ).toBe('--');
    }
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

describe('AppFacade auth token scoping (GHSA-p766-mg92-xc8g)', () => {
  // jsdom serves the spec from http://localhost:3000, which is also the
  // DEV_SERVER the facade resolves to under isDevMode(): a launch with no url
  // params is the everyday same-origin case, and a `host` param is a crafted
  // link pointing the app at some other server.
  const SERVED_FROM = {
    hostname: 'localhost',
    protocol: 'http:',
    port: '3000'
  };
  type Launchable = {
    parseLaunchUrl: (loc: typeof SERVED_FROM & { search: string }) => void;
  };
  const launch = (app: AppFacade, search = '') =>
    (app as unknown as Launchable).parseLaunchUrl({ search, ...SERVED_FROM });

  let app: AppFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    app = TestBed.inject(AppFacade);
    document.cookie = 'sktoken=; max-age=0';
    document.cookie = 'sktokenhost=; max-age=0';
  });

  it('presents a persisted token to the server that issued it', () => {
    app.setAuthToken('issued-by-localhost');
    expect(app.getFBToken()).toBe('issued-by-localhost');
  });

  it('does not present the persisted token to a host named in the url', () => {
    app.setAuthToken('issued-by-localhost');
    launch(app, '?host=evil.example');
    expect(app.hostDef.url).toBe('http://evil.example:3000');
    expect(app.getFBToken()).toBeUndefined();
  });

  it('binds a legacy (unbound) token cookie to the serving origin', () => {
    document.cookie = 'sktoken=legacy';
    expect(app.getFBToken()).toBe('legacy');
    launch(app, '?host=evil.example&port=3000');
    expect(app.getFBToken()).toBeUndefined();
  });

  it('holds a url-supplied token for the session without persisting it', () => {
    launch(app, '?token=from-url');
    expect(app.getFBToken()).toBe('from-url');
    expect(app.hasAuthToken()).toBe(true);
    expect(document.cookie).not.toContain('from-url');
  });

  it('does not let a url-supplied token overwrite the persisted one', () => {
    app.setAuthToken('issued-by-localhost');
    launch(app, '?token=planted');
    expect(document.cookie).toContain('sktoken=issued-by-localhost');
  });

  it('logging in replaces a session token with a persisted one', () => {
    launch(app, '?token=from-url');
    app.setAuthToken('from-login');
    expect(app.getFBToken()).toBe('from-login');
    expect(document.cookie).toContain('sktoken=from-login');
    expect(document.cookie).toContain('sktokenhost=http://localhost:3000');
  });

  it('clearing the token removes both the session and persisted tokens', () => {
    launch(app, '?token=from-url');
    app.setAuthToken(null);
    expect(app.getFBToken()).toBeUndefined();
    expect(app.hasAuthToken()).toBe(false);
    app.setAuthToken('issued-by-localhost');
    app.setAuthToken(null);
    expect(document.cookie).not.toContain('sktoken=');
    expect(app.getFBToken()).toBeUndefined();
  });
});

describe('AppFacade.activePaneFollows', () => {
  beforeEach(() => localStorage.removeItem(SPLIT_VIEW_STORAGE_KEY));
  afterEach(() => localStorage.removeItem(SPLIT_VIEW_STORAGE_KEY));

  it('follows the setting of the chart the map buttons act on', () => {
    TestBed.configureTestingModule({});
    const app = TestBed.inject(AppFacade);
    const split = TestBed.inject(SplitViewService);
    app.uiConfig.update((c) => ({ ...c, mapMove: true }));
    expect(app.activePaneFollows()).toBe(true);

    split.toggle();
    split.setSecondaryMap(new OlMap());
    expect(app.activePaneFollows()).toBe(false);

    split.activate('main');
    expect(app.activePaneFollows()).toBe(true);
  });
});

describe('AppFacade.parseHttpErrorResponse', () => {
  let app: AppFacade;
  let showAlert: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    app = TestBed.inject(AppFacade);
    showAlert = vi.spyOn(app, 'showAlert').mockReturnValue(EMPTY);
  });

  it('asks the user to log in when the server refuses the request', () => {
    app.parseHttpErrorResponse(
      new HttpErrorResponse({ status: 403, error: { message: 'Denied' } })
    );
    expect(showAlert).toHaveBeenCalledWith(
      '403',
      expect.stringContaining('requires authentication')
    );
    expect(showAlert.mock.calls[0][1]).toContain('Denied');
  });

  it('reports a generic failure for an error that is not an HTTP response', () => {
    app.parseHttpErrorResponse(new Error('boom'));
    expect(showAlert).toHaveBeenCalledWith(
      'Error',
      expect.stringContaining('Operation could not be completed!')
    );
  });
});

describe('AppFacade.formatLineDashArray', () => {
  let app: AppFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    app = TestBed.inject(AppFacade);
  });

  it('turns a dash style into its dash pattern', () => {
    expect(app.formatLineDashArray('alt')).toEqual([8, 4, 2, 4]);
    expect(app.formatLineDashArray('none')).toBeNull();
  });

  it('draws a dash style saved by a later release as a solid line', () => {
    expect(app.formatLineDashArray('later-style' as LineStyleDash)).toBeNull();
  });
});

describe('AppFacade.loadUserConfigfromServer', () => {
  const setup = (serverSettings: object) => {
    const client = {
      get: vi.fn(() => EMPTY),
      setAppId: vi.fn(),
      setAppVersion: vi.fn(),
      isLoggedIn: vi.fn(() => of(true)),
      appDataGet: vi.fn(() => of(serverSettings)),
      appDataSet: vi.fn(() => EMPTY),
      api: { get: vi.fn(() => EMPTY) }
    };
    TestBed.configureTestingModule({
      providers: [{ provide: SignalKClient, useValue: client }]
    });
    return { app: TestBed.inject(AppFacade), client };
  };

  it('keeps the local settings when the server holds none', async () => {
    const { app, client } = setup({});
    app.config.ui.mapNorthUp = false;

    await expect(app.loadUserConfigfromServer()).resolves.toBe(false);

    expect(app.config.ui.mapNorthUp).toBe(false);
    expect(client.appDataSet).not.toHaveBeenCalled();
  });

  it('keeps the local settings when the server holds something else', async () => {
    for (const stored of [
      'settings',
      [1, 2],
      null,
      { units: {} },
      { units: {}, map: 'chart' },
      { units: {}, map: {} },
      { units: { speed: 'kn' }, map: { zoomLevel: '5' } },
      { ui: { mapNorthUp: true } }
    ]) {
      TestBed.resetTestingModule();
      const { app } = setup(stored as unknown as object);
      app.config.ui.mapNorthUp = false;

      await expect(app.loadUserConfigfromServer()).resolves.toBe(false);

      expect(app.config.ui.mapNorthUp).toBe(false);
    }
  });

  it('applies the settings the server holds', async () => {
    const saved = defaultConfig();
    saved.ui.mapNorthUp = false;
    const { app } = setup(saved);

    await expect(app.loadUserConfigfromServer()).resolves.toBe(true);

    expect(app.config.ui.mapNorthUp).toBe(false);
  });
});

describe('AppFacade global default config', () => {
  const STORED_CONFIG_KEY = 'freeboard_config';

  const setup = (
    loggedIn: boolean,
    stored: { user?: object; global?: object }
  ) => {
    const client = {
      get: vi.fn(() => EMPTY),
      setAppId: vi.fn(),
      setAppVersion: vi.fn(),
      isLoggedIn: vi.fn(() => of(loggedIn)),
      appDataGet: vi.fn((_path: string, context: APPDATA_CONTEXT) =>
        of(
          (context === APPDATA_CONTEXT.GLOBAL ? stored.global : stored.user) ??
            {}
        )
      ),
      appDataSet: vi.fn(() => EMPTY),
      api: { get: vi.fn(() => EMPTY) }
    };
    TestBed.configureTestingModule({
      providers: [{ provide: SignalKClient, useValue: client }]
    });
    return { app: TestBed.inject(AppFacade), client };
  };

  const globalDefaults = () => {
    const cfg = defaultConfig();
    cfg.selections.charts = ['enc'];
    return cfg;
  };

  beforeEach(() => localStorage.removeItem(STORED_CONFIG_KEY));
  afterEach(() => localStorage.removeItem(STORED_CONFIG_KEY));

  it('gives a first-time visitor the global defaults', async () => {
    const { app, client } = setup(false, { global: globalDefaults() });

    await expect(app.loadUserConfigfromServer()).resolves.toBe(true);

    expect(app.config.selections.charts).toEqual(['enc']);
    expect(client.appDataSet).not.toHaveBeenCalled();
  });

  it('keeps the settings a visitor stored in this browser', async () => {
    const own = defaultConfig();
    own.selections.charts = ['mine'];
    localStorage.setItem(STORED_CONFIG_KEY, JSON.stringify(own));
    const { app, client } = setup(false, { global: globalDefaults() });

    await expect(app.loadUserConfigfromServer()).resolves.toBe(false);

    expect(app.config.selections.charts).toEqual(['mine']);
    expect(client.appDataGet).not.toHaveBeenCalled();
  });

  it('keeps the global defaults a visitor started from when they log in', async () => {
    const { app, client } = setup(false, { global: globalDefaults() });
    await app.loadUserConfigfromServer();
    app.config.ui.mapNorthUp = false;
    client.isLoggedIn.mockReturnValue(of(true));

    await expect(app.loadUserConfigfromServer()).resolves.toBe(false);

    expect(app.config.ui.mapNorthUp).toBe(false);
    expect(client.appDataGet).toHaveBeenCalledTimes(2);
  });

  it('gives a user without saved settings the global defaults', async () => {
    const { app } = setup(true, { global: globalDefaults() });

    await expect(app.loadUserConfigfromServer()).resolves.toBe(true);

    expect(app.config.selections.charts).toEqual(['enc']);
  });

  it("leaves a user's settings alone when the server cannot read them", async () => {
    const { app, client } = setup(true, { global: globalDefaults() });
    client.appDataGet.mockImplementation(
      (_path: string, context: APPDATA_CONTEXT) =>
        context === APPDATA_CONTEXT.USER
          ? throwError(() => new Error('offline'))
          : of(globalDefaults())
    );

    await expect(app.loadUserConfigfromServer()).resolves.toBe(false);

    expect(app.config.selections.charts).toEqual(
      defaultConfig().selections.charts
    );
    expect(client.appDataGet).toHaveBeenCalledTimes(1);

    vi.useFakeTimers();
    try {
      app.saveConfigDebounced();
      vi.advanceTimersByTime(1000);
    } finally {
      vi.useRealTimers();
    }
    expect(client.appDataSet).not.toHaveBeenCalled();
  });

  it("prefers the user's saved settings over the global defaults", async () => {
    const user = defaultConfig();
    user.selections.charts = ['mine'];
    const { app, client } = setup(true, {
      user,
      global: globalDefaults()
    });

    await expect(app.loadUserConfigfromServer()).resolves.toBe(true);

    expect(app.config.selections.charts).toEqual(['mine']);
    expect(client.appDataGet).toHaveBeenCalledTimes(1);
  });

  it('stores nothing in this browser before the server was asked', async () => {
    const { app } = setup(false, {});

    app.saveConfig();
    expect(localStorage.getItem(STORED_CONFIG_KEY)).toBeNull();

    await app.loadUserConfigfromServer();
    app.saveConfig();
    expect(localStorage.getItem(STORED_CONFIG_KEY)).not.toBeNull();
  });

  it('leaves the built-in defaults out of this browser until the visitor changes something', async () => {
    vi.useFakeTimers();
    try {
      const { app } = setup(false, {});
      TestBed.tick();
      await app.loadUserConfigfromServer();
      vi.advanceTimersByTime(1000);
      expect(localStorage.getItem(STORED_CONFIG_KEY)).toBeNull();

      app.uiConfig.update((ui) => ({ ...ui, mapNorthUp: false }));
      TestBed.tick();
      vi.advanceTimersByTime(1000);
      expect(localStorage.getItem(STORED_CONFIG_KEY)).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignores global defaults that arrive after a later load applied user settings', async () => {
    const { app, client } = setup(false, {});
    const globalReply = new Subject<object>();
    const user = defaultConfig();
    user.selections.charts = ['mine'];
    client.appDataGet.mockImplementation(
      (_path: string, context: APPDATA_CONTEXT) =>
        context === APPDATA_CONTEXT.GLOBAL ? globalReply : of(user)
    );

    const visitorLoad = app.loadUserConfigfromServer();
    await Promise.resolve();
    client.isLoggedIn.mockReturnValue(of(true));
    await expect(app.loadUserConfigfromServer()).resolves.toBe(true);
    globalReply.next(globalDefaults());

    await expect(visitorLoad).resolves.toBe(false);
    expect(app.config.selections.charts).toEqual(['mine']);
  });

  it('keeps the login state of the latest load', async () => {
    const { app, client } = setup(false, {});
    const firstStatus = new Subject<boolean>();
    client.isLoggedIn.mockReturnValueOnce(firstStatus);

    const firstLoad = app.loadUserConfigfromServer();
    client.isLoggedIn.mockReturnValue(of(true));
    await app.loadUserConfigfromServer();
    firstStatus.next(false);

    await expect(firstLoad).resolves.toBe(false);
    expect(app.isLoggedIn()).toBe(true);
  });

  it('saves a change made before the server was asked once it has been', async () => {
    const { app } = setup(false, {});

    app.config.ui.mapNorthUp = false;
    app.saveConfig();
    expect(localStorage.getItem(STORED_CONFIG_KEY)).toBeNull();

    await app.loadUserConfigfromServer();
    expect(
      JSON.parse(localStorage.getItem(STORED_CONFIG_KEY) ?? '{}').ui.mapNorthUp
    ).toBe(false);
  });

  it('keeps the built-in defaults when the server holds no global defaults', async () => {
    const { app } = setup(false, {});

    await expect(app.loadUserConfigfromServer()).resolves.toBe(false);

    expect(app.config.selections.charts).toEqual(
      defaultConfig().selections.charts
    );
  });
});

describe('AppFacade radar overlay (#1200)', () => {
  const STORED_CONFIG_KEY = 'freeboard_config';

  const setup = (user?: object) => {
    const client = {
      get: vi.fn(() => EMPTY),
      setAppId: vi.fn(),
      setAppVersion: vi.fn(),
      isLoggedIn: vi.fn(() => of(user !== undefined)),
      appDataGet: vi.fn(() => of(user ?? {})),
      appDataSet: vi.fn(() => EMPTY),
      api: { get: vi.fn(() => EMPTY) }
    };
    TestBed.configureTestingModule({
      providers: [{ provide: SignalKClient, useValue: client }]
    });
    return TestBed.inject(AppFacade);
  };

  const storedOverlay = () =>
    JSON.parse(localStorage.getItem(STORED_CONFIG_KEY) ?? '{}').radars?.overlay;

  beforeEach(() => localStorage.removeItem(STORED_CONFIG_KEY));
  afterEach(() => localStorage.removeItem(STORED_CONFIG_KEY));

  it('starts with the radar overlay off', () => {
    expect(setup().uiCtrl().radarLayer).toBe(false);
  });

  it('shows the radar overlay again after a reload when it was left on', () => {
    const saved = defaultConfig();
    saved.radars.overlay = true;
    localStorage.setItem(STORED_CONFIG_KEY, JSON.stringify(saved));

    expect(setup().uiCtrl().radarLayer).toBe(true);
  });

  it("shows the radar overlay when the user's settings on the server have it on", async () => {
    const user = defaultConfig();
    user.radars.overlay = true;
    const app = setup(user);
    expect(app.uiCtrl().radarLayer).toBe(false);

    await expect(app.loadUserConfigfromServer()).resolves.toBe(true);

    expect(app.uiCtrl().radarLayer).toBe(true);
  });

  it('keeps the overlay choice made while the server settings load', async () => {
    const user = defaultConfig();
    user.radars.overlay = true;
    const app = setup(user);

    app.showRadarOverlay(false);
    app.showRadarOverlay(true);
    app.showRadarOverlay(false);
    await expect(app.loadUserConfigfromServer()).resolves.toBe(true);

    expect(app.uiCtrl().radarLayer).toBe(false);
    expect(storedOverlay()).toBe(false);
  });

  it('saves showing and hiding the radar overlay', async () => {
    const app = setup();
    await app.loadUserConfigfromServer();

    app.showRadarOverlay(true);
    expect(app.uiCtrl().radarLayer).toBe(true);
    expect(storedOverlay()).toBe(true);

    app.showRadarOverlay(false);
    expect(app.uiCtrl().radarLayer).toBe(false);
    expect(storedOverlay()).toBe(false);
  });
});
