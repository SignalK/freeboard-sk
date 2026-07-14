import { describe, it, expect } from 'vitest';
import type { FeatureLike } from 'ol/Feature';
import type Icon from 'ol/style/Icon';
import { LayerWindWeatherComponent } from './layer-wind-weather.component';
import { MapImageRegistry } from '../map-image-registry.service';
import { Convert } from 'src/app/lib/convert';

// Stub the unit-preference formatter used for the speed label: mimic a user
// configured for knots so the assertions read in a stable unit.
const appStub = {
  formatValueForDisplay: (v: number) =>
    `${Math.round(Convert.transform(v, 'm/s', 'kn'))} kn`,
  twsDisplayUnitPath: () => 'environment.wind.speedTrue'
};

/**
 * The wind-grid overlay (#413) renders each sample with the glyph chosen by the
 * `indicator` input (#513): a bucketed wind barb (default) rotated into the wind,
 * or the arrow-with-speed. Sample speed is m/s and direction is radians (the wind
 * "from" bearing), matching the meteo targets. `createWindStyle` reads only plain
 * fields + the registry, so exercise it on a bare prototype instance.
 */
function grid(indicator: 'arrow' | 'barb') {
  const c = Object.create(
    LayerWindWeatherComponent.prototype
  ) as LayerWindWeatherComponent;
  Object.assign(c, {
    indicator,
    mapImages: new MapImageRegistry(),
    app: appStub
  });
  return c as unknown as {
    createWindStyle: (f: FeatureLike) => import('ol/style/Style').default;
  };
}

function sample(speedMs: number, directionFrom: number): FeatureLike {
  return {
    get: (k: string) => (k === 'speed' ? speedMs : directionFrom)
  } as unknown as FeatureLike;
}

describe('LayerWindWeatherComponent.createWindStyle (#513)', () => {
  it('renders a bucketed barb with a speed label in barb mode', () => {
    const style = grid('barb').createWindStyle(sample(6, 1.2));
    const icon = style.getImage() as Icon;
    expect(icon.getSrc()).toContain('weatherStation-10.svg');
    expect(icon.getRotation()).toBeCloseTo(1.2);
    expect(style.getText().getText()).toBe('12 kn');
  });

  it('renders the arrow with a speed label in arrow mode', () => {
    const style = grid('arrow').createWindStyle(sample(6, 1.2));
    const icon = style.getImage() as Icon;
    expect(icon.getSrc()).toContain('data:image/svg+xml');
    expect(icon.getRotation()).toBeCloseTo(1.2 + Math.PI);
    expect(style.getText().getText()).toBe('12 kn');
  });

  it('does not rotate the calm windsock in barb mode', () => {
    const style = grid('barb').createWindStyle(sample(2, 1.2));
    const icon = style.getImage() as Icon;
    expect(icon.getSrc()).toContain('weather_station.png');
    expect(icon.getRotation()).toBe(0);
  });
});
