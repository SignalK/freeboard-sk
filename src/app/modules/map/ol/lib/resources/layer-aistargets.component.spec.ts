import { describe, it, expect } from 'vitest';
import { AISTargetsLayerComponent } from './layer-aistargets.component';
import { SKTarget } from './ais-base.component';
import { Convert } from 'src/app/lib/convert';
import { Icon, Style } from 'ol/style';

// Stub the unit-preference formatter used for the speed label: mimic a user
// configured for knots so the assertions read in a stable unit.
const appStub = {
  formatValueForDisplay: (v: number) => {
    const kn = Convert.transform(v, 'm/s', 'kn');
    return kn === null ? '---' : `${Math.round(kn)} kn`;
  },
  twsDisplayUnitPath: () => 'environment.wind.speedTrue'
};

/**
 * `targetRotation` decides how a target's icon is rotated (#490). Meteo
 * (weather-station) targets rotate their wind barb to the reported wind
 * direction, but only when a barb is actually shown (speed in a bucket ≥ the
 * first) and a direction is known; every other target keeps its fixed
 * orientation. It reads only plain fields, so exercise it on a bare prototype
 * instance (same approach as ais-base.component.spec).
 */
function layer(
  targetContext: string,
  windIndicator: 'arrow' | 'barb' = 'barb'
) {
  const c = Object.create(
    AISTargetsLayerComponent.prototype
  ) as AISTargetsLayerComponent;
  Object.assign(c, { targetContext, windIndicator, app: appStub });
  return c as unknown as {
    targetRotation: (t: SKTarget) => number;
    buildLabel: (t: SKTarget) => string;
  };
}

describe('AISTargetsLayerComponent.targetRotation (#490)', () => {
  it('uses the fixed orientation for non-meteo targets', () => {
    const c = layer('atons');
    expect(c.targetRotation({ orientation: 1.5 } as SKTarget)).toBe(1.5);
  });

  it('rotates a meteo barb to the reported wind direction', () => {
    const c = layer('meteo');
    expect(c.targetRotation({ tws: 6, twd: 1.2 } as SKTarget)).toBe(1.2);
  });

  it('does not rotate the calm windsock (speed below the first bucket)', () => {
    const c = layer('meteo');
    expect(c.targetRotation({ tws: 2, twd: 1.2 } as SKTarget)).toBe(0);
  });

  it('does not rotate when the wind direction is unknown or invalid', () => {
    const c = layer('meteo');
    expect(c.targetRotation({ tws: 6 } as SKTarget)).toBe(0);
    expect(
      c.targetRotation({ tws: null, twd: null } as unknown as SKTarget)
    ).toBe(0);
    expect(c.targetRotation({ tws: 6, twd: NaN } as SKTarget)).toBe(0);
  });
});

/**
 * With the "arrow" wind indicator selected (#513) a meteo target renders an arrow
 * that points where the wind flows *to* (twd + π) and carries the speed in its
 * label; without a usable wind it falls back to the unrotated windsock.
 */
describe('AISTargetsLayerComponent arrow indicator (#513)', () => {
  it('rotates a meteo arrow to the wind flow direction (twd + π)', () => {
    const c = layer('meteo', 'arrow');
    expect(c.targetRotation({ tws: 6, twd: 1.2 } as SKTarget)).toBeCloseTo(
      1.2 + Math.PI
    );
  });

  it('leaves the calm windsock unrotated even in arrow mode', () => {
    const c = layer('meteo', 'arrow');
    expect(c.targetRotation({ tws: 2, twd: 1.2 } as SKTarget)).toBe(0);
  });

  it('appends the wind speed (knots) to the label in arrow mode', () => {
    const c = layer('meteo', 'arrow');
    expect(c.buildLabel({ name: 'Buoy', tws: 6, twd: 1.2 } as SKTarget)).toBe(
      'Buoy 12 kn'
    );
  });

  it('shows the speed alone when the target has no name', () => {
    const c = layer('meteo', 'arrow');
    expect(c.buildLabel({ tws: 6, twd: 1.2 } as SKTarget)).toBe('12 kn');
  });

  it('appends the wind speed to the label in barb mode too', () => {
    const c = layer('meteo', 'barb');
    expect(c.buildLabel({ name: 'Buoy', tws: 6, twd: 1.2 } as SKTarget)).toBe(
      'Buoy 12 kn'
    );
  });

  it('shows the speed even when the wind direction is unknown', () => {
    const c = layer('meteo', 'barb');
    expect(c.buildLabel({ name: 'Buoy', tws: 6 } as SKTarget)).toBe(
      'Buoy 12 kn'
    );
  });

  it('keeps the plain name label when no wind is reported', () => {
    const c = layer('meteo', 'barb');
    expect(c.buildLabel({ name: 'Buoy' } as SKTarget)).toBe('Buoy');
  });
});

describe('AISTargetsLayerComponent.buildStyle', () => {
  const icon = new Icon({ src: 'aton.svg' });

  function styled(targetStyles: Record<string, Style>) {
    const c = Object.create(
      AISTargetsLayerComponent.prototype
    ) as AISTargetsLayerComponent;
    Object.assign(c, {
      targetContext: 'atons',
      targetStyles,
      mapImages: { getAtoN: () => icon },
      isStale: () => false
    });
    return c.buildStyle({ type: { id: 1 } } as SKTarget);
  }

  it('uses the configured default style', () => {
    const style = new Style();
    expect(styled({ default: style })).toBe(style);
  });

  it('falls back to the target icon when no style is configured for it', () => {
    expect(styled({}).getImage()).toBe(icon);
  });
});
