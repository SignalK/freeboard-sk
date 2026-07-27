import { describe, it, expect } from 'vitest';
import { getGreatCircleBearing } from 'geolib';
import {
  CENTER_OFFSET_LIMIT,
  centerOffsetFromPan,
  clampCenterOffset,
  edgeDistanceInDirection,
  legacyCenterOffset,
  legacyPanBehavior,
  mapCenterForOffset,
  MapViewport
} from './follow-offset';
import { Convert } from './convert';
import { GeoUtils } from './geoutils';
import { Position } from '../types';

const VESSEL: Position = [-80.5, 25.0];
const NORTH = 0;
const EAST = Math.PI / 2;
const SOUTH = Math.PI;
const WEST = Math.PI * 1.5;

/** A square north-up viewport 2km to every edge, so a percentage of the edge
 *  distance means the same thing in any direction. */
const SQUARE: MapViewport = {
  halfWidth: 2000,
  halfHeight: 2000,
  rotation: 0
};

/** Distance (m) and bearing (radians) from the vessel to a resolved map centre. */
const fromVessel = (centre: Position) => ({
  distance: GeoUtils.distanceTo(VESSEL, centre),
  bearing: Convert.degreesToRadians(getGreatCircleBearing(VESSEL, centre) ?? 0)
});

/** A map centre panned `distance` metres from the vessel on `bearing`. */
const panTo = (bearing: number, distance: number) =>
  GeoUtils.destCoordinate(VESSEL, bearing, distance);

