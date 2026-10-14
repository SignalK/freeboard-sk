import { describe, expect, it } from 'vitest';
import {
  MAX_OVERLAY_PIXEL_RATIO,
  MAX_OVERLAY_PIXELS,
  MERC_HALF_WORLD,
  OVERLAY_MARGIN,
  OVERLAY_ROTATION_THRESHOLD,
  WORLD_WIDTH,
  needsNewFrame,
  overlayView,
  type RequestedView
} from './overlay-geometry';

const base = {
  resolution: 10,
  rotation: 0,
  zoom: 14,
  devicePixelRatio: 1
};

describe('overlayView', () => {
  it('asks for the view plus its margin at the screen’s pixel ratio', () => {
    const v = overlayView({
      ...base,
      extent: [0, 0, 8000, 4500],
      devicePixelRatio: 2
    })!;
    // the swing of a 5° turn (~400 m) is smaller than the 10% margin here
    const padX = OVERLAY_MARGIN * 8000;
    const padY = OVERLAY_MARGIN * 4500;
    expect(v.worldOffset).toBe(0);
    expect(v.view.extent).toEqual([-padX, -padY, 8000 + padX, 4500 + padY]);
    expect(v.view.width).toBe(Math.round(((8000 + 2 * padX) / 10) * 2));
    expect(v.view.pixelRatio).toBe(2);
    expect(v.view.resolution).toBeCloseTo(5, 6);
    expect(v.view.bounds[0]).toBeCloseTo((-padX / MERC_HALF_WORLD) * 180, 6);
  });

  it('pads a narrow view by at least the corner swing of a threshold turn', () => {
    const v = overlayView({ ...base, extent: [0, 0, 30000, 1000] })!;
    const swing =
      0.5 * Math.hypot(30000, 1000) * Math.sin(OVERLAY_ROTATION_THRESHOLD);
    expect(v.view.extent[1]).toBeCloseTo(-swing, 6);
    expect(v.view.extent[3]).toBeCloseTo(1000 + swing, 6);
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
      extent: [WORLD_WIDTH + 1000, 0, WORLD_WIDTH + 2000, 1000]
    })!;
    expect(v.worldOffset).toBe(WORLD_WIDTH);
    const cx = (v.view.extent[0] + v.view.extent[2]) / 2;
    expect(cx).toBeCloseTo(1500, 6);
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
  // what overlayView asked for: the view padded by 100 m all round
  const requested: RequestedView = {
    box: [-100, -100, 1100, 600],
    size: [100, 50],
    resolution: 10,
    rotation: 0
  };

  it('always asks for the first frame', () => {
    expect(needsNewFrame(null, view)).toBe(true);
  });

  it('does not ask again for a pan that stays inside the requested box', () => {
    expect(needsNewFrame(requested, { ...view })).toBe(false);
    expect(
      needsNewFrame(requested, { ...view, extent: [80, -60, 1080, 440] })
    ).toBe(false);
  });

  it('asks again once the view leaves the box, or after a zoom or a resize', () => {
    expect(
      needsNewFrame(requested, { ...view, extent: [150, 0, 1150, 500] })
    ).toBe(true);
    expect(needsNewFrame(requested, { ...view, resolution: 5 })).toBe(true);
    expect(needsNewFrame(requested, { ...view, size: [120, 50] })).toBe(true);
  });

  it('ignores a small rotation alone (heading-up yaw), but not a large one', () => {
    const turned = (r: number) => ({
      ...view,
      // a rotation grows the covering box about the same centre
      extent: [-50, -50, 1050, 550],
      rotation: r
    });
    expect(
      needsNewFrame(requested, turned(OVERLAY_ROTATION_THRESHOLD * 0.9))
    ).toBe(false);
    expect(
      needsNewFrame(requested, turned(OVERLAY_ROTATION_THRESHOLD * 1.1))
    ).toBe(true);
    // across ±π the shorter way round counts
    expect(
      needsNewFrame(
        { ...requested, rotation: Math.PI - 0.01 },
        turned(-Math.PI + 0.01)
      )
    ).toBe(false);
  });

  it('a whole-world view inside a one-world box does not re-request forever', () => {
    const wide = {
      extent: [-2 * WORLD_WIDTH, -WORLD_WIDTH, 2 * WORLD_WIDTH, WORLD_WIDTH],
      size: [1000, 800],
      resolution: 100000,
      rotation: 0
    };
    const box: RequestedView = {
      box: [
        -MERC_HALF_WORLD,
        -MERC_HALF_WORLD,
        MERC_HALF_WORLD,
        MERC_HALF_WORLD
      ],
      size: [1000, 800],
      resolution: 100000,
      rotation: 0
    };
    expect(needsNewFrame(box, wide)).toBe(false);
  });
});
