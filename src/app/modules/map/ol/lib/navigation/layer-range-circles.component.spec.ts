import { describe, expect, it } from 'vitest';
import {
  RangeCirclesComponent,
  sameRings
} from './layer-range-circles.component';
import { LightTheme } from '../themes';

describe('sameRings', () => {
  const rings = [
    { distance: 185.2, label: '0.1 nm' },
    { distance: 370.4, label: '0.2 nm' }
  ];

  it('treats rings with the same distances and labels as equal', () => {
    expect(
      sameRings(
        rings,
        rings.map((r) => ({ ...r }))
      )
    ).toBe(true);
  });

  it('sees a new distance, label or ring count as a change', () => {
    expect(
      sameRings(rings, [rings[0], { distance: 400, label: '0.2 nm' }])
    ).toBe(false);
    expect(
      sameRings(rings, [rings[0], { distance: 370.4, label: '370 m' }])
    ).toBe(false);
    expect(sameRings(rings, [rings[0]])).toBe(false);
  });
});

// parseValues reads only plain fields and signals in fixed mode, so exercise
// it on a bare prototype instance (same approach as ais-base.component.spec).
describe('RangeCirclesComponent fixed-distance circles', () => {
  function circleCount(minZoom: number | undefined, mapZoom = 12) {
    const c = Object.create(
      RangeCirclesComponent.prototype
    ) as RangeCirclesComponent;
    Object.assign(c, {
      rings: (): undefined => undefined,
      fixedMode: () => true,
      fixedDistance: () => 1000,
      position: [-80.5, 25.0],
      maxCircles: 3,
      units: 'm',
      mapZoom,
      minZoom,
      theme: LightTheme
    });
    c.parseValues();
    // a circle and its label per ring
    return (c as unknown as { features: unknown[] }).features.length / 2;
  }

  it('draws the circles from the minimum zoom on', () => {
    expect(circleCount(10, 12)).toBe(3);
    expect(circleCount(14, 12)).toBe(0);
  });

  it('draws the circles at any zoom when no minimum is set', () => {
    expect(circleCount(undefined)).toBe(3);
  });
});

describe('RangeCirclesComponent circle colour', () => {
  function strokeColor(
    rings: { distance: number; label: string }[] | undefined,
    ringColor?: string
  ) {
    const c = Object.create(
      RangeCirclesComponent.prototype
    ) as RangeCirclesComponent;
    Object.assign(c, { rings: () => rings, ringColor: () => ringColor });
    return c.buildCircleStyle().getStroke()?.getColor();
  }
  const ring = [{ distance: 1852, label: '1 nm' }];

  it('draws radar rings in the chosen colour', () => {
    expect(strokeColor(ring, '#404040')).toBe('#404040');
  });

  it('keeps the range circle colour for the zoom or fixed circles', () => {
    expect(strokeColor(undefined, '#404040')).toBe(strokeColor(undefined));
    expect(strokeColor(ring)).toBe(strokeColor(undefined));
  });
});
