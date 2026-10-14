import { describe, expect, it } from 'vitest';
import {
  MAX_OVERLAY_PIXEL_RATIO,
  MAX_OVERLAY_PIXELS,
  MERC_HALF_WORLD,
  OVERLAY_ROTATION_THRESHOLD,
  WORLD_WIDTH,
  needsNewFrame,
  overlayView
} from './overlay-geometry';

const base = {
  resolution: 10,
  rotation: 0,
  zoom: 14,
  devicePixelRatio: 1
};

describe('overlayView', () => {
  it('asks for the view box at the screen’s pixel ratio', () => {
    const v = overlayView({
      ...base,
      extent: [0, 0, 16000, 9000],
      devicePixelRatio: 2
    })!;
    expect(v.worldOffset).toBe(0);
    expect(v.view.extent).toEqual([0, 0, 16000, 9000]);
    expect(v.view.width).toBe(3200);
    expect(v.view.height).toBe(1800);
    expect(v.view.pixelRatio).toBe(2);
    expect(v.view.resolution).toBe(5);
    expect(v.view.bounds[0]).toBeCloseTo(0, 6);
    expect(v.view.bounds[2]).toBeCloseTo((16000 / MERC_HALF_WORLD) * 180, 6);
  });

  it(`caps the pixel ratio at ${MAX_OVERLAY_PIXEL_RATIO}`, () => {
    const v = overlayView({
      ...base,
      extent: [0, 0, 1000, 1000],
      devicePixelRatio: 3
    })!;
    expect(v.view.pixelRatio).toBe(MAX_OVERLAY_PIXEL_RATIO);
  });

  it(`draws a big view at a lower ratio, within ${MAX_OVERLAY_PIXELS} pixels`, () => {
    // a 2732x2048 CSS viewport at 45° covers ~3380x3380 CSS px
    const v = overlayView({
      ...base,
      extent: [0, 0, 33800, 33800],
      devicePixelRatio: 2
    })!;
    expect(v.view.width * v.view.height).toBeLessThanOrEqual(
      MAX_OVERLAY_PIXELS * 1.001
    );
    expect(v.view.pixelRatio).toBeLessThan(1);
  });

  it('moves a view in another world copy into the primary world', () => {
    const v = overlayView({
      ...base,
      extent: [WORLD_WIDTH + 100, 0, WORLD_WIDTH + 200, 100]
    })!;
    expect(v.worldOffset).toBe(WORLD_WIDTH);
    expect(v.view.extent[0]).toBeCloseTo(100, 6);
    expect(v.view.extent[2]).toBeCloseTo(200, 6);
  });

  it('sends a view across the antimeridian as one continuous box', () => {
    const v = overlayView({
      ...base,
      // centred just west of 180°, so it stays in the primary world
      extent: [MERC_HALF_WORLD - 7000, -1000, MERC_HALF_WORLD + 3000, 1000]
    })!;
    expect(v.worldOffset).toBe(0);
    expect(v.view.extent[2]).toBeGreaterThan(MERC_HALF_WORLD);
    const [west, , east] = v.view.bounds;
    expect(west).toBeGreaterThan(east); // the API's crossing convention
    expect(west).toBeGreaterThan(179);
    expect(east).toBeLessThan(-179);
  });

  it('is never wider than one world, and clips to the Mercator latitude limit', () => {
    const v = overlayView({
      ...base,
      resolution: 100000,
      extent: [
        -3 * WORLD_WIDTH,
        -2 * WORLD_WIDTH,
        3 * WORLD_WIDTH,
        2 * WORLD_WIDTH
      ]
    })!;
    expect(v.view.extent[2] - v.view.extent[0]).toBeCloseTo(WORLD_WIDTH, 0);
    expect(v.view.extent[1]).toBe(-MERC_HALF_WORLD);
    expect(v.view.extent[3]).toBe(MERC_HALF_WORLD);
    expect(v.view.bounds[3]).toBeCloseTo(85.0511, 3);
  });

  it('passes the rotation through as advisory information', () => {
    expect(
      overlayView({ ...base, rotation: 0.35, extent: [0, 0, 100, 100] })!.view
        .rotation
    ).toBe(0.35);
  });

  it('returns null for a view without a usable size', () => {
    expect(overlayView({ ...base, extent: [0, 0, 0, 100] })).toBeNull();
    expect(
      overlayView({ ...base, resolution: 0, extent: [0, 0, 1, 1] })
    ).toBeNull();
    expect(overlayView({ ...base, extent: [NaN, 0, 1, 1] })).toBeNull();
  });
});

describe('needsNewFrame', () => {
  const view = {
    extent: [0, 0, 1000, 500],
    size: [100, 50],
    resolution: 10,
    rotation: 0
  };

  it('always asks for the first frame', () => {
    expect(needsNewFrame(null, view)).toBe(true);
  });

  it('asks again after a pan, a zoom or a resize', () => {
    expect(needsNewFrame(view, { ...view, extent: [100, 0, 1100, 500] })).toBe(
      true
    );
    expect(needsNewFrame(view, { ...view, resolution: 5 })).toBe(true);
    expect(needsNewFrame(view, { ...view, size: [120, 50] })).toBe(true);
  });

  it('does not ask again for a repeat of the same view', () => {
    expect(needsNewFrame(view, { ...view })).toBe(false);
  });

  it('ignores a small rotation alone (heading-up yaw), but not a large one', () => {
    const turned = (r: number) => ({
      ...view,
      // a rotation grows the covering box about the same centre
      extent: [-50, -50, 1050, 550],
      rotation: r
    });
    expect(needsNewFrame(view, turned(OVERLAY_ROTATION_THRESHOLD * 0.9))).toBe(
      false
    );
    expect(needsNewFrame(view, turned(OVERLAY_ROTATION_THRESHOLD * 1.1))).toBe(
      true
    );
    // across ±π the shorter way round counts
    expect(
      needsNewFrame(
        { ...view, rotation: Math.PI - 0.01 },
        turned(-Math.PI + 0.01)
      )
    ).toBe(false);
  });
});
