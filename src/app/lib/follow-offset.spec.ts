import { describe, it, expect } from 'vitest';
import {
  CENTER_OFFSET_LIMIT,
  centerOffsetFromPan,
  clampCenterOffset,
  edgeDistanceInDirection,
  legacyCenterOffset,
  legacyPanBehavior,
  mapCenterForOffset
} from './follow-offset';
import { Position } from '../types';

const VESSEL: Position = [-80.5, 25.0];
const NORTH = 0;
const EAST = Math.PI / 2;
const EDGE_DISTANCE = 2000; // metres from the viewport centre to the edge

/** Positions 1km from the vessel, for panning the map centre to. */
const NORTH_1KM: Position = [-80.5, 25.0 + 1000 / 111320];
const SOUTH_1KM: Position = [-80.5, 25.0 - 1000 / 111320];
const EAST_1KM: Position = [
  -80.5 + 1000 / (111320 * Math.cos(25.0 * (Math.PI / 180))),
  25.0
];

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
    // Locked meant "panning does not drop me out of follow mode".
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
  it('places the map centre ahead of the vessel for a positive offset', () => {
    const centre = mapCenterForOffset(VESSEL, NORTH, EDGE_DISTANCE, 50);
    // 50% of a 2000m edge = 1000m ahead.
    expect(centre[1]).toBeCloseTo(NORTH_1KM[1], 4);
    expect(centre[0]).toBeCloseTo(VESSEL[0], 4);
  });

  it('places the map centre astern for a negative offset', () => {
    const centre = mapCenterForOffset(VESSEL, NORTH, EDGE_DISTANCE, -50);
    expect(centre[1]).toBeCloseTo(SOUTH_1KM[1], 4);
  });

  it('applies the offset along the course, not due north', () => {
    const centre = mapCenterForOffset(VESSEL, EAST, EDGE_DISTANCE, 50);
    expect(centre[0]).toBeCloseTo(EAST_1KM[0], 4);
    expect(centre[1]).toBeCloseTo(VESSEL[1], 4);
  });

  it('centres the vessel exactly when there is no offset', () => {
    expect(mapCenterForOffset(VESSEL, NORTH, EDGE_DISTANCE, 0)).toEqual(VESSEL);
  });
});

describe('centerOffsetFromPan', () => {
  it('reads a pan ahead of the vessel as a positive percentage', () => {
    expect(centerOffsetFromPan(VESSEL, NORTH_1KM, NORTH, EDGE_DISTANCE)).toBe(
      50
    );
  });

  it('reads a pan astern of the vessel as a negative percentage', () => {
    expect(centerOffsetFromPan(VESSEL, SOUTH_1KM, NORTH, EDGE_DISTANCE)).toBe(
      -50
    );
  });

  it('keeps only the along-course part of an off-course pan', () => {
    // Panning abeam contributes nothing: the setting is a single along-course
    // value, so the vessel springs back onto the course line.
    expect(centerOffsetFromPan(VESSEL, EAST_1KM, NORTH, EDGE_DISTANCE)).toBe(0);
  });

  it('measures against the course, not the compass', () => {
    expect(centerOffsetFromPan(VESSEL, EAST_1KM, EAST, EDGE_DISTANCE)).toBe(50);
  });

  it('clamps a pan that would push the vessel off screen', () => {
    expect(centerOffsetFromPan(VESSEL, NORTH_1KM, NORTH, 500)).toBe(
      CENTER_OFFSET_LIMIT
    );
  });

  it('leaves the setting alone when the vessel has no course', () => {
    expect(
      centerOffsetFromPan(VESSEL, NORTH_1KM, null, EDGE_DISTANCE)
    ).toBeNull();
  });

  it('round-trips: applying a captured offset restores the panned-to centre', () => {
    const offset = centerOffsetFromPan(VESSEL, NORTH_1KM, NORTH, EDGE_DISTANCE);
    const centre = mapCenterForOffset(VESSEL, NORTH, EDGE_DISTANCE, offset!);
    expect(centre[0]).toBeCloseTo(NORTH_1KM[0], 4);
    expect(centre[1]).toBeCloseTo(NORTH_1KM[1], 4);
  });
});
