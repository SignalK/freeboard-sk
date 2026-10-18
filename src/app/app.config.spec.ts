import { describe, it, expect } from 'vitest';
import { cleanConfig, defaultConfig } from './app.config';
import { TRAIL_DURATION_ALL } from './modules/skstream/track-source';
import { IAppConfig, LegacyAppConfig } from './types';

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

  it('moves vessels.cogLine / headingLineSize into selfLines', () => {
    const cfg = legacyConfig();
    cleanConfig(cfg, {});
    expect(cfg.vessels.selfLines.cog.length).toBe(15);
    expect(cfg.vessels.selfLines.heading.length).toBe(3);
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
    delete cfg.display.nightMode;
    delete cfg.ui.autoNightMode;
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

  it('leaves split view off by default', () => {
    expect(defaultConfig().display.splitView).toBe(false);
  });

  it('turns split view off for a config saved without the setting', () => {
    const cfg: LegacyAppConfig = defaultConfig();
    delete cfg.display.splitView;
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
    delete cfg.display.plugins;
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
    delete cfg.vessels.trailResolutionApplied;
    cfg.vessels.trailResolution.next23 = '1m';
    cfg.vessels.trailResolution.beyond24 = '5m';
    cleanConfig(cfg, {});
    expect(cfg.vessels.trailResolution.next23).toBe('5s');
    expect(cfg.vessels.trailResolution.beyond24).toBe('10s');
    expect(cfg.vessels.trailResolutionApplied).toBe(true);
  });

  it('keeps trail resolutions the user changed', () => {
    const cfg: LegacyAppConfig = defaultConfig();
    delete cfg.vessels.trailResolutionApplied;
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
