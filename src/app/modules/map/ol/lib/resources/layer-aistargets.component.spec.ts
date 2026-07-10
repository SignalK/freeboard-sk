import { describe, it, expect } from 'vitest';
import { AISTargetsLayerComponent } from './layer-aistargets.component';
import { SKTarget } from './ais-base.component';

/**
 * `targetRotation` decides how a target's icon is rotated (#490). Meteo
 * (weather-station) targets rotate their wind barb to the reported wind
 * direction, but only when a barb is actually shown (speed in a bucket ≥ the
 * first) and a direction is known; every other target keeps its fixed
 * orientation. It reads only plain fields, so exercise it on a bare prototype
 * instance (same approach as ais-base.component.spec).
 */
function layer(targetContext: string) {
  const c = Object.create(
    AISTargetsLayerComponent.prototype
  ) as AISTargetsLayerComponent;
  Object.assign(c, { targetContext });
  return c as unknown as { targetRotation: (t: SKTarget) => number };
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
    expect(c.targetRotation({ tws: null, twd: null } as SKTarget)).toBe(0);
    expect(c.targetRotation({ tws: 6, twd: NaN } as SKTarget)).toBe(0);
  });
});
