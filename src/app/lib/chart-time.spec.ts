import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import {
  chartTimeFromCapabilities,
  chartTimeTileUrl,
  chartTimeline,
  chartTimelineInstant,
  chartTimelinePosition,
  initialChartTime,
  isChartTimeInstant,
  nextChartPlaybackTime,
  stepChartTime
} from './chart-time';

const T0 = '2026-09-18T12:00:00.000Z';
const T1 = '2026-09-18T12:05:00.000Z';
const T2 = '2026-09-18T12:10:00.000Z';
const STEP = 5 * 60 * 1000;
// "Now" for the tests: between T1 and T2, off the 5-minute grid.
const NOW = '2026-09-18T12:07:00.000Z';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
});
afterEach(() => vi.useRealTimers());

describe('chartTimeTileUrl', () => {
  it('substitutes the URL-encoded instant for every {time}', () => {
    expect(
      chartTimeTileUrl('/r/{z}/{x}/{y}.png?time={time}&t={time}', T0)
    ).toBe(
      '/r/{z}/{x}/{y}.png?time=2026-09-18T12%3A00%3A00.000Z&t=2026-09-18T12%3A00%3A00.000Z'
    );
  });

  it('leaves the other tile placeholders for the tile source', () => {
    expect(chartTimeTileUrl('/r/{z}/{x}/{-y}.png?t={time}', T0)).toContain(
      '/r/{z}/{x}/{-y}.png?t='
    );
  });

  it('returns a template without the placeholder unchanged', () => {
    expect(chartTimeTileUrl('/r/{z}/{x}/{y}.png', T0)).toBe(
      '/r/{z}/{x}/{y}.png'
    );
  });
});

describe('isChartTimeInstant', () => {
  it('accepts an ISO 8601 instant and rejects anything else', () => {
    expect(isChartTimeInstant(T0)).toBe(true);
    expect(isChartTimeInstant('2026-09-18T14:35:00Z')).toBe(true);
    expect(isChartTimeInstant('2026-09-18T14:35-04:00')).toBe(true);
    expect(isChartTimeInstant('2026-09-18T23:30+0100')).toBe(true);
    expect(isChartTimeInstant('2026-09-18')).toBe(true);
    expect(isChartTimeInstant('2028-02-29T00:00:00Z')).toBe(true); // leap day
    expect(isChartTimeInstant('noon')).toBe(false);
    // A time without a zone would mean a different frame on every boat.
    expect(isChartTimeInstant('2026-09-18T14:35')).toBe(false);
    expect(isChartTimeInstant('2026-09-18T14:35:00.000')).toBe(false);
    // Impossible dates that Date.parse would roll over.
    expect(isChartTimeInstant('2026-02-29T00:00:00Z')).toBe(false);
    expect(isChartTimeInstant('2024-02-30T00:00:00Z')).toBe(false);
    expect(isChartTimeInstant('2026-04-31')).toBe(false);
    // Still valid when the zone shifts the UTC date.
    expect(isChartTimeInstant('2026-09-30T23:30-04:00')).toBe(true);
    expect(isChartTimeInstant('2026-10-01T00:30+04:00')).toBe(true);
    // Date.parse takes these; the contract does not.
    expect(isChartTimeInstant('September 18, 2026')).toBe(false);
    expect(isChartTimeInstant('2026/09/18')).toBe(false);
    expect(isChartTimeInstant('09/18/2026')).toBe(false);
    // Well-formed but not a real date.
    expect(isChartTimeInstant('2026-13-45T00:00:00Z')).toBe(false);
    expect(isChartTimeInstant('')).toBe(false);
    expect(isChartTimeInstant(null)).toBe(false);
    expect(isChartTimeInstant(1758196800000)).toBe(false);
  });
});

describe('initialChartTime', () => {
  it('starts a live source (or a chart without a dimension) live', () => {
    expect(initialChartTime(undefined)).toBeNull();
    expect(initialChartTime({ current: true, from: T0, to: T2 })).toBeNull();
  });

  it('starts an archival source at its newest frame that can exist', () => {
    // A declared end ahead of now is not a frame yet: the newest frame is the
    // one on the grid at (or before) now.
    expect(
      initialChartTime({
        current: false,
        from: T0,
        to: '2026-12-31T00:00:00.000Z',
        step: STEP
      })
    ).toBe(T1);
    // An archive that ended in the past starts at its end.
    const past = { from: '2026-09-17T00:00:00.000Z', to: T0, step: STEP };
    expect(initialChartTime({ current: false, ...past })).toBe(T0);
    expect(initialChartTime({ current: false, values: [T1, T0] })).toBe(T1);
  });

  it('has nowhere to start an archival source with no timeline', () => {
    expect(initialChartTime({ current: false })).toBeNull();
  });
});

