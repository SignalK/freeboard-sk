import { describe, it, expect, vi } from 'vitest';
import {
  CHART_TIME_WINDOW_MS,
  chartTimeWindowSpan,
  initialChartTimeWindowEnd,
  chartTimeLoopFromOffsets,
  chartTimeLoopRange,
  chartTimeLoopToOffsets,
  chartTimeStepLabel,
  DEFAULT_CHART_TIME_LOOP,
  chartTimeWindow,
  chartTimeWindowEnd
} from './chart-time-dialog';
import { chartTimeline } from '../../chart-time';

/**
 * The Time palette's slider shows a window of the timeline, since a service
 * can advertise decades of frames. These are the pure rules behind it.
 */
const STEP = 5 * 60 * 1000;
const SPAN = CHART_TIME_WINDOW_MS;
const FROM = Date.parse('1995-01-01T00:00:00.000Z');
const TO = Date.parse('2026-12-31T00:00:00.000Z');
const archive = chartTimeline({
  current: false,
  from: new Date(FROM).toISOString(),
  to: new Date(TO).toISOString(),
  step: STEP
});

describe('chartTimeWindowSpan', () => {
  it('is 12 hours of whole steps on a range', () => {
    expect(chartTimeWindowSpan(archive, TO)).toBe(SPAN);
    const seven = chartTimeline({
      current: true,
      from: '2026-09-18T00:00:00.000Z',
      to: '2026-09-19T00:00:00.000Z',
      step: 7 * 60000
    });
    expect(chartTimeWindowSpan(seven, seven.max)).toBe(102 * 7 * 60000);
  });

  it('counts the explicit frames in the last 12 hours', () => {
    const frames = chartTimeline({
      current: true,
      values: [
        '2026-09-17T00:00:00.000Z', // a day before: outside
        '2026-09-18T00:30:00.000Z',
        '2026-09-18T06:00:00.000Z',
        '2026-09-18T12:00:00.000Z'
      ]
    });
    expect(chartTimeWindowSpan(frames, 3)).toBe(2);
    expect(chartTimeWindow(frames, 3)).toEqual({ min: 1, max: 3 });
    expect(chartTimeWindowSpan(frames, 0)).toBe(1); // never less than a step
  });
});

describe('chartTimeWindow', () => {
  it('spans 12 hours back from its end', () => {
    const end = Date.parse('2026-09-18T12:00:00.000Z');
    expect(chartTimeWindow(archive, end)).toEqual({
      min: end - SPAN,
      max: end
    });
  });

  it('never runs past either end of the timeline', () => {
    expect(chartTimeWindow(archive, TO + SPAN)).toEqual({
      min: TO - SPAN,
      max: TO
    });
    expect(chartTimeWindow(archive, FROM)).toEqual({
      min: FROM,
      max: FROM + SPAN
    });
  });

  it('is the whole timeline when that is shorter than the window', () => {
    const short = chartTimeline({
      current: true,
      from: '2026-09-18T12:00:00.000Z',
      to: '2026-09-18T15:00:00.000Z',
      step: STEP
    });
    expect(chartTimeWindow(short, short.max)).toEqual({
      min: short.min,
      max: short.max
    });
  });
});

describe('chartTimeWindowEnd', () => {
  const end = Date.parse('2026-09-18T12:00:00.000Z');

  it('stays put while the instant is inside the window', () => {
    expect(chartTimeWindowEnd(archive, end, end - SPAN / 2)).toBe(end);
    expect(chartTimeWindowEnd(archive, end, end)).toBe(end);
    expect(chartTimeWindowEnd(archive, end, end - SPAN)).toBe(end);
  });

  it('follows the instant out past the end', () => {
    expect(chartTimeWindowEnd(archive, end, end + STEP)).toBe(end + STEP);
  });

  it('follows the instant out before the start, keeping it at the window start', () => {
    const jumped = Date.parse('2019-03-01T00:00:00.000Z');
    const newEnd = chartTimeWindowEnd(archive, end, jumped);
    expect(chartTimeWindow(archive, newEnd).min).toBe(jumped);
  });
});

describe('chartTimeStepLabel', () => {
  it('labels a cadence compactly', () => {
    expect(chartTimeStepLabel(STEP)).toBe('5 min');
    expect(chartTimeStepLabel(60 * 60000)).toBe('1 h');
    expect(chartTimeStepLabel(390 * 60000)).toBe('6 h 30 min');
    expect(chartTimeStepLabel(24 * 60 * 60000)).toBe('1 d');
    expect(chartTimeStepLabel(30 * 60000 + 30000)).toBe('31 min');
    expect(chartTimeStepLabel(15000)).toBe('15 s');
  });
});