describe('clampCenterOffset', () => {
  it('keeps the vessel on screen by clamping to the limit', () => {
    expect(clampCenterOffset(140)).toBe(CENTER_OFFSET_LIMIT);
    expect(clampCenterOffset(-140)).toBe(-CENTER_OFFSET_LIMIT);
  });

  it('rounds to a whole percentage', () => {
    expect(clampCenterOffset(12.6)).toBe(13);
    expect(clampCenterOffset(-12.6)).toBe(-13);
  });

  it('falls back to no offset for a non-numeric entry', () => {
    expect(clampCenterOffset(NaN)).toBe(0);
  });

  it('normalises the -0 that rounding a hair of negative produces', () => {
    expect(clampCenterOffset(-0.4)).toBe(0);
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

describe('edgeDistanceInDirection', () => {
  it('reaches the top edge on a northerly course in north-up', () => {
    expect(edgeDistanceInDirection(1000, 500, NORTH, 0)).toBe(500);
  });

  it('reaches the side edge on an easterly course in north-up', () => {
    expect(edgeDistanceInDirection(1000, 500, EAST, 0)).toBe(1000);
  });

  it('follows the rotation in heading-up, where the course is always up', () => {
    // Heading-up rotates the view by -course, so the course direction is the
    // top of the screen whatever the compass bearing.
    expect(edgeDistanceInDirection(1000, 500, EAST, -EAST)).toBe(500);
  });
});

describe('mapCenterForOffset', () => {
  it('places the map centre ahead of the vessel for a positive ahead offset', () => {
    const { distance, bearing } = fromVessel(
      mapCenterForOffset(VESSEL, NORTH, SQUARE, { ahead: 50, abeam: 0 })
    );
    expect(distance).toBeCloseTo(1000, -1);
    expect(bearing).toBeCloseTo(NORTH, 2);
  });

  it('places the map centre astern for a negative ahead offset', () => {
    const { distance, bearing } = fromVessel(
      mapCenterForOffset(VESSEL, NORTH, SQUARE, { ahead: -50, abeam: 0 })
    );
    expect(distance).toBeCloseTo(1000, -1);
    expect(bearing).toBeCloseTo(SOUTH, 2);
  });

  it('places the map centre to starboard for a positive abeam offset', () => {
    const { distance, bearing } = fromVessel(
      mapCenterForOffset(VESSEL, NORTH, SQUARE, { ahead: 0, abeam: 50 })
    );
    expect(distance).toBeCloseTo(1000, -1);
    expect(bearing).toBeCloseTo(EAST, 2);
  });

  it('places the map centre to port for a negative abeam offset', () => {
    const { bearing } = fromVessel(
      mapCenterForOffset(VESSEL, NORTH, SQUARE, { ahead: 0, abeam: -50 })
    );
    expect(bearing).toBeCloseTo(WEST, 2);
  });

  it('combines both axes into a diagonal offset', () => {
    const { bearing } = fromVessel(
      mapCenterForOffset(VESSEL, NORTH, SQUARE, { ahead: 50, abeam: 50 })
    );
    // Equal parts ahead and to starboard puts the centre on the bow quarter.
    expect(bearing).toBeCloseTo(Math.PI / 4, 2);
  });

  it('holds the offset in the vessel frame as the vessel turns', () => {
    // The same "ahead" offset must point east once the vessel heads east, or a
    // look-ahead would show the water already passed.
    const { bearing } = fromVessel(
      mapCenterForOffset(VESSEL, EAST, SQUARE, { ahead: 50, abeam: 0 })
    );
    expect(bearing).toBeCloseTo(EAST, 2);
  });

  it('centres the vessel exactly when there is no offset', () => {
    expect(
      mapCenterForOffset(VESSEL, NORTH, SQUARE, { ahead: 0, abeam: 0 })
    ).toEqual(VESSEL);
  });

  it('holds a single-axis offset at the full limit without shrinking it', () => {
    const { distance } = fromVessel(
      mapCenterForOffset(VESSEL, NORTH, SQUARE, {
        ahead: CENTER_OFFSET_LIMIT,
        abeam: 0
      })
    );
    expect(distance).toBeCloseTo(1800, -1);
  });

  it('shrinks a corner offset that would push the vessel off screen', () => {
    // 90% ahead with 90% abeam lands diagonally outside the viewport corner,
    // which neither per-axis clamp catches on its own.
    const { distance, bearing } = fromVessel(
      mapCenterForOffset(VESSEL, NORTH, SQUARE, {
        ahead: CENTER_OFFSET_LIMIT,
        abeam: CENTER_OFFSET_LIMIT
      })
    );
    const limit = (CENTER_OFFSET_LIMIT / 100) * 1.01;
    expect(Math.abs(distance * Math.cos(bearing))).toBeLessThanOrEqual(
      SQUARE.halfHeight * limit
    );
    expect(Math.abs(distance * Math.sin(bearing))).toBeLessThanOrEqual(
      SQUARE.halfWidth * limit
    );
    // Still on the bow quarter — the shrink is uniform, not per axis.
    expect(bearing).toBeCloseTo(Math.PI / 4, 2);
  });
});

describe('centerOffsetFromPan', () => {
  it('reads a pan ahead of the vessel as a positive ahead offset', () => {
    expect(
      centerOffsetFromPan(VESSEL, panTo(NORTH, 1000), NORTH, SQUARE)
    ).toEqual({ ahead: 50, abeam: 0 });
  });

  it('reads a pan astern as a negative ahead offset', () => {
    expect(
      centerOffsetFromPan(VESSEL, panTo(SOUTH, 1000), NORTH, SQUARE)
    ).toEqual({ ahead: -50, abeam: 0 });
  });

  it('keeps the sideways part of a pan instead of discarding it', () => {
    // The single-axis behaviour this replaces projected the pan onto the course
    // and sprang the vessel back onto the course line (#615).
    expect(
      centerOffsetFromPan(VESSEL, panTo(EAST, 1000), NORTH, SQUARE)
    ).toEqual({ ahead: 0, abeam: 50 });
  });

  it('reads a pan to port as a negative abeam offset', () => {
    expect(
      centerOffsetFromPan(VESSEL, panTo(WEST, 1000), NORTH, SQUARE)
    ).toEqual({ ahead: 0, abeam: -50 });
  });

  it('resolves a diagonal pan into both axes', () => {
    // 1000m on the bow quarter is ~707m on each axis, ~35% of a 2000m edge.
    expect(
      centerOffsetFromPan(VESSEL, panTo(Math.PI / 4, 1000), NORTH, SQUARE)
    ).toEqual({ ahead: 35, abeam: 35 });
  });

  it('measures against the course, not the compass', () => {
    expect(
      centerOffsetFromPan(VESSEL, panTo(EAST, 1000), EAST, SQUARE)
    ).toEqual({ ahead: 50, abeam: 0 });
  });

  it('clamps a pan that would push the vessel off screen', () => {
    expect(
      centerOffsetFromPan(VESSEL, panTo(NORTH, 4000), NORTH, SQUARE)?.ahead
    ).toBe(CENTER_OFFSET_LIMIT);
  });

  it('leaves the setting alone when the vessel has no course', () => {
    expect(
      centerOffsetFromPan(VESSEL, panTo(NORTH, 1000), null, SQUARE)
    ).toBeNull();
  });

  it('round-trips: applying a captured offset restores the panned-to centre', () => {
    const panned = panTo(Math.PI / 4, 1000);
    const offset = centerOffsetFromPan(VESSEL, panned, NORTH, SQUARE);
    const centre = mapCenterForOffset(VESSEL, NORTH, SQUARE, offset!);
    expect(centre[0]).toBeCloseTo(panned[0], 3);
    expect(centre[1]).toBeCloseTo(panned[1], 3);
  });
});
