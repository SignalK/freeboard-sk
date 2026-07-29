import { describe, it, expect } from 'vitest';
import {
  CENTER_OFFSET_LIMIT,
  clampCenterOffset,
  legacyCenterOffset,
  legacyPanBehavior,
  mapCenterForOffset,
  mapCenterForZoomShift,
  MapViewport,
  normaliseCenterOffset,
  resolvePan
} from './follow-offset';
import { GeoUtils } from './geoutils';
import { Position } from '../types';

const VESSEL: Position = [-80.5, 25.0];
const HALF = 2000; // metres from the viewport centre to the edge, both axes
const EAST = Math.PI / 2;

/** A viewport of the given rotation and half-extents. */
const vp = (
  rotation = 0,
  halfWidth = HALF,
  halfHeight = HALF
): MapViewport => ({
  halfWidth,
  halfHeight,
  rotation
});

/** A point `metres` from the vessel on `bearing`, via the same geodesy the
 *  production code uses, so fixtures are exact rather than flat-earth. */
const dest = (bearing: number, metres: number): Position =>
  GeoUtils.destCoordinate(VESSEL, bearing, metres);

const expectPos = (actual: Position, expected: Position, precision = 6) => {
  expect(actual[0]).toBeCloseTo(expected[0], precision);
  expect(actual[1]).toBeCloseTo(expected[1], precision);
};

describe('clampCenterOffset', () => {
  it('keeps the vessel on screen by clamping to the limit', () => {
    expect(clampCenterOffset(140)).toBe(CENTER_OFFSET_LIMIT);
    expect(clampCenterOffset(-140)).toBe(-CENTER_OFFSET_LIMIT);
  });

  it('rounds to a whole percentage', () => {
    expect(clampCenterOffset(12.6)).toBe(13);
    expect(clampCenterOffset(-12.6)).toBe(-13);
  });

  it('normalises a negative rounding residue to 0, not -0', () => {
    // The residue a pan leaves on the axis the user did not move along.
    expect(Object.is(clampCenterOffset(-0.2), 0)).toBe(true);
  });

  it('falls back to no offset for a non-numeric entry', () => {
    expect(clampCenterOffset(NaN)).toBe(0);
  });
});

describe('legacyCenterOffset', () => {
  it('converts the superseded fractional presets to percentages', () => {
    expect(legacyCenterOffset(0.2)).toBe(20);
    expect(legacyCenterOffset(0.5)).toBe(50);
    expect(legacyCenterOffset(0.7)).toBe(70);
  });
});

describe('legacyPanBehavior', () => {
  it('maps a checked "Lock Follow Vessel" to holding the panned-to offset', () => {
    expect(legacyPanBehavior(true)).toBe('offset');
  });

  it('maps an unchecked "Lock Follow Vessel" to releasing follow mode', () => {
    expect(legacyPanBehavior(false)).toBe('exit');
  });

  it('treats a config predating the checkbox as releasing follow mode', () => {
    expect(legacyPanBehavior(undefined)).toBe('exit');
  });
});

describe('normaliseCenterOffset', () => {
  it('defaults an unset offset to centred', () => {
    expect(normaliseCenterOffset(undefined)).toEqual({ x: 0, y: 0 });
  });

  it('maps the vessel-frame {ahead, abeam} pair onto the screen axes', () => {
    // ahead → y (up the screen), abeam → x (across it).
    expect(normaliseCenterOffset(50, 30)).toEqual({ x: 30, y: 50 });
  });

  it('lifts an even older single along-course percentage onto the y axis', () => {
    expect(normaliseCenterOffset(50)).toEqual({ x: 0, y: 50 });
  });

  it('converts the superseded fractional preset before lifting it', () => {
    expect(normaliseCenterOffset(0.5)).toEqual({ x: 0, y: 50 });
  });

  it('clamps and rounds an {x, y} offset', () => {
    expect(normaliseCenterOffset({ x: 200, y: -12.6 })).toEqual({
      x: 90,
      y: -13
    });
  });
});

describe('mapCenterForOffset', () => {
  it('centres the vessel exactly when there is no offset', () => {
    expect(mapCenterForOffset(VESSEL, vp(), { x: 0, y: 0 })).toEqual(VESSEL);
  });

  it('places the centre up the screen for a positive y, north-up', () => {
    // 50% of a 2000m half-viewport = 1000m up; north-up so up = north.
    expectPos(mapCenterForOffset(VESSEL, vp(), { x: 0, y: 50 }), dest(0, 1000));
  });

  it('places the centre down the screen for a negative y', () => {
    expectPos(
      mapCenterForOffset(VESSEL, vp(), { x: 0, y: -50 }),
      dest(Math.PI, 1000)
    );
  });

  it('places the centre to screen-right for a positive x, north-up', () => {
    expectPos(
      mapCenterForOffset(VESSEL, vp(), { x: 50, y: 0 }),
      dest(EAST, 1000)
    );
  });

  it('follows the view rotation, not the course: up-screen is along-course in heading-up', () => {
    // There is no course parameter: direction is fixed by the view rotation
    // alone, so the offset can never rotate with COG. Heading-up rotates the
    // view by -course, so a positive y points along the course (here east).
    expectPos(
      mapCenterForOffset(VESSEL, vp(-EAST), { x: 0, y: 50 }),
      dest(EAST, 1000)
    );
  });
});