describe('chartTimeline', () => {
  it('is a frame index over explicit values, sorted ascending', () => {
    const tl = chartTimeline({ current: true, values: [T2, T0, T1] });
    expect(tl).toEqual({ min: 0, max: 2, step: 1, frames: [T0, T1, T2] });
  });

  it('drops invalid values and prefers values over a range', () => {
    const tl = chartTimeline({
      current: true,
      from: T0,
      to: T2,
      values: [T1, 'garbage']
    });
    expect(tl?.frames).toEqual([T1]);
  });

  it('is a millisecond range over from…to at the declared step', () => {
    const tl = chartTimeline({ current: true, from: T0, to: T2, step: STEP });
    expect(tl).toEqual({
      min: Date.parse(T0),
      max: Date.parse(T2),
      step: STEP
    });
  });

  it('derives a step when none is declared, never below a minute', () => {
    const hour = chartTimeline({
      current: true,
      from: T0,
      to: '2026-09-18T13:00:00.000Z'
    });
    expect(hour?.step).toBe(60000); // 60 frames of an hour = 1 min
    const short = chartTimeline({ current: true, from: T0, to: T1 });
    expect(short?.step).toBe(60000); // floor
    const day = chartTimeline({
      current: true,
      from: T0,
      to: '2026-09-19T12:00:00.000Z'
    });
    expect(day?.step).toBe(24 * 60000); // a day in 60 frames
  });

  it('is null without a usable range', () => {
    expect(chartTimeline(undefined)).toBeNull();
    expect(chartTimeline({ current: true })).toBeNull();
    expect(chartTimeline({ current: true, from: T0 })).toBeNull();
    expect(chartTimeline({ current: true, from: T2, to: T0 })).toBeNull();
    expect(chartTimeline({ current: true, values: ['x'] })).toBeNull();
  });
});

describe('positions and instants', () => {
  const range = chartTimeline({ current: true, from: T0, to: T2, step: STEP });
  const discrete = chartTimeline({ current: true, values: [T0, T1, T2] });

  it('maps an instant to its position and back on a range', () => {
    expect(chartTimelinePosition(range, T1)).toBe(Date.parse(T1));
    expect(chartTimelineInstant(range, Date.parse(T1))).toBe(T1);
  });

  it('clamps a range position to the timeline', () => {
    expect(chartTimelinePosition(range, '2020-01-01T00:00:00Z')).toBe(
      range.min
    );
    expect(chartTimelineInstant(range, range.max + STEP)).toBe(T2);
  });

  it('snaps to the nearest frame on a discrete timeline', () => {
    expect(chartTimelinePosition(discrete, '2026-09-18T12:04:00Z')).toBe(1);
    expect(chartTimelinePosition(discrete, '2026-09-18T12:02:00Z')).toBe(0);
    expect(chartTimelineInstant(discrete, 2)).toBe(T2);
    expect(chartTimelineInstant(discrete, 7)).toBe(T2);
  });

  it('places live at the newest frame at or before now', () => {
    expect(chartTimelinePosition(range, null)).toBe(Date.parse(T1));
    expect(chartTimelinePosition(discrete, null)).toBe(1); // T1 ≤ now < T2
    const past = chartTimeline({
      current: true,
      from: '2026-09-17T00:00:00.000Z',
      to: T0,
      step: STEP
    });
    expect(chartTimelinePosition(past, null)).toBe(past.max);
  });

  it('snaps a range instant to the from + n·step grid', () => {
    // Off-grid positions (now, a typed time) must become frames the service
    // actually serves.
    expect(chartTimelineInstant(range, Date.parse(NOW))).toBe(T1);
    expect(chartTimelineInstant(range, Date.parse(T1) + 2.6 * 60000)).toBe(T2);
    // The grid is anchored at `from`, and never runs past `to`.
    const ragged = chartTimeline({
      current: true,
      from: T0,
      to: '2026-09-18T12:12:00.000Z',
      step: STEP
    });
    expect(chartTimelineInstant(ragged, ragged.max)).toBe(T2);
  });
});

