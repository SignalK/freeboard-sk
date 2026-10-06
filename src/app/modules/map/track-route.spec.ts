import { describe, expect, it } from 'vitest';

import { Position } from 'src/app/types';
import { TimedTrack } from 'src/app/modules/skstream/track-history';
import {
  OTHER_STOP_MS,
  OWN_STOP_MS,
  ROUTE_TOLERANCE_M,
  STOP_RADIUS_M,
  trackSectionRoute,
  trackSectionSpan
} from './track-route';

const M = 111320;
const T0 = Date.UTC(2026, 9, 1, 6, 0, 0);
const MIN = 60000;

/** `base` moved `east` and `north` metres. */
const at = (base: Position, east: number, north: number): Position => {
  const lon = base[0] + east / (M * Math.cos((base[1] * Math.PI) / 180));
  return [((((lon + 180) % 360) + 360) % 360) - 180, base[1] + north / M];
};
const distM = (a: Position, b: Position) => {
  let dLon = (b[0] - a[0]) % 360;
  dLon = dLon > 180 ? dLon - 360 : dLon < -180 ? dLon + 360 : dLon;
  const k = Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180);
  return Math.hypot(dLon * k * M, (b[1] - a[1]) * M);
};

/** Builds a recorded track one stretch at a time, a point a minute. */
class Recorder {
  lines: Position[][] = [[]];
  times: string[][] = [[]];
  t = T0;
  pos: Position;

  constructor(start: Position) {
    this.pos = start;
  }

  private add(p: Position) {
    this.lines[this.lines.length - 1].push(p);
    this.times[this.times.length - 1].push(new Date(this.t).toISOString());
    this.pos = p;
    this.t += MIN;
  }

  /** Lie at anchor here for `minutes`, swinging round it `swing` metres off,
   * once every 20 minutes, from `phase` (radians from east). */
  stay(minutes: number, swing = 60, phase = 0) {
    const anchor = this.pos;
    for (let i = 0; i < minutes; i++) {
      const a = phase + (i / 10) * Math.PI;
      this.add(at(anchor, swing * Math.cos(a), swing * Math.sin(a)));
    }
    this.pos = anchor;
    return this;
  }

  /** Sail in a straight line to `east`/`north` metres away, over `minutes`. */
  sail(east: number, north: number, minutes: number) {
    const from = this.pos;
    for (let i = 1; i <= minutes; i++) {
      this.add(at(from, (east * i) / minutes, (north * i) / minutes));
    }
    return this;
  }

  /** Stop recording for `minutes`, then carry on from `east`/`north` away. */
  gap(minutes: number, east: number, north: number) {
    this.t += minutes * MIN;
    this.pos = at(this.pos, east, north);
    this.lines.push([]);
    this.times.push([]);
    return this;
  }

  get track(): TimedTrack {
    return { lines: this.lines, times: this.times };
  }
}

const A: Position = [177.2, -17.8];
const B = at(A, 10000, 0);
const C = at(B, 0, 10000);