describe('mapCenterForZoomShift', () => {
  it('is the plain offset centre when the zoom does not change', () => {
    const offset = { x: 40, y: -25 };
    expect(mapCenterForZoomShift(VESSEL, vp(), offset, 0)).toEqual(
      mapCenterForOffset(VESSEL, vp(), offset)
    );
  });

  it('halves the offset ground distance when zooming in one level', () => {
    // 50% of a 2000m half-viewport is 1000m up; one level in halves the
    // resolution, so the same screen offset now spans 500m.
    expectPos(
      mapCenterForZoomShift(VESSEL, vp(), { x: 0, y: 50 }, 1),
      dest(0, 500)
    );
  });

  it('doubles the offset ground distance when zooming out one level', () => {
    expectPos(
      mapCenterForZoomShift(VESSEL, vp(), { x: 0, y: 50 }, -1),
      dest(0, 2000)
    );
  });

  it('holds the vessel on the same on-screen spot through a zoom in', () => {
    const offset = { x: 40, y: -25 };
    const centre = mapCenterForZoomShift(VESSEL, vp(), offset, 1);
    // The post-zoom viewport is half the size; the vessel must still sit at the
    // configured offset within it.
    expect(resolvePan(VESSEL, centre, vp(0, HALF / 2, HALF / 2))).toEqual({
      action: 'offset',
      offset
    });
  });

  it('holds the vessel on the same on-screen spot through a zoom out', () => {
    const offset = { x: 40, y: -25 };
    const centre = mapCenterForZoomShift(VESSEL, vp(), offset, -1);
    expect(resolvePan(VESSEL, centre, vp(0, HALF * 2, HALF * 2))).toEqual({
      action: 'offset',
      offset
    });
  });

  it('preserves the offset through a zoom in a rotated (heading-up) view', () => {
    const offset = { x: 40, y: -25 };
    const centre = mapCenterForZoomShift(VESSEL, vp(-EAST), offset, 1);
    expect(resolvePan(VESSEL, centre, vp(-EAST, HALF / 2, HALF / 2))).toEqual({
      action: 'offset',
      offset
    });
  });
});

describe('resolvePan', () => {
  it('adopts an up-screen pan as a positive y offset, north-up', () => {
    expect(resolvePan(VESSEL, dest(0, 1000), vp())).toEqual({
      action: 'offset',
      offset: { x: 0, y: 50 }
    });
  });

  it('adopts a down-screen pan as a negative y offset', () => {
    expect(resolvePan(VESSEL, dest(Math.PI, 1000), vp())).toEqual({
      action: 'offset',
      offset: { x: 0, y: -50 }
    });
  });

  it('keeps a sideways pan on the x axis instead of discarding it', () => {
    expect(resolvePan(VESSEL, dest(EAST, 1000), vp())).toEqual({
      action: 'offset',
      offset: { x: 50, y: 0 }
    });
  });

  it('measures against the view rotation: an along-course pan is vertical in heading-up', () => {
    expect(resolvePan(VESSEL, dest(EAST, 1000), vp(-EAST))).toEqual({
      action: 'offset',
      offset: { x: 0, y: 50 }
    });
  });

  it('clamps an adopted offset that nears the edge but stays on screen', () => {
    // 95% up the screen is still on screen; it sticks at the limit.
    expect(resolvePan(VESSEL, dest(0, 1900), vp())).toEqual({
      action: 'offset',
      offset: { x: 0, y: CENTER_OFFSET_LIMIT }
    });
  });

  it('releases follow mode when the pan drags the vessel past the top edge', () => {
    // 105% up = off screen: drop follow rather than clamp the vessel back on.
    expect(resolvePan(VESSEL, dest(0, 2100), vp())).toEqual({
      action: 'release'
    });
  });

  it('releases follow mode when the pan drags the vessel past a side edge', () => {
    expect(resolvePan(VESSEL, dest(EAST, 2100), vp())).toEqual({
      action: 'release'
    });
  });

  it('ignores a pan when the viewport edge distances are unusable', () => {
    expect(resolvePan(VESSEL, dest(0, 1000), vp(0, 0, HALF))).toEqual({
      action: 'ignore'
    });
    expect(resolvePan(VESSEL, dest(0, 1000), vp(0, HALF, NaN))).toEqual({
      action: 'ignore'
    });
  });

  it('round-trips an adopted offset through mapCenterForOffset', () => {
    const offset = { x: 40, y: -25 };
    const centre = mapCenterForOffset(VESSEL, vp(), offset);
    expect(resolvePan(VESSEL, centre, vp())).toEqual({
      action: 'offset',
      offset
    });
  });
});
