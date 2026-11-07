import { describe, it, expect } from 'vitest';
import {
  CURRENT_INPUT_MAX_AGE_MS,
  CURRENT_SMOOTHING_MS,
  CurrentSmoother,
  CurrentSource,
  currentArrowLength,
  currentFromMotion,
  currentSample
} from './current-vector';

const deg = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;
const KN = 1 / 1.943844;

const NOW = 1_000_000;

const source = (over: Partial<CurrentSource> = {}): CurrentSource => ({
  sog: 6 * KN,
  cogTrue: deg(0),
  cogMagnetic: null,
  headingTrue: deg(0),
  headingMagnetic: null,
  magneticVariation: null,
  stw: 5 * KN,
  stwUpdatedAt: NOW,
  current: { setTrue: null, setMagnetic: null, drift: null },
  currentUpdatedAt: 0,
  ...over
});

describe('currentFromMotion()', () => {
  it('finds a following current as the surplus of SOG over STW', () => {
    const c = currentFromMotion(6 * KN, deg(90), 5 * KN, deg(90));
    expect(c?.drift).toBeCloseTo(1 * KN);
    expect(toDeg(c?.set ?? 0)).toBeCloseTo(90);
  });

  it('finds a cross current from the angle between heading and COG', () => {
    // heading north at 5 kn, made good over ground 5 kn north + 1 kn east
    const sog = Math.hypot(5, 1) * KN;
    const cog = Math.atan2(1, 5);
    const c = currentFromMotion(sog, cog, 5 * KN, 0);
    expect(c?.drift).toBeCloseTo(1 * KN);
    expect(toDeg(c?.set ?? 0)).toBeCloseTo(90);
  });

  it('reads a current from astern at anchor as setting towards the stern', () => {
    const c = currentFromMotion(0, 0, 1 * KN, deg(180));
    expect(c?.drift).toBeCloseTo(1 * KN);
    expect(toDeg(c?.set ?? 0)).toBeCloseTo(0);
  });

  it('gives a set in 0..2π', () => {
    const c = currentFromMotion(4 * KN, deg(0), 5 * KN, deg(0));
    expect(toDeg(c?.set ?? 0)).toBeCloseTo(180);
  });

  it('is null when an input is missing', () => {
    expect(currentFromMotion(null, 0, 1, 0)).toBeNull();
    expect(currentFromMotion(1, 0, undefined, 0)).toBeNull();
    expect(currentFromMotion(1, NaN, 1, 0)).toBeNull();
  });
});

describe('currentSample()', () => {
  it('works the current out from the motion', () => {
    const s = currentSample(source(), NOW);
    expect(s?.smoothed).toBe(true);
    expect(s?.vector.drift).toBeCloseTo(1 * KN);
  });

  it('prefers a published environment.current, unsmoothed', () => {
    const s = currentSample(
      source({
        current: { setTrue: deg(45), setMagnetic: null, drift: 2 * KN },
        currentUpdatedAt: NOW
      }),
      NOW
    );
    expect(s).toEqual({
      vector: { set: deg(45), drift: 2 * KN },
      smoothed: false
    });
  });

  it('corrects a magnetic-only published set by the variation', () => {
    const s = currentSample(
      source({
        current: { setTrue: null, setMagnetic: deg(40), drift: 2 * KN },
        currentUpdatedAt: NOW,
        magneticVariation: deg(5)
      }),
      NOW
    );
    expect(toDeg(s?.vector.set ?? 0)).toBeCloseTo(45);
  });

  it('falls back to the motion once the published current is stale', () => {
    const s = currentSample(
      source({
        current: { setTrue: deg(45), setMagnetic: null, drift: 2 * KN },
        currentUpdatedAt: NOW - CURRENT_INPUT_MAX_AGE_MS - 1
      }),
      NOW
    );
    expect(s?.smoothed).toBe(true);
  });

  it('uses magnetic heading and COG with the variation', () => {
    const s = currentSample(
      source({
        cogTrue: null,
        headingTrue: null,
        cogMagnetic: deg(85),
        headingMagnetic: deg(85),
        magneticVariation: deg(5)
      }),
      NOW
    );
    expect(toDeg(s?.vector.set ?? 0)).toBeCloseTo(90);
  });

  it('is null once the log stops reporting', () => {
    expect(
      currentSample(
        source({ stwUpdatedAt: NOW - CURRENT_INPUT_MAX_AGE_MS - 1 }),
        NOW
      )
    ).toBeNull();
  });

  it('is null without a heading', () => {
    expect(currentSample(source({ headingTrue: null }), NOW)).toBeNull();
  });
});

describe('CurrentSmoother', () => {
  const sample = (setDeg: number, drift: number) => ({
    vector: { set: deg(setDeg), drift },
    smoothed: true
  });

  it('starts at the first sample', () => {
    const c = new CurrentSmoother().update(sample(90, 1), NOW);
    expect(c?.drift).toBeCloseTo(1);
    expect(toDeg(c?.set ?? 0)).toBeCloseTo(90);
  });

  it('moves part of the way towards a new sample', () => {
    const s = new CurrentSmoother();
    s.update(sample(90, 1), NOW);
    const c = s.update(sample(90, 2), NOW + CURRENT_SMOOTHING_MS);
    expect(c?.drift).toBeCloseTo(1 + (1 - Math.exp(-1)));
  });

  it('averages a set either side of north to north', () => {
    const s = new CurrentSmoother();
    s.update(sample(350, 1), NOW);
    const c = s.update(sample(10, 1), NOW + 1e9);
    expect(toDeg(c?.set ?? 0)).toBeCloseTo(10);
    const t = new CurrentSmoother();
    t.update(sample(350, 1), NOW);
    const m = t.update(sample(10, 1), NOW + CURRENT_SMOOTHING_MS * Math.LN2);
    expect(Math.min(toDeg(m?.set ?? 0), 360 - toDeg(m?.set ?? 0))).toBeCloseTo(
      0
    );
  });

  it('passes a published current through and restarts after a gap', () => {
    const s = new CurrentSmoother();
    s.update(sample(90, 1), NOW);
    expect(
      s.update({ vector: { set: 1, drift: 3 }, smoothed: false }, NOW + 1)
    ).toEqual({ set: 1, drift: 3 });
    expect(s.update(null, NOW + 2)).toBeNull();
    expect(s.update(sample(180, 2), NOW + 3)?.drift).toBeCloseTo(2);
  });
});

describe('currentArrowLength()', () => {
  it('grows with the drift between a minimum and a maximum', () => {
    expect(currentArrowLength(0)).toBe(24);
    expect(currentArrowLength(1 * KN)).toBeCloseTo(60);
    expect(currentArrowLength(2 * KN)).toBeCloseTo(120);
    expect(currentArrowLength(10 * KN)).toBe(200);
  });
});
