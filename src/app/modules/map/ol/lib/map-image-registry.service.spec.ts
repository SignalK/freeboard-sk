import { describe, it, expect } from 'vitest';
import {
  MapImageRegistry,
  WIND_ARROW_SYMBOL
} from './map-image-registry.service';

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

/**
 * `getWindArrow` supplies the glyph used by the "arrow with speed" wind indicator
 * (#513). It returns the bundled arrow by default and a symbol-provider override
 * when one is registered under `windIndicator-arrow`.
 */
describe('MapImageRegistry.getWindArrow (#513)', () => {
  it('returns the built-in arrow when no provider override exists', () => {
    const reg = new MapImageRegistry();
    expect(reg.getWindArrow().getSrc()).toContain('data:image/svg+xml');
  });

  it('caches and reuses the built-in arrow icon', () => {
    const reg = new MapImageRegistry();
    expect(reg.getWindArrow()).toBe(reg.getWindArrow());
  });

  it('prefers a symbol-provider override registered for the arrow', () => {
    const reg = new MapImageRegistry();
    reg.registerSymbolMarker(WIND_ARROW_SYMBOL, { path: './custom-arrow.svg' });
    const arrow = reg.getWindArrow();
    expect(arrow.getSrc()).toContain('custom-arrow.svg');
    // A provider arrow is a geographic vector — it must rotate with the view.
    expect(arrow.getRotateWithView()).toBe(true);
  });

  it('does not let a non-rotated cache entry poison the rotated arrow', () => {
    const reg = new MapImageRegistry();
    reg.registerSymbolMarker(WIND_ARROW_SYMBOL, { path: './custom-arrow.svg' });
    // Prime the cache with the non-rotated variant first.
    expect(reg.getExternalSymbol(WIND_ARROW_SYMBOL)?.getRotateWithView()).toBe(
      false
    );
    // getWindArrow must still return an icon that rotates with the view.
    expect(reg.getWindArrow().getRotateWithView()).toBe(true);
  });
});
