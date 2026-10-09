import { describe, expect, it } from 'vitest';
import { sameRings } from './layer-range-circles.component';

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
