import { describe, it, expect } from 'vitest';
import { cleanConfig, defaultConfig, isSavedConfig } from './app.config';
import { TRAIL_DURATION_ALL } from './modules/skstream/track-source';
import { IAppConfig, LegacyAppConfig } from './types';
import savedConfigs from './app.config.saved.json';

/** Removes a setting, as from a config saved before the setting existed. */
function unset<T>(section: T, key: keyof T) {
  delete (section as Partial<T>)[key];
}

/**
 * A stored config from an earlier release: `defaultConfig()` with the
 * pre-migration values and fields that `cleanConfig()` upgrades.
 */
const legacyConfig = (): LegacyAppConfig => {
  const cfg: LegacyAppConfig = defaultConfig();
  cfg.units.depth = 'ft';
  cfg.units.speed = 'msec';
  cfg.units.distance = 'm';
  delete cfg.vessels.selfLines;
  cfg.vessels.cogLine = 15;
  cfg.vessels.headingLineSize = 3;
  cfg.plotterExtensions = {
    enabled: ['some-extension'],
    widgets: [
      {
        instanceId: 'a',
        extension: 'x',
        widget: 'w',
        corner: 'tl',
        col: 0,
        row: 0
      },
      {
        instanceId: 'b',
        extension: 'x',
        widget: 'w',
        corner: 'bl',
        col: 1,
        row: 0
      },
      {
        instanceId: 'c',
        extension: 'x',
        widget: 'w',
        anchor: 'ct',
        col: 0,
        row: 1
      },
      { instanceId: 'd', extension: 'x', widget: 'w', col: 0, row: 0 }
    ]
  };
  cfg.selections.notes = ['n1'];
  return cfg;
};

