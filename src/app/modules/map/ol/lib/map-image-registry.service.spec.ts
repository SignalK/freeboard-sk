import { describe, it, expect } from 'vitest';
import { MapImageRegistry } from './map-image-registry.service';

/**
 * `getMeteoIcon` picks the wind-barb glyph for a meteo target by reported wind
 * speed (m/s), falling back to the plain windsock below the first bucket or when
 * no speed is reported (#490). The registry has no Angular dependencies, so a
 * plain `new` suffices.
 */
describe('MapImageRegistry.getMeteoIcon (#490)', () => {
  const reg = new MapImageRegistry();

  it('selects the bucketed barb for a reported speed', () => {
    expect(reg.getMeteoIcon(6).getSrc()).toContain('weatherStation-10.svg');
  });

  it('clamps very high speeds to the maximum barb', () => {
    expect(reg.getMeteoIcon(50).getSrc()).toContain('weatherStation-75.svg');
  });

  it('falls back to the windsock for calm and for no reported speed', () => {
    expect(reg.getMeteoIcon(2).getSrc()).toContain('weather_station.png');
    expect(reg.getMeteoIcon(null).getSrc()).toContain('weather_station.png');
  });

  it('uses the shared barb artwork for virtual meteo targets', () => {
    expect(reg.getMeteoIcon(6, true).getSrc()).toContain(
      'weatherStation-10.svg'
    );
  });
});
