import { describe, expect, it } from 'vitest';
import { getGreatCircleBearing } from 'geolib';
import { Convert } from './convert';
import { Angle } from './geoutils';
import { computeLaylines, laylineInput, NO_LAYLINES } from './laylines';
import { Position } from '../types';

const rad = Convert.degreesToRadians;

// Sydney Harbour (variation ~12.8E); mark ~1.3 nm to the north-east
const vessel: Position = [151.225, -33.855];
const mark: Position = [151.245, -33.84];
const variation = 12.8;

/** absolute difference between two bearings, degrees */
const off = (a: number, b: number) => Math.abs(Angle.difference(a, b));

describe('laylineInput', () => {
  const self = (twd: number | null, mwd: number | null) => ({
    wind: { twd, mwd, direction: mwd },
    performance: { beatAngle: rad(40), gybeAngle: rad(150) }
  });

  it('uses true wind direction even when the display is set to magnetic (#852)', () => {
    // with useMagnetic on, wind.direction carries the magnetic value
    const input = laylineInput(
      vessel,
      mark,
      self(rad(40), rad(40 - variation))
    );
    expect(input.twd).toBeCloseTo(rad(40), 9);
  });

  it('skips the laylines when there is no true wind direction', () => {
    // previously this drew laylines for a wind from due north
    expect(laylineInput(vessel, mark, self(null, rad(27)))).toBeNull();
  });

  it('skips the laylines without a vessel or mark position', () => {
    expect(laylineInput(undefined, mark, self(rad(40), null))).toBeNull();
    expect(laylineInput(vessel, null, self(rad(40), null))).toBeNull();
  });
});

describe('computeLaylines', () => {
  it('draws the upwind layline box as a parallelogram that closes on the mark', () => {
    const twd = 40;
    const ba = 45;
    const l = computeLaylines({
      vessel,
      mark,
      twd: rad(twd),
      beatAngle: rad(ba)
    });
    const [[p], [s]] = l.port;

    // legs from the vessel run at the beat angle either side of the TRUE wind
    expect(off(getGreatCircleBearing(vessel, s), twd + ba)).toBeLessThan(0.1);
    expect(off(getGreatCircleBearing(vessel, p), twd - ba)).toBeLessThan(0.1);
    // far sides run parallel to the opposite leg, into the mark
    expect(l.starboard[0][1]).toEqual(mark);
    expect(off(getGreatCircleBearing(s, mark), twd - ba)).toBeLessThan(0.5);
    expect(off(getGreatCircleBearing(p, mark), twd + ba)).toBeLessThan(0.5);
  });

  it('draws the target-angle lines at the mark from the true wind', () => {
    const twd = 40;
    const ba = 45;
    const [a, m, b] = computeLaylines({
      vessel,
      mark,
      twd: rad(twd),
      beatAngle: rad(ba)
    }).targetAngle;
    expect(m).toEqual(mark);
    expect(
      off(getGreatCircleBearing(mark, a as Position), twd + 180 + ba)
    ).toBeLessThan(0.1);
    expect(
      off(getGreatCircleBearing(mark, b as Position), twd + 180 - ba)
    ).toBeLessThan(0.1);
  });

  it('draws the downwind layline box when a gybe angle is known', () => {
    // mark is roughly downwind: wind from the south-west
    const twd = 225;
    const ga = 150; // tacking angle downwind = 180 - 150 = 30 each side
    const l = computeLaylines({
      vessel,
      mark,
      twd: rad(twd),
      gybeAngle: rad(ga)
    });
    const [[p], [s]] = l.port;
    // legs head away from the wind, at the gybe angle either side of downwind
    const downwind = twd + 180;
    expect(off(getGreatCircleBearing(vessel, s), downwind + 30)).toBeLessThan(
      0.1
    );
    expect(off(getGreatCircleBearing(vessel, p), downwind - 30)).toBeLessThan(
      0.1
    );
    expect(off(getGreatCircleBearing(s, mark), downwind - 30)).toBeLessThan(
      0.5
    );
    expect(off(getGreatCircleBearing(p, mark), downwind + 30)).toBeLessThan(
      0.5
    );
    // target-angle lines at the mark run back upwind, at the gybe angle
    // either side of the wind's reciprocal
    const [a, m, b] = l.targetAngle;
    expect(m).toEqual(mark);
    expect(
      off(getGreatCircleBearing(mark, a as Position), downwind + ga)
    ).toBeLessThan(0.1);
    expect(
      off(getGreatCircleBearing(mark, b as Position), downwind - ga)
    ).toBeLessThan(0.1);
  });

  it('draws nothing downwind without a gybe angle', () => {
    expect(computeLaylines({ vessel, mark, twd: rad(225) })).toBe(NO_LAYLINES);
  });

  it('draws only the target-angle lines when the mark is outside the target angle', () => {
    // mark bears ~48T; wind 90T puts it 42 deg off the wind, outside a 30 deg beat angle
    const l = computeLaylines({
      vessel,
      mark,
      twd: rad(90),
      beatAngle: rad(30)
    });
    expect(l.targetAngle.length).toBe(3);
    expect(l.port).toEqual([]);
    expect(l.starboard).toEqual([]);
  });
});