describe('trackSectionRoute', () => {
  // anchored at A, sail to B, anchored at B, sail to C, anchored at C
  const day = () =>
    new Recorder(A)
      .stay(120)
      .sail(10000, 0, 60)
      .stay(120)
      .sail(0, 10000, 60)
      .stay(120);

  it('runs between the anchorages either side of the tap, in recorded order', () => {
    const route = trackSectionRoute(day().track, at(A, 5000, 0), OWN_STOP_MS);

    expect(route).toBeDefined();
    expect(distM(route[0], A)).toBeLessThan(30);
    expect(distM(route[route.length - 1], B)).toBeLessThan(30);
    route.forEach((p) => expect(distM(p, C)).toBeGreaterThan(9000));
  });

  it('takes the next passage for a tap further along', () => {
    const route = trackSectionRoute(day().track, at(B, 0, 5000), OWN_STOP_MS);

    expect(distM(route[0], B)).toBeLessThan(30);
    expect(distM(route[route.length - 1], C)).toBeLessThan(30);
  });

  it('runs to the end of the track while the vessel is still under way', () => {
    const rec = new Recorder(A).stay(120).sail(10000, 0, 60);
    const route = trackSectionRoute(rec.track, at(A, 5000, 0), OWN_STOP_MS);

    expect(distM(route[0], A)).toBeLessThan(30);
    expect(distM(route[route.length - 1], rec.pos)).toBeLessThan(1);
  });

  it('runs from the start of the track when no stop came before', () => {
    const rec = new Recorder(A).sail(10000, 0, 60).stay(120);
    const route = trackSectionRoute(rec.track, at(A, 5000, 0), OWN_STOP_MS);

    expect(distM(route[0], at(A, 10000 / 60, 0))).toBeLessThan(1);
    expect(distM(route[route.length - 1], B)).toBeLessThan(30);
  });

  it('keeps straight sailing to its ends, and a turn within the tolerance', () => {
    const rec = new Recorder(A)
      .stay(120)
      .sail(5000, 0, 30)
      .sail(0, 3 * ROUTE_TOLERANCE_M, 1)
      .sail(5000, 0, 30)
      .stay(120);
    const route = trackSectionRoute(rec.track, at(A, 2000, 0), OWN_STOP_MS);

    // anchorage, the two corners of the jog, anchorage
    expect(route).toHaveLength(4);
  });

  describe('a shorter stop on the way', () => {
    // a 20-minute stop at a corner between A and B
    const corner = at(A, 5000, 0);
    const track = () =>
      new Recorder(A)
        .stay(120)
        .sail(5000, 0, 30)
        .stay(20)
        .sail(5000, 5000, 30)
        .stay(120).track;

    it('is one point of the own vessel’s route, not a zigzag', () => {
      const route = trackSectionRoute(track(), at(A, 2000, 0), OWN_STOP_MS);

      const near = route.filter((p) => distM(p, corner) < STOP_RADIUS_M);
      expect(near).toHaveLength(1);
      expect(distM(near[0], corner)).toBeLessThan(30);
      expect(
        distM(route[route.length - 1], at(corner, 5000, 5000))
      ).toBeLessThan(30);
    });

    it('ends another vessel’s passage, as a ferry terminal does', () => {
      const route = trackSectionRoute(track(), at(A, 2000, 0), OTHER_STOP_MS);

      expect(distM(route[0], A)).toBeLessThan(30);
      expect(distM(route[route.length - 1], corner)).toBeLessThan(30);
    });
  });

  it('stops short of a gap in the recording the vessel moved across', () => {
    const rec = new Recorder(A).stay(120).sail(4000, 0, 30);
    const lastBeforeGap = rec.pos;
    rec.gap(120, 3000, 0).sail(3000, 0, 30).stay(120);
    const route = trackSectionRoute(rec.track, at(A, 2000, 0), OWN_STOP_MS);

    expect(distM(route[0], A)).toBeLessThan(30);
    expect(distM(route[route.length - 1], lastBeforeGap)).toBeLessThan(1);
  });

  it('treats a gap while at anchor as part of the stop', () => {
    // swinging wide, the recording resumes across the circle from where it
    // paused: further apart than a vessel moves while stopped
    const rec = new Recorder(at(A, -10000, 0))
      .sail(10000, 0, 60)
      .stay(60, 150)
      .gap(600, 0, 0)
      .stay(60, 150, Math.PI)
      .sail(10000, 0, 60)
      .stay(120);

    [at(A, 5000, 0), at(A, 150, 0)].forEach((tap) => {
      const route = trackSectionRoute(rec.track, tap, OWN_STOP_MS);
      expect(distM(route[0], A)).toBeLessThan(30);
      expect(distM(route[route.length - 1], B)).toBeLessThan(30);
    });
  });

  it('gives the passage leaving a stop for a tap on the stop', () => {
    const route = trackSectionRoute(day().track, B, OWN_STOP_MS);

    expect(distM(route[0], B)).toBeLessThan(30);
    expect(distM(route[route.length - 1], C)).toBeLessThan(30);
  });

  it('gives the passage arriving for a tap on the stop the track ends at', () => {
    const route = trackSectionRoute(day().track, C, OWN_STOP_MS);

    expect(distM(route[0], B)).toBeLessThan(30);
    expect(distM(route[route.length - 1], C)).toBeLessThan(30);
  });

  it('crosses the antimeridian without a detour round the world', () => {
    const west: Position = [179.97, -17];
    const rec = new Recorder(west).stay(120).sail(6000, 0, 40).stay(120);
    const route = trackSectionRoute(rec.track, at(west, 3000, 0), OWN_STOP_MS);

    expect(distM(route[0], west)).toBeLessThan(30);
    expect(distM(route[route.length - 1], at(west, 6000, 0))).toBeLessThan(30);
    expect(route[route.length - 1][0]).toBeLessThan(-179);
    route.forEach((p) => expect(Math.abs(p[0])).toBeLessThanOrEqual(180));
    for (let i = 1; i < route.length; i++) {
      expect(distM(route[i - 1], route[i])).toBeLessThan(7000);
    }
  });

  it('keeps a stop astride the antimeridian on the chart', () => {
    const anchor: Position = [179.9995, -17];
    const rec = new Recorder(anchor).stay(120).sail(-6000, 0, 40).stay(120);
    const route = trackSectionRoute(
      rec.track,
      at(anchor, -3000, 0),
      OWN_STOP_MS
    );

    expect(Math.abs(route[0][0])).toBeLessThanOrEqual(180);
    expect(distM(route[0], anchor)).toBeLessThan(30);
  });

  it('uses only points with a recording time', () => {
    const rec = day();
    const untimed: TimedTrack = {
      lines: rec.lines,
      times: rec.times.map((line) => line.map(() => undefined))
    };
    expect(trackSectionRoute(untimed, at(A, 5000, 0), OWN_STOP_MS)).toBe(
      undefined
    );
  });
});

describe('trackSectionSpan', () => {
  it('spans the passage with the stops either side', () => {
    // anchored at A 06:00-08:00, to B by 09:00, anchored there until 11:00,
    // on to C by 12:00, anchored until 14:00
    const track = new Recorder(A)
      .stay(120)
      .sail(10000, 0, 60)
      .stay(120)
      .sail(0, 10000, 60)
      .stay(120).track;

    const span = trackSectionSpan(track, at(B, 0, 5000), OWN_STOP_MS);

    // the anchorages begin as the vessel comes within the swing circle
    expect(Math.abs(span.from - (T0 + 180 * MIN))).toBeLessThanOrEqual(2 * MIN);
    expect(span.to).toBe(T0 + 479 * MIN);
  });
});
