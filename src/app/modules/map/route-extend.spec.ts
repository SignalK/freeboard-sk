import { expect, describe, it } from 'vitest';
import { Position } from 'src/app/types';
import {
  WORLD_WIDTH_3857,
  extendRouteAtClick,
  worldAlignedPoint
} from './route-extend';

const W = WORLD_WIDTH_3857;

describe('worldAlignedPoint', () => {
  it('leaves a click in the route body world unshifted', () => {
    // Route body around x=0; click at x=20 needs no whole-world shift.
    expect(worldAlignedPoint([20, 5], -10, 10)).toEqual([20, 5]);
  });

  it('shifts a click a whole world to reach a route stored past the antimeridian (#572)', () => {
    // A route crossing +180° is stored unwrapped, its body just east of +180°
    // (render-space x ≈ +W/2). A click just past the antimeridian normalises to
    // the primary world (x ≈ -W/2), so it must be shifted +1 world to stay
    // contiguous with the body.
    const centre = W / 2;
    const p = worldAlignedPoint([-W / 2 + 50, 10], centre - 100, centre + 100);
    expect(p[0]).toBeCloseTo(W / 2 + 50, 3);
    expect(p[1]).toBe(10);
  });

  it('never alters latitude', () => {
    expect(worldAlignedPoint([123, 45.6], -10, 10)[1]).toBe(45.6);
  });
});

describe('extendRouteAtClick', () => {
  const before: Position[] = [
    [0, 0],
    [10, 0]
  ];

  it('appends the clicked point as the new END of the route', () => {
    const r = extendRouteAtClick(before, undefined, [20, 5], -10, 10);
    expect(r.after).toHaveLength(3);
    expect(r.after[r.after.length - 1]).toEqual([20, 5]);
    // existing points are unchanged and stay first
    expect(r.after.slice(0, 2)).toEqual(before);
  });

  it('grows per-point metadata in step, the new end point unnamed', () => {
    const meta = [{ name: 'A' }, { name: 'B', description: 'b' }];
    const r = extendRouteAtClick(before, meta, [20, 5], -10, 10);
    expect(r.meta).toEqual([
      { name: 'A' },
      { name: 'B', description: 'b' },
      { name: '' }
    ]);
    // input metadata is not mutated
    expect(meta).toHaveLength(2);
  });

  it('leaves metadata undefined for a route that carries none', () => {
    const r = extendRouteAtClick(before, undefined, [20, 5], -10, 10);
    expect(r.meta).toBeUndefined();
    expect(r.undo.coordsMetadata).toBeUndefined();
  });

  it('captures a pre-append undo snapshot decoupled from the inputs', () => {
    const r = extendRouteAtClick(
      before,
      [{ name: 'A' }, { name: 'B' }],
      [20, 5],
      -10,
      10
    );
    expect(r.undo.coordinates).toEqual(before);
    // deep clone — mutating the snapshot must not reach the source geometry
    r.undo.coordinates[0][0] = 999;
    expect(before[0][0]).toBe(0);
  });
});
