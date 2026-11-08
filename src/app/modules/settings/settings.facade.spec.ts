import { describe, it, expect } from 'vitest';
import { SettingsFacade } from './settings.facade';
import { defaultConfig } from 'src/app/app.config';
import type { AppFacade } from 'src/app/app.facade';
import type { SignalKClient } from 'signalk-client-angular';

describe('SettingsFacade.settings', () => {
  it('follows a config loaded after the facade was created', () => {
    const app = { config: defaultConfig(), data: {} };
    const facade = new SettingsFacade(
      app as unknown as AppFacade,
      {} as SignalKClient
    );
    const loaded = defaultConfig();
    app.config = loaded;

    facade.settings.vessels.windVectors = !loaded.vessels.windVectors;

    expect(facade.settings).toBe(loaded);
    expect(app.config.vessels.windVectors).toBe(
      facade.settings.vessels.windVectors
    );
  });
});