describe('chartTimeLoopRange', () => {
  const window = { min: 100, max: 200 };

  it('is the whole window when no bound is set', () => {
    expect(chartTimeLoopRange(window, null, null)).toEqual(window);
  });

  it('applies either bound alone', () => {
    expect(chartTimeLoopRange(window, 120, null)).toEqual({
      min: 120,
      max: 200
    });
    expect(chartTimeLoopRange(window, null, 150)).toEqual({
      min: 100,
      max: 150
    });
  });

  it('clamps bounds into the window as it moves', () => {
    expect(chartTimeLoopRange(window, 50, 150)).toEqual({ min: 100, max: 150 });
    expect(chartTimeLoopRange(window, 120, 400)).toEqual({
      min: 120,
      max: 200
    });
  });

  it('falls back to the whole window once it has moved clear of the loop', () => {
    expect(chartTimeLoopRange(window, 300, 400)).toEqual(window);
    expect(chartTimeLoopRange(window, 10, 50)).toEqual(window);
  });
});

describe('loop offsets (remembered between sessions)', () => {
  const H = 3600000;
  const end = Date.parse('2026-09-18T12:00:00.000Z');
  const window = { min: end - SPAN, max: end };

  it('opens on the last hour by default', () => {
    expect(
      chartTimeLoopFromOffsets(archive, window, end, DEFAULT_CHART_TIME_LOOP)
    ).toEqual({ min: end - H, max: end });
  });

  it('round-trips a remembered range through offsets before the newest frame', () => {
    const loop = { min: end - 3 * H, max: end - H };
    const offsets = chartTimeLoopToOffsets(archive, end, loop);
    expect(offsets).toEqual({ start: 3 * H, end: H });
    expect(chartTimeLoopFromOffsets(archive, window, end, offsets)).toEqual(
      loop
    );
  });

  it('lands each end on a frame and keeps the loop inside the window', () => {
    // 6 h 2 min back is not on the 5-minute grid; a week back is outside a
    // 24 h window.
    const loop = chartTimeLoopFromOffsets(archive, window, end, {
      start: 7 * 24 * H,
      end: 6 * H + 2 * 60000
    });
    expect(loop.min).toBe(window.min);
    expect((loop.max - archive.min) % STEP).toBe(0);
    expect(Math.abs(end - 6 * H - loop.max)).toBeLessThanOrEqual(STEP / 2);
  });

  it("falls back to the window's last hour when the remembered range is clear of it", () => {
    // Remembered "last hour" but the palette opened deep in the archive.
    const deep = { min: end - 30 * 24 * H - SPAN, max: end - 30 * 24 * H };
    expect(
      chartTimeLoopFromOffsets(archive, deep, end, DEFAULT_CHART_TIME_LOOP)
    ).toEqual({ min: deep.max - H, max: deep.max });
  });

  it('keeps a single-frame loop as one', () => {
    const one = { start: H, end: H };
    const loop = chartTimeLoopFromOffsets(archive, window, end, one);
    expect(loop).toEqual({ min: end - H, max: end - H });
    expect(chartTimeLoopToOffsets(archive, end, loop)).toEqual(one);
  });

  it('picks the nearest explicit frames on a values timeline', () => {
    const frames = chartTimeline({
      current: true,
      values: [
        '2026-09-18T10:00:00.000Z',
        '2026-09-18T11:10:00.000Z',
        '2026-09-18T11:40:00.000Z',
        '2026-09-18T12:00:00.000Z'
      ]
    });
    expect(
      chartTimeLoopFromOffsets(frames, frames, end, DEFAULT_CHART_TIME_LOOP)
    ).toEqual({ min: 1, max: 3 });
    expect(chartTimeLoopToOffsets(frames, end, { min: 1, max: 3 })).toEqual({
      start: 50 * 60000,
      end: 0
    });
  });
});

describe('initialChartTimeWindowEnd', () => {
  const H = 3600000;
  const now = Date.parse('2026-09-18T12:00:00.000Z');
  const seven = chartTimeline({
    current: true,
    from: '2026-09-11T00:00:00.000Z',
    to: '2026-09-19T00:00:00.000Z',
    step: 5 * 60000
  });

  it('opens at the newest frame while the shown instant is within a window of it', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
    try {
      // Live, and scrubbed an hour back: both open at now, so the loop
      // (anchored to now) and the playhead share the bar.
      expect(initialChartTimeWindowEnd(seven, now)).toBe(now);
      expect(initialChartTimeWindowEnd(seven, now - H)).toBe(now);
      expect(initialChartTimeWindowEnd(seven, now - 11 * H)).toBe(now);
    } finally {
      vi.useRealTimers();
    }
  });

  it('opens at the shown instant when that is deep in the archive', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
    try {
      const deep = now - 3 * 24 * H;
      expect(initialChartTimeWindowEnd(seven, deep)).toBe(deep);
    } finally {
      vi.useRealTimers();
    }
  });
});
