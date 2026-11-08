import { describe, it, expect } from 'vitest';
import { SettingsFacade } from './settings.facade';
import { defaultConfig } from 'src/app/app.config';
import type { AppFacade } from 'src/app/app.facade';
import type { SignalKClient } from 'signalk-client-angular';
import type { IAppConfig, Position } from 'src/app/types';

// A config loaded from the server replaces app.config, possibly while the
// settings dialog is open.
describe('SettingsFacade with a config loaded after it was created', () => {
  const setup = () => {
    const saved: IAppConfig[] = [];
    const app = {
      config: defaultConfig(),
      data: { vessels: { self: { position: [0, 0] as Position } } },
      debug: (): void => undefined,
      saveConfig: () => saved.push(structuredClone(app.config))
    };
    const facade = new SettingsFacade(
      app as unknown as AppFacade,
      {} as SignalKClient
    );
    // the dialog reads the position when it opens
    expect(facade.fixedPosition).toEqual([0, 0]);
    const loaded = defaultConfig();
    loaded.vessels.fixedPosition = [24.6, 59.8];
    loaded.vessels.fixedLocationMode = true;
    app.config = loaded;
    return { app, facade, loaded, saved };
  };

  it('edits the loaded config', () => {
    const { facade, loaded } = setup();
    const windVectors = !loaded.vessels.windVectors;
    facade.settings.vessels.windVectors = windVectors;
    expect(facade.settings).toBe(loaded);
    expect(loaded.vessels.windVectors).toBe(windVectors);
  });

  it('keeps the loaded fixed position when saving an unrelated change', () => {
    const { app, facade, saved } = setup();
    facade.settings.vessels.windVectors = true;
    facade.applySettings();
    expect(saved.at(-1)?.vessels.fixedPosition).toEqual([24.6, 59.8]);
    expect(saved.at(-1)?.vessels.windVectors).toBe(true);
    expect(app.data.vessels.self.position).toEqual([24.6, 59.8]);
  });

  it('keeps a fixed position the user entered before the load', () => {
    const app = {
      config: defaultConfig(),
      data: { vessels: { self: { position: [0, 0] as Position } } },
      debug: (): void => undefined,
      saveConfig: (): void => undefined
    };
    const facade = new SettingsFacade(
      app as unknown as AppFacade,
      {} as SignalKClient
    );
    facade.fixedPosition[0] = 10;
    facade.fixedPosition[1] = 20;
    const loaded = defaultConfig();
    loaded.vessels.fixedPosition = [24.6, 59.8];
    app.config = loaded;
    facade.applySettings();
    expect(loaded.vessels.fixedPosition).toEqual([10, 20]);
  });
});
