import { expect, describe, it, vi, afterEach } from 'vitest';
import {
  HEADING_MAX_AGE_MS,
  MIN_COG_SOG,
  orientationFromPath,
  resolveOrientation
} from './orientation';
import { SKVessel } from '../skresources/resource-classes';

// Orientation drives the vessel icon, the heading line, course-up map rotation
// and the reference bearing for a wind angle. It defaulted to COG, so a boat
// at anchor pointed at GPS noise and the heading line sat on top of the COG
// line (#704, and #338 before it). Guard the source precedence and both
// guards that keep it from flapping.
describe('resolveOrientation — automatic source selection (#704)', () => {
  const NOW = 1_700_000_000_000;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** A vessel with fresh heading + COG, as a boat under way reports. */
  const vessel = (over: Partial<SKVessel> = {}): SKVessel => {
    const v = new SKVessel();
    v.headingTrueUpdatedAt = NOW;
    v.headingMagneticUpdatedAt = NOW;
    Object.assign(v, over);
    return v;
  };

  const at = (t = NOW) => vi.spyOn(Date, 'now').mockReturnValue(t);

  it('prefers a fresh heading over COG', () => {
    at();
    const v = vessel({ headingTrue: 1.5, cogTrue: 3, sog: 5 });

    resolveOrientation(v);

    expect(v.orientation).toBe(1.5);
  });

  it('falls back to magnetic heading when true heading is absent', () => {
    at();
    const v = vessel({ headingMagnetic: 2.2, cogTrue: 3, sog: 5 });

    resolveOrientation(v);

    expect(v.orientation).toBe(2.2);
  });

  // headingTrue can stop while headingMagnetic keeps arriving (variation goes
  // away), which is why the two receipt times are stamped separately.
  it('falls back to magnetic when only true heading has gone stale', () => {
    at();
    const v = vessel({
      headingTrue: 1.5,
      headingMagnetic: 2.2,
      headingTrueUpdatedAt: NOW - HEADING_MAX_AGE_MS - 1
    });

    resolveOrientation(v);

    expect(v.orientation).toBe(2.2);
  });

  it('uses COG when no heading is reported at all', () => {
    at();
    const v = vessel({ cogTrue: 3, sog: 5 });

    resolveOrientation(v);

    expect(v.orientation).toBe(3);
  });

  it('falls back to COG once the heading goes stale', () => {
    at();
    const v = vessel({
      headingTrue: 1.5,
      headingMagnetic: 1.5,
      cogTrue: 3,
      sog: 5,
      headingTrueUpdatedAt: NOW - HEADING_MAX_AGE_MS - 1,
      headingMagneticUpdatedAt: NOW - HEADING_MAX_AGE_MS - 1
    });

    resolveOrientation(v);

    expect(v.orientation).toBe(3);
  });

  it('keeps using a heading that is old but still within the window', () => {
    at();
    const v = vessel({
      headingTrue: 1.5,
      cogTrue: 3,
      sog: 5,
      headingTrueUpdatedAt: NOW - HEADING_MAX_AGE_MS
    });

    resolveOrientation(v);

    expect(v.orientation).toBe(1.5);
  });

  // The bug as reported: stationary, valid heading present, icon follows COG.
  it('does not follow COG noise when stationary with a valid heading', () => {
    at();
    const v = vessel({ headingTrue: 1.5, cogTrue: 3, sog: 0 });

    resolveOrientation(v);

    expect(v.orientation).toBe(1.5);
  });

  // Freezing rather than switching is what stops a boat drifting across the
  // threshold from oscillating between sources.
  it('holds the last orientation when heading is stale and SOG is below the gate', () => {
    at();
    const v = vessel({
      cogTrue: 3,
      sog: MIN_COG_SOG - 0.01,
      orientation: 1.2
    });

    resolveOrientation(v);

    expect(v.orientation).toBe(1.2);
  });

  it('uses COG at exactly the SOG gate', () => {
    at();
    const v = vessel({ cogTrue: 3, sog: MIN_COG_SOG, orientation: 1.2 });

    resolveOrientation(v);

    expect(v.orientation).toBe(3);
  });

  it('holds the last orientation when nothing is reported', () => {
    at();
    const v = vessel({ orientation: 1.2 });

    resolveOrientation(v);

    expect(v.orientation).toBe(1.2);
  });
});

// Orientation is drawn on a chart laid out to true north, so a magnetic source
// must be corrected by the magnetic variation when the boat reports one (#858).
describe('resolveOrientation — magnetic sources corrected by variation (#858)', () => {
  const NOW = 1_700_000_000_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const VAR = rad(12.8);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const vessel = (over: Partial<SKVessel> = {}): SKVessel => {
    const v = new SKVessel();
    v.headingMagneticUpdatedAt = NOW;
    Object.assign(v, over);
    return v;
  };

  it('adds the variation to a magnetic heading', () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const v = vessel({ headingMagnetic: rad(100), magneticVariation: VAR });

    resolveOrientation(v);

    expect(v.orientation).toBeCloseTo(rad(112.8), 9);
  });

  it('adds the variation to a magnetic COG', () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const v = vessel({
      headingMagneticUpdatedAt: 0,
      cogMagnetic: rad(100),
      sog: 5,
      magneticVariation: VAR
    });

    resolveOrientation(v);

    expect(v.orientation).toBeCloseTo(rad(112.8), 9);
  });

  it('prefers true COG over corrected magnetic COG', () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const v = vessel({
      headingMagneticUpdatedAt: 0,
      cogTrue: rad(50),
      cogMagnetic: rad(100),
      sog: 5,
      magneticVariation: VAR
    });

    resolveOrientation(v);

    expect(v.orientation).toBe(rad(50));
  });
});

// An explicit Heading / COG preference is honoured, but a magnetic one is still
// drawn on a true-north chart, so it is corrected too (#858).
describe('orientationFromPath — explicit source preference (#858)', () => {
  const rad = (d: number) => (d * Math.PI) / 180;
  const VAR = rad(12.8);

  it('corrects an explicit magnetic heading', () => {
    expect(
      orientationFromPath('navigation.headingMagnetic', rad(100), VAR)
    ).toBeCloseTo(rad(112.8), 9);
  });

  it('corrects an explicit magnetic COG', () => {
    expect(
      orientationFromPath('navigation.courseOverGroundMagnetic', rad(100), VAR)
    ).toBeCloseTo(rad(112.8), 9);
  });

  it('keeps the magnetic value without variation', () => {
    expect(
      orientationFromPath('navigation.headingMagnetic', rad(100), null)
    ).toBe(rad(100));
  });

  it('leaves a true path unchanged', () => {
    expect(orientationFromPath('navigation.headingTrue', rad(100), VAR)).toBe(
      rad(100)
    );
  });
});