describe('cleanConfig() legacy migration', () => {
  it.each<['depth' | 'speed' | 'distance', string, string]>([
    ['depth', 'ft', 'foot'],
    ['speed', 'msec', 'm/s'],
    ['speed', 'kmh', 'km/h'],
    ['distance', 'm', 'kilometer'],
    ['distance', 'ft', 'naut-mile']
  ])('maps legacy units.%s %s -> %s', (unit, legacy, current) => {
    const cfg: LegacyAppConfig = defaultConfig();
    Object.assign(cfg.units, { [unit]: legacy });
    cleanConfig(cfg, {});
    expect(cfg.units[unit]).toBe(current);
  });

  it('leaves current unit values untouched', () => {
    const cfg: LegacyAppConfig = defaultConfig();
    cfg.units.depth = 'm';
    cfg.units.speed = 'kn';
    cfg.units.distance = 'naut-mile';
    cleanConfig(cfg, {});
    expect(cfg.units.depth).toBe('m');
    expect(cfg.units.speed).toBe('kn');
    expect(cfg.units.distance).toBe('naut-mile');
  });

  it('defaults the actual-size vessel icon off, keeping a stored choice', () => {
    const cfg = legacyConfig();
    delete (cfg.vessels as Partial<IAppConfig['vessels']>).iconActualSize;
    cleanConfig(cfg, {});
    expect(cfg.vessels.iconActualSize).toBe(false);

    cfg.vessels.iconActualSize = true;
    cleanConfig(cfg, {});
    expect(cfg.vessels.iconActualSize).toBe(true);
  });

  it('defaults the own-vessel icon type, keeping a stored choice', () => {
    const cfg = legacyConfig();
    delete (cfg.vessels as Partial<IAppConfig['vessels']>).iconType;
    cleanConfig(cfg, {});
    expect(cfg.vessels.iconType).toBe('classic');

    cfg.vessels.iconType = 'catamaran';
    cleanConfig(cfg, {});
    expect(cfg.vessels.iconType).toBe('catamaran');
  });

  it('moves vessels.cogLine / headingLineSize into selfLines', () => {
    const cfg = legacyConfig();
    cleanConfig(cfg, {});
    expect(cfg.vessels.selfLines?.cog.length).toBe(15);
    expect(cfg.vessels.selfLines?.heading.length).toBe(3);
    expect(cfg.vessels).not.toHaveProperty('cogLine');
    expect(cfg.vessels).not.toHaveProperty('headingLineSize');
  });

  it('migrates the early plotterExtensions shape', () => {
    const cfg = legacyConfig();
    cleanConfig(cfg, {});
    expect(cfg.plotterExtensions).not.toHaveProperty('enabled');
    // `corner` becomes `anchor` ('tl' -> 'tr'); a widget without either is dropped
    expect(cfg.plotterExtensions.widgets).toEqual([
      {
        instanceId: 'a',
        extension: 'x',
        widget: 'w',
        anchor: 'tr',
        col: 0,
        row: 0
      },
      {
        instanceId: 'b',
        extension: 'x',
        widget: 'w',
        anchor: 'bl',
        col: 1,
        row: 0
      },
      {
        instanceId: 'c',
        extension: 'x',
        widget: 'w',
        anchor: 'ct',
        col: 0,
        row: 1
      }
    ]);
  });

  it('drops a plotter extension widget entry that is not an object', () => {
    const cfg = legacyConfig();
    const widgets = cfg.plotterExtensions.widgets as unknown[];
    widgets.push(null, 'x');
    cleanConfig(cfg, {});
    expect(cfg.plotterExtensions.widgets?.map((w) => w.instanceId)).toEqual([
      'a',
      'b',
      'c'
    ]);
  });

  it.each([
    [true, 'server'],
    [false, 'auto']
  ])(
    'maps legacy vessels.trailFromServer %s -> trailSource %s',
    (legacy, current) => {
      const cfg: LegacyAppConfig = defaultConfig();
      delete cfg.vessels.trailSource;
      cfg.vessels.trailFromServer = legacy;
      cleanConfig(cfg, {});
      expect(cfg.vessels.trailSource).toBe(current);
      expect(cfg.vessels).not.toHaveProperty('trailFromServer');
    }
  );

  it('keeps a trail source the user already chose', () => {
    const cfg: LegacyAppConfig = defaultConfig();
    cfg.vessels.trailSource = 'local';
    cleanConfig(cfg, {});
    expect(cfg.vessels.trailSource).toBe('local');
  });

  it('keeps a trail source a later release added', () => {
    const cfg: LegacyAppConfig = defaultConfig();
    (cfg.vessels.trailSource as string) = 'later-source';
    cleanConfig(cfg, {});
    expect(cfg.vessels.trailSource).toBe('later-source');
  });

  it('defaults the trail source to auto', () => {
    expect(defaultConfig().vessels.trailSource).toBe('auto');
  });

  it("follows the server's day/night mode by default", () => {
    const cfg = defaultConfig();
    expect(cfg.display.nightMode).toBe(true);
    expect(cfg.ui.autoNightMode).toBe(true);
  });

  it('follows the server night mode for a config saved without the setting', () => {
    const cfg: LegacyAppConfig = defaultConfig();
    unset(cfg.display, 'nightMode');
    unset(cfg.ui, 'autoNightMode');
    cleanConfig(cfg, {});
    expect(cfg.display.nightMode).toBe(true);
    expect(cfg.ui.autoNightMode).toBe(true);
  });

  it('keeps night mode off once the user turned it off', () => {
    const cfg = defaultConfig();
    cfg.display.nightMode = false;
    cfg.ui.autoNightMode = false;
    cleanConfig(cfg, {});
    expect(cfg.display.nightMode).toBe(false);
    expect(cfg.ui.autoNightMode).toBe(false);
  });

  it("follows the server's unit preferences by default", () => {
    expect(defaultConfig().units.useServerPrefs).toBe(true);
  });

  it('keeps local units for a config saved before the setting existed', () => {
    const cfg: LegacyAppConfig = defaultConfig();
    unset(cfg.units, 'useServerPrefs');
    cleanConfig(cfg, {});
    expect(cfg.units.useServerPrefs).toBe(false);
  });

  it('keeps local units once the user turned server preferences off', () => {
    const cfg = defaultConfig();
    cfg.units.useServerPrefs = false;
    cleanConfig(cfg, {});
    expect(cfg.units.useServerPrefs).toBe(false);
  });

  it('leaves split view off by default', () => {
    expect(defaultConfig().display.splitView).toBe(false);
  });

  it('turns split view off for a config saved without the setting', () => {
    const cfg: LegacyAppConfig = defaultConfig();
    unset(cfg.display, 'splitView');
    cleanConfig(cfg, {});
    expect(cfg.display.splitView).toBe(false);
  });

  it('keeps split view on once the user turned it on', () => {
    const cfg = defaultConfig();
    cfg.display.splitView = true;
    cleanConfig(cfg, {});
    expect(cfg.display.splitView).toBe(true);
  });

  it('restores the instruments settings for a config saved without them', () => {
    const cfg: LegacyAppConfig = defaultConfig();
    unset(cfg.display, 'plugins');
    cleanConfig(cfg, {});
    expect(cfg.display.plugins).toEqual(defaultConfig().display.plugins);
  });

  it('keeps the instruments app the user chose', () => {
    const cfg = defaultConfig();
    cfg.display.plugins.instruments = '/@mxtommy/kip';
    cfg.display.plugins.favourites = ['/@mxtommy/kip'];
    cleanConfig(cfg, {});
    expect(cfg.display.plugins.instruments).toBe('/@mxtommy/kip');
    expect(cfg.display.plugins.favourites).toEqual(['/@mxtommy/kip']);
  });

  it('displays the vessel trail by default', () => {
    expect(defaultConfig().vessels.trail).toBe(true);
  });

  it('shows the last 24 hours of trail by default', () => {
    expect(defaultConfig().vessels.trailDuration).toBe(24);
  });

  it('keeps a trail length the user already chose', () => {
    const cfg: LegacyAppConfig = defaultConfig();
    cfg.vessels.trailDuration = TRAIL_DURATION_ALL;
    cleanConfig(cfg, {});
    expect(cfg.vessels.trailDuration).toBe(TRAIL_DURATION_ALL);
  });

  it('samples the older trail finely by default', () => {
    const r = defaultConfig().vessels.trailResolution;
    expect([r.next23, r.beyond24]).toEqual(['5s', '10s']);
  });

  it('moves an install still on the old trail resolutions once', () => {
    const cfg: LegacyAppConfig = defaultConfig();
    unset(cfg.vessels, 'trailResolutionApplied');
    cfg.vessels.trailResolution.next23 = '1m';
    cfg.vessels.trailResolution.beyond24 = '5m';
    cleanConfig(cfg, {});
    expect(cfg.vessels.trailResolution.next23).toBe('5s');
    expect(cfg.vessels.trailResolution.beyond24).toBe('10s');
    expect(cfg.vessels.trailResolutionApplied).toBe(true);
  });

  it('keeps trail resolutions the user changed', () => {
    const cfg: LegacyAppConfig = defaultConfig();
    unset(cfg.vessels, 'trailResolutionApplied');
    cfg.vessels.trailResolution.next23 = '30s';
    cfg.vessels.trailResolution.beyond24 = '15m';
    cleanConfig(cfg, {});
    expect(cfg.vessels.trailResolution.next23).toBe('30s');
    expect(cfg.vessels.trailResolution.beyond24).toBe('15m');
  });

  it('keeps a coarse trail resolution chosen after the move', () => {
    const cfg: LegacyAppConfig = defaultConfig();
    cfg.vessels.trailResolution.next23 = '1m';
    cfg.vessels.trailResolution.beyond24 = '5m';
    cleanConfig(cfg, {});
    expect(cfg.vessels.trailResolution.next23).toBe('1m');
    expect(cfg.vessels.trailResolution.beyond24).toBe('5m');
  });

  it('lists every chart by default, with the in-view filter off', () => {
    expect(defaultConfig().selections.chartsInViewOnly).toBe(false);
  });

  it('turns the chart list in-view filter off for a config saved without it', () => {
    const cfg: LegacyAppConfig = defaultConfig();
    delete cfg.selections.chartsInViewOnly;
    cleanConfig(cfg, {});
    expect(cfg.selections.chartsInViewOnly).toBe(false);
  });

  it('keeps the chart list in-view filter on once the user turned it on', () => {
    const cfg: LegacyAppConfig = defaultConfig();
    cfg.selections.chartsInViewOnly = true;
    cleanConfig(cfg, {});
    expect(cfg.selections.chartsInViewOnly).toBe(true);
  });

  it('drops the legacy selections.notes section', () => {
    const cfg = legacyConfig();
    cleanConfig(cfg, {});
    expect(cfg.selections).not.toHaveProperty('notes');
  });

  it('produces a config with every default key present', () => {
    const cfg = legacyConfig();
    cleanConfig(cfg, {});
    const current: IAppConfig = defaultConfig();
    expect(Object.keys(cfg).sort()).toEqual(Object.keys(current).sort());
  });
});

