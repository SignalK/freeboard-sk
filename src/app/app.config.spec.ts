import { describe, it, expect } from 'vitest';
import { cleanConfig, defaultConfig } from './app.config';
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
  it.each([
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

  it('displays the vessel trail by default', () => {
    expect(defaultConfig().vessels.trail).toBe(true);
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
