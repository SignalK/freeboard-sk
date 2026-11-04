import { describe, expect, it } from 'vitest';
import { create, makeInverse, Transform } from 'ol/transform';

import { WIND_COLOR_MAX } from 'src/app/modules/weather/wind-field';

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

  it('waits unseen where there is no wind data yet, then is reborn', () => {
    // Centre of the view, shortest life (1.5 s), age 0; reborn at (10, 20).
    const p = new WindParticles(sequence(0.5, 0.5, 0, 0, 0.1, 0.2, 0));
    p.reset(1, view());
    for (let n = 0; n < 3; n++) {
      p.step(RECORD_INTERVAL, blowing(10, 0), view());
    }
    const x = p.x[0];

    p.step(RECORD_INTERVAL, () => false, view());
    expect(p.x[0]).toBe(x);
    expect(segments(p)).toEqual([]);

    p.step(1.5, () => false, view());
    expect([p.x[0], p.y[0]]).toEqual([10, 80]);
  });

  it('is reborn once it leaves the view', () => {
    const p = new WindParticles(sequence(0.5, 0.5, 0, 0, 0.1, 0.2, 0));
    p.reset(1, view());
    // 108 px east in one step: past the 100 px view and its margin.
    p.step(RECORD_INTERVAL, blowing(300, 0), view());
    p.step(RECORD_INTERVAL, blowing(300, 0), view());
    expect([p.x[0], p.y[0]]).toEqual([10, 80]);
  });

  it('is reborn at once when a pan leaves it off screen without wind data', () => {
    const p = new WindParticles(sequence(0.5, 0.5, 0.99, 0, 0.1, 0.2, 0));
    p.reset(1, view());
    // The same view panned 200 px: the particle, at x = 50, is now off screen.
    const toPixel: Transform = [1, 0, 0, -1, -200, 100];
    const panned: FlowView = {
      ...view(),
      coordinateToPixel: toPixel,
      pixelToCoordinate: makeInverse(create(), toPixel)
    };
    p.step(RECORD_INTERVAL, () => false, panned);
    expect([p.x[0], p.y[0]]).toEqual([210, 80]); // pixel (10, 20)
  });

  it('keeps trail points evenly spaced when frames do not divide the interval', () => {
    const p = new WindParticles(sequence(0.5, 0.5, 0.99, 0));
    p.reset(1, view());
    for (let n = 0; n < 12; n++) {
      p.step(0.1, blowing(10, 0), view());
    }
    // Every recorded piece is one interval long: 10 m/s → 60 px/s.
    const pieces = segments(p)
      .slice(0, -1) // the last piece runs to the particle, wherever it is
      .map(([, , x0, , x1]) => x1 - x0);
    expect(pieces.length).toBeGreaterThan(5);
    pieces.forEach((len) => expect(len).toBeCloseTo(60 * RECORD_INTERVAL, 6));
  });

  it('recycles a dying particle that a pan leaves off screen', () => {
    // Shortest life, 1.5 s: run it to its end, then pan it away.
    const p = new WindParticles(sequence(0.5, 0.5, 0, 0, 0.1, 0.2, 0));
    p.reset(1, view());
    let x = p.x[0];
    for (;;) {
      p.step(RECORD_INTERVAL, blowing(2, 0), view());
      if (p.x[0] === x) {
        break; // stopped: dying, its trail catching up
      }
      x = p.x[0];
    }
    const toPixel: Transform = [1, 0, 0, -1, -200, 100];
    const panned: FlowView = {
      ...view(),
      coordinateToPixel: toPixel,
      pixelToCoordinate: makeInverse(create(), toPixel)
    };
    p.step(RECORD_INTERVAL, blowing(2, 0), panned);
    expect(p.x[0]).toBeGreaterThanOrEqual(200);
    expect(p.x[0]).toBeLessThanOrEqual(300);
  });

  it('spaces trail points the same at a low frame rate', () => {
    const p = new WindParticles(sequence(0.5, 0.5, 0.99, 0));
    p.reset(1, view());
    for (let n = 0; n < 20; n++) {
      p.step(0.1, blowing(1, 0), view()); // 10 frames a second
    }
    // A full trail spans TRAIL_POINTS intervals at most: at 1 m/s, 6 px/s.
    const length = segments(p).reduce(
      (sum, [, , x0, y0, x1, y1]) => sum + Math.hypot(x1 - x0, y1 - y0),
      0
    );
    expect(length).toBeGreaterThan(6 * (TRAIL_POINTS - 2) * RECORD_INTERVAL);
    expect(length).toBeLessThanOrEqual(6 * TRAIL_POINTS * RECORD_INTERVAL);
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

describe('WindParticles after a zoom', () => {
  /** The same 100×100 px view at another resolution, centred on (50, 50). */
  function zoomedView(resolution: number): FlowView {
    const coordinateToPixel: Transform = [
      1 / resolution,
      0,
      0,
      -1 / resolution,
      50 - 50 / resolution,
      50 + 50 / resolution
    ];
    return {
      width: 100,
      height: 100,
      coordinateToPixel,
      pixelToCoordinate: makeInverse(create(), coordinateToPixel),
      resolution
    };
  }

  /** On-screen length of each trail segment. */
  const pixelLengths = (p: WindParticles, v: FlowView) =>
    segments(p).map(([, , x0, y0, x1, y1]) => {
      const t = v.coordinateToPixel;
      return Math.hypot(
        t[0] * (x1 - x0) + t[2] * (y1 - y0),
        t[1] * (x1 - x0) + t[3] * (y1 - y0)
      );
    });

  it('keeps the on-screen length of trails', () => {
    const p = new WindParticles(sequence(0.5, 0.5, 0.99, 0));
    p.reset(1, zoomedView(1));
    for (let n = 0; n < 4; n++) {
      p.step(RECORD_INTERVAL, blowing(10, 0), zoomedView(1));
    }
    const before = pixelLengths(p, zoomedView(1));

    p.zoomed(zoomedView(1), zoomedView(0.5)); // zoom in ×2, particle stays on screen
    const after = pixelLengths(p, zoomedView(0.5));
    expect(after.length).toBe(before.length);
    after.forEach((len, i) => expect(len).toBeCloseTo(before[i], 6));
  });

  it('keeps the on-screen length of vertical trails', () => {
    const p = new WindParticles(sequence(0.5, 0.5, 0.99, 0));
    p.reset(1, zoomedView(1));
    for (let n = 0; n < 4; n++) {
      p.step(RECORD_INTERVAL, blowing(0, 10), zoomedView(1));
    }
    const before = pixelLengths(p, zoomedView(1));

    p.zoomed(zoomedView(1), zoomedView(0.5));
    const after = pixelLengths(p, zoomedView(0.5));
    expect(after.length).toBe(before.length);
    after.forEach((len, i) => expect(len).toBeCloseTo(before[i], 6));
  });

  it('scatters again the particles a zoom in pushed off screen', () => {
    // Starts near the right edge, which a ×2 zoom in pushes off screen.
    const p = new WindParticles(sequence(0.95, 0.5, 0.99, 0, 0.3, 0.6, 0, 0.5));
    p.reset(1, zoomedView(1));
    p.zoomed(zoomedView(1), zoomedView(0.5));
    const pixel = [p.x[0], p.y[0]];
    const t = zoomedView(0.5).coordinateToPixel;
    expect(t[0] * pixel[0] + t[4]).toBeCloseTo(30, 6);
    expect(t[3] * pixel[1] + t[5]).toBeCloseTo(60, 6);
  });

  it('spreads particles back to the edges after a zoom out', () => {
    const p = new WindParticles();
    p.reset(2000, zoomedView(1));
    p.zoomed(zoomedView(1), zoomedView(2)); // all of them now in the middle quarter
    const t = zoomedView(2).coordinateToPixel;
    let outer = 0;
    for (let i = 0; i < p.count; i++) {
      const px = t[0] * p.x[i] + t[4];
      const py = t[3] * p.y[i] + t[5];
      if (px < 25 || px > 75 || py < 25 || py > 75) {
        outer++;
      }
    }
    // Three quarters of the area lies outside the middle, so about three
    // quarters of the particles should be there: as dense as the middle.
    expect(outer / p.count).toBeGreaterThan(0.7);
    expect(outer / p.count).toBeLessThan(0.8);
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
    expect(colorBand(WIND_COLOR_MAX / COLOR_BANDS)).toBe(1);
    expect(colorBand(WIND_COLOR_MAX / 2)).toBe(COLOR_BANDS / 2);
    expect(colorBand(1000)).toBe(COLOR_BANDS - 1);
  });
});