/**
 * Configs as earlier releases saved them, rebuilt from the git history of
 * each release's `defaultConfig()` and `cleanConfig()`: a fresh install of
 * every release since 2.17, configs upgraded release by release, and 2.13 /
 * 2.15 configs from before the 2.17 settings layout. `cleaned` holds what
 * `cleanConfig()` made of each before it was built on the settings schema.
 */
describe('cleanConfig() on configs saved by earlier releases', () => {
  for (const { savedBy, saved, cleaned } of savedConfigs.configs) {
    it(`gives the same settings as before for ${savedBy}`, () => {
      const cfg = structuredClone(saved) as unknown as LegacyAppConfig;
      cleanConfig(cfg, {});
      expect(cfg).toEqual(
        savedConfigs.cleaned[cleaned as keyof typeof savedConfigs.cleaned]
      );
    });
  }
});

describe('isSavedConfig()', () => {
  it('accepts the config of every earlier release', () => {
    for (const { saved } of savedConfigs.configs) {
      expect(isSavedConfig(saved)).toBe(true);
    }
    expect(isSavedConfig(defaultConfig())).toBe(true);
  });
});

describe('cleanConfig() defaults', () => {
  it('leaves a fresh install unchanged', () => {
    const cfg: LegacyAppConfig = defaultConfig();
    cleanConfig(cfg, {});
    expect(cfg).toEqual(defaultConfig());
  });

  it('hands out a separate copy of the defaults each time', () => {
    const cfg = defaultConfig();
    cfg.selections.charts.push('my-chart');
    cfg.map.s57Options.otherLayers.pop();
    expect(defaultConfig().selections.charts).toEqual([
      'openstreetmap',
      'openseamap'
    ]);
    expect(defaultConfig().map.s57Options.otherLayers).toHaveLength(7);
  });

  it('fills a setting saved without a value', () => {
    const cfg: LegacyAppConfig = defaultConfig();
    unset(cfg.ui, 'mapNorthUp');
    unset(cfg.vessels, 'aisCogLine');
    cleanConfig(cfg, {});
    expect(cfg.ui.mapNorthUp).toBe(true);
    expect(cfg.vessels.aisCogLine).toBe(10);
  });

  it('fills a whole section saved without it', () => {
    const cfg: LegacyAppConfig = defaultConfig();
    unset(cfg, 'units');
    unset(cfg, 'map');
    cleanConfig(cfg, {});
    expect(cfg.units).toEqual(defaultConfig().units);
    expect(cfg.map).toEqual(defaultConfig().map);
  });

  it('puts back the default of a setting stored with the wrong type', () => {
    const cfg = defaultConfig() as unknown as {
      ui: { mapNorthUp: unknown };
      vessels: { aisCogLine: unknown; fixedPosition: unknown };
      units: { distance: unknown };
      display: unknown;
    };
    cfg.ui.mapNorthUp = 'false';
    cfg.vessels.aisCogLine = null;
    cfg.vessels.fixedPosition = [1, 'x'];
    cfg.units.distance = 3;
    cfg.display = 'none';
    cleanConfig(cfg as unknown as LegacyAppConfig, {});
    const current = cfg as unknown as IAppConfig;
    const defaults = defaultConfig();
    expect(current.ui.mapNorthUp).toBe(true);
    expect(current.vessels.aisCogLine).toBe(10);
    expect(current.vessels.fixedPosition).toEqual([0, 0]);
    expect(current.units.distance).toBe('kilometer');
    expect(current.display).toEqual(defaults.display);
  });

  it('drops only the entries of the wrong type from a list or a per-chart map', () => {
    const cfg = defaultConfig();
    (cfg.selections.charts as unknown[]) = ['a', null, 'b'];
    (cfg.selections.chartOpacity as Record<string, unknown>) = {
      a: 0.5,
      b: 'x'
    };
    cleanConfig(cfg, {});
    expect(cfg.selections.charts).toEqual(['a', 'b']);
    expect(cfg.selections.chartOpacity).toEqual({ a: 0.5 });
  });

  it('drops only the entries of the wrong type from a list that may be null', () => {
    const cfg = defaultConfig();
    (cfg.selections.tracks as unknown[]) = ['a', null, 'b'];
    (cfg.selections.aisTargets as unknown[]) = [1, 'c'];
    cfg.selections.infolayers = null;
    cleanConfig(cfg, {});
    expect(cfg.selections.tracks).toEqual(['a', 'b']);
    expect(cfg.selections.aisTargets).toEqual(['c']);
    expect(cfg.selections.infolayers).toBeNull();
  });

  it('keeps settings and choices this release does not know', () => {
    const cfg = defaultConfig() as IAppConfig & { later?: unknown };
    cfg.later = { kept: true };
    (cfg.ui as Record<string, unknown>).laterSetting = 1;
    (cfg.display.fab as string) = 'later-choice';
    cleanConfig(cfg, {});
    expect(cfg.later).toEqual({ kept: true });
    expect((cfg.ui as Record<string, unknown>).laterSetting).toBe(1);
    expect(cfg.display.fab).toBe('later-choice');
  });

  it('keeps an optional setting only while it has the right type', () => {
    const cfg = defaultConfig();
    cfg.radars.deviceId = 'radar-1';
    cleanConfig(cfg, {});
    expect(cfg.radars.deviceId).toBe('radar-1');
    (cfg.radars as { deviceId?: unknown }).deviceId = 5;
    cleanConfig(cfg, {});
    expect(cfg.radars).not.toHaveProperty('deviceId');
  });
});

