import { describe, expect, it } from 'vitest';
import { create, makeInverse, Transform } from 'ol/transform';

import {
  colorBand,
  COLOR_BANDS,
  FlowSampler,
  FlowView,
  particleCountFor,
  RECORD_INTERVAL,
  TRAIL_POINTS,
  WindParticles
} from './wind-particles';

/** A 100×100 px view, 1 map unit per pixel, north up, origin at the
 *  top-left pixel. */
function view(): FlowView {
  const coordinateToPixel: Transform = [1, 0, 0, -1, 0, 100];
  return {
    width: 100,
    height: 100,
    coordinateToPixel,
    pixelToCoordinate: makeInverse(create(), coordinateToPixel),
    resolution: 1
  };
}

/** A fixed sequence of "random" numbers, so particles start where told. */
function sequence(...values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

const blowing =
  (u: number, v: number): FlowSampler =>
  (_x, _y, out) => {
    out[0] = u;
    out[1] = v;
    return true;
  };

const segments = (p: WindParticles) => {
  const all: number[][] = [];
  p.forEachSegment((i, level, x0, y0, x1, y1) =>
    all.push([i, level, x0, y0, x1, y1])
  );
  return all;
};

describe('WindParticles', () => {
  it('carries a particle downwind at a speed that follows the wind', () => {
    const p = new WindParticles(sequence(0.5));
    p.reset(1, view());
    const x = p.x[0];
    const y = p.y[0];

    p.step(0.1, blowing(10, 0), view()); // 10 m/s towards the east
    expect(p.x[0] - x).toBeCloseTo(6, 6); // 6 px/s per m/s × 0.1 s
    expect(p.y[0]).toBe(y);
    expect(p.speed[0]).toBe(10);

    const x1 = p.x[0];
    p.step(0.1, blowing(-20, 0), view());
    expect(p.x[0] - x1).toBeCloseTo(-12, 6);
  });

  it('is reborn where there is no wind data', () => {
    const p = new WindParticles(sequence(0.5, 0.5, 0, 0, 0.1, 0.2, 0));
    p.reset(1, view());
    p.step(0.05, () => false, view());
    expect([p.x[0], p.y[0]]).toEqual([10, 80]); // pixel (10, 20)
  });

  it('is reborn once it leaves the view', () => {
    const p = new WindParticles(sequence(0.5, 0.5, 0, 0, 0.1, 0.2, 0));
    p.reset(1, view());
    p.step(1, blowing(20, 0), view()); // 120 px east: off the 100 px view
    expect([p.x[0], p.y[0]]).toEqual([10, 80]);
  });

  it('draws a trail from its oldest point to the particle, brightest last', () => {
    const p = new WindParticles(sequence(0.5, 0.5, 0.99, 0));
    p.reset(1, view());
    // Three recorded points, then a move too short to record another.
    for (let n = 0; n < 3; n++) {
      p.step(RECORD_INTERVAL, blowing(10, 0), view());
    }
    p.step(0.01, blowing(10, 0), view());
    const trail = segments(p);
    expect(trail.map((s) => s[1])).toEqual([
      TRAIL_POINTS - 3,
      TRAIL_POINTS - 2,
      TRAIL_POINTS - 1
    ]);
    // Contiguous, and ending at the particle.
    expect(trail[0][4]).toBe(trail[1][2]);
    expect(trail[1][4]).toBe(trail[2][2]);
    expect(trail[2][4]).toBe(p.x[0]);
  });

  it('keeps at most TRAIL_POINTS points per trail', () => {
    const p = new WindParticles(sequence(0.5, 0.5, 0.99, 0));
    p.reset(1, view());
    for (let n = 0; n < TRAIL_POINTS * 3; n++) {
      p.step(RECORD_INTERVAL, blowing(1, 0), view());
    }
    expect(segments(p).length).toBe(TRAIL_POINTS - 1);
  });

  it('stops at the end of its life and lets its trail catch up before rebirth', () => {
    // Starts at the centre with the shortest life, 1.5 s, and age 0.
    const p = new WindParticles(sequence(0.5, 0.5, 0, 0));
    p.reset(1, view());
    let moves = 0;
    let stoppedAt = p.x[0];
    for (;;) {
      p.step(RECORD_INTERVAL, blowing(2, 0), view());
      if (p.x[0] === stoppedAt) {
        break;
      }
      stoppedAt = p.x[0];
      moves++;
    }
    const expected = 1.5 / RECORD_INTERVAL;
    expect(moves).toBeGreaterThanOrEqual(expected - 1);
    expect(moves).toBeLessThanOrEqual(expected + 2);
    expect(segments(p).length).toBeGreaterThan(0);

    for (let n = 0; n < TRAIL_POINTS - 2; n++) {
      p.step(RECORD_INTERVAL, blowing(2, 0), view());
      expect(p.x[0]).toBe(stoppedAt);
    }
    expect(segments(p).length).toBe(0);

    p.step(RECORD_INTERVAL, blowing(2, 0), view());
    expect(p.x[0]).not.toBe(stoppedAt);
  });
});

describe('particleCountFor', () => {
  it('scales with the map area within bounds', () => {
    expect(particleCountFor(700, 100)).toBe(200);
    expect(particleCountFor(700, 1000)).toBe(1000);
    expect(particleCountFor(10000, 10000)).toBe(4000);
  });
});

describe('colorBand', () => {
  it('maps speeds onto the bands, clamped at both ends', () => {
    expect(colorBand(-1)).toBe(0);
    expect(colorBand(0)).toBe(0);
    expect(colorBand(1000)).toBe(COLOR_BANDS - 1);
  });
});