describe('stepChartTime', () => {
  const tl = chartTimeline({ current: true, from: T0, to: T2, step: STEP });

  it('steps one frame either way', () => {
    expect(stepChartTime(tl, T1, -1, true)).toBe(T0);
    expect(stepChartTime(tl, T1, 1, true)).toBe(T2);
  });

  it('steps back from live onto the newest frame, and stays live forward', () => {
    expect(stepChartTime(tl, null, -1, true)).toBe(T2);
    expect(stepChartTime(tl, null, 1, true)).toBeNull();
  });

  it('returns to live past the end of a live source, else holds the last frame', () => {
    expect(stepChartTime(tl, T2, 1, true)).toBeNull();
    expect(stepChartTime(tl, T2, 1, false)).toBe(T2);
  });

  it('holds the first frame stepping back off the start', () => {
    expect(stepChartTime(tl, T0, -1, true)).toBe(T0);
  });
});

describe('nextChartPlaybackTime', () => {
  const tl = chartTimeline({ current: true, values: [T0, T1, T2] });

  it('advances a frame and loops to the start past the end', () => {
    expect(nextChartPlaybackTime(tl, T0)).toBe(T1);
    expect(nextChartPlaybackTime(tl, T2)).toBe(T0);
  });

  it('starts from the first frame when live', () => {
    expect(nextChartPlaybackTime(tl, null)).toBe(T0);
  });

  it('loops within a window of the timeline when given one', () => {
    const range = chartTimeline({
      current: true,
      from: '2026-09-18T00:00:00.000Z',
      to: T2,
      step: STEP
    });
    const window = { min: Date.parse(T0), max: Date.parse(T2) };
    expect(nextChartPlaybackTime(range, T2, window)).toBe(T0); // wraps
    expect(nextChartPlaybackTime(range, null, window)).toBe(T0); // from live
    // An instant outside the window restarts at the window's first frame.
    expect(
      nextChartPlaybackTime(range, '2026-09-18T06:00:00.000Z', window)
    ).toBe(T0);
  });
});

describe('chartTimeFromCapabilities', () => {
  it('maps a parsed WMS/WMTS range to a live chart time block', () => {
    expect(
      chartTimeFromCapabilities({ from: T0, to: T2, interval: STEP })
    ).toEqual({ current: true, from: T0, to: T2, step: STEP });
  });

  it('carries explicit values, sorted', () => {
    expect(chartTimeFromCapabilities({ values: [T1, T0] })).toEqual({
      current: true,
      values: [T0, T1]
    });
  });

  it('yields nothing for a dimension with no usable range', () => {
    expect(chartTimeFromCapabilities(undefined)).toBeUndefined();
    expect(chartTimeFromCapabilities({ from: null, to: null })).toBeUndefined();
    expect(chartTimeFromCapabilities({ interval: 0 })).toBeUndefined();
  });

  it('is live when the service default is absent or symbolic', () => {
    const range = { from: T0, to: T2, interval: STEP };
    expect(chartTimeFromCapabilities({ ...range })?.current).toBe(true);
    expect(
      chartTimeFromCapabilities({ ...range, current: null })?.current
    ).toBe(true);
    expect(
      chartTimeFromCapabilities({ ...range, current: 'current' })?.current
    ).toBe(true);
    expect(
      chartTimeFromCapabilities({ ...range, current: 'PRESENT' })?.current
    ).toBe(true);
  });

  it('is live when the default is the newest frame, archival when it is a fixed past instant', () => {
    const range = { from: T0, to: T2, interval: STEP };
    expect(chartTimeFromCapabilities({ ...range, current: T2 })?.current).toBe(
      true
    );
    // IEM NEXRAD: 1995…2026 at 5 min, default a day in 2006 — no TIME means
    // 2006, which is nobody's idea of live.
    expect(
      chartTimeFromCapabilities({
        from: '1995-01-01T00:00:00.000Z',
        to: '2026-12-31T00:00:00.000Z',
        interval: STEP,
        current: '2006-06-23T03:10:00Z'
      })?.current
    ).toBe(false);
    expect(
      chartTimeFromCapabilities({ values: [T0, T1, T2], current: T2 })?.current
    ).toBe(true);
    expect(
      chartTimeFromCapabilities({ values: [T0, T1, T2], current: T0 })?.current
    ).toBe(false);
  });
});