describe('cleanConfig() for sections saved before a setting existed', () => {
  it('takes the chart depth unit and length unit from the depth unit', () => {
    const cfg: LegacyAppConfig = defaultConfig();
    cfg.units.depth = 'ft';
    unset(cfg.units, 'length');
    unset(cfg.map.s57Options, 'depthUnit');
    cleanConfig(cfg, {});
    expect(cfg.units.length).toBe('foot');
    expect(cfg.map.s57Options.depthUnit).toBe('foot');
  });

  it('keeps metres for length when the depth unit is fathoms', () => {
    const cfg: LegacyAppConfig = defaultConfig();
    cfg.units.depth = 'fathom';
    unset(cfg.units, 'length');
    cleanConfig(cfg, {});
    expect(cfg.units.length).toBe('m');
  });

  it('gives selections saved without chart order, tracks or info layers empty lists', () => {
    const cfg: LegacyAppConfig = defaultConfig();
    unset(cfg.selections, 'chartOrder');
    unset(cfg.selections, 'tracks');
    unset(cfg.selections, 'infolayers');
    cleanConfig(cfg, {});
    expect(cfg.selections.chartOrder).toEqual([]);
    expect(cfg.selections.tracks).toEqual([]);
    expect(cfg.selections.infolayers).toEqual([]);
  });

  it('keeps note groups free of a position for a config saved without resources', () => {
    const cfg: LegacyAppConfig = defaultConfig();
    unset(cfg, 'resources');
    cleanConfig(cfg, {});
    expect(cfg.resources.notes.groupRequiresPosition).toBe(false);
    expect(cfg.resources.video.url).toBe('');
  });

  it('starts radars saved without the section with no device chosen', () => {
    const cfg: LegacyAppConfig = defaultConfig();
    unset(cfg, 'radars');
    cleanConfig(cfg, {});
    expect(cfg.radars).toEqual({ deviceId: '', opacity: 1, rings: true });
  });
});
