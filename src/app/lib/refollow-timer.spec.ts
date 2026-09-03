import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { isRefollowActivity, RefollowTimer } from './refollow-timer';

describe('RefollowTimer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('resumes follow mode once the delay elapses', () => {
    const onExpire = vi.fn();
    const timer = new RefollowTimer(onExpire);

    timer.arm(5);
    expect(timer.armed).toBe(true);

    vi.advanceTimersByTime(4999);
    expect(onExpire).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(timer.armed).toBe(false);
  });

  it('never arms for a zero delay — the backward-compatible default', () => {
    const onExpire = vi.fn();
    const timer = new RefollowTimer(onExpire);

    timer.arm(0);

    expect(timer.armed).toBe(false);
    vi.advanceTimersByTime(60000);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('measures idle time — further activity restarts the countdown', () => {
    const onExpire = vi.fn();
    const timer = new RefollowTimer(onExpire);

    timer.arm(5);
    vi.advanceTimersByTime(4000);
    timer.reset(); // a pan or zoom lands 1s before it would have fired
    vi.advanceTimersByTime(4000);
    expect(onExpire).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('ignores activity while not armed', () => {
    const onExpire = vi.fn();
    const timer = new RefollowTimer(onExpire);

    timer.reset();

    expect(timer.armed).toBe(false);
    vi.advanceTimersByTime(60000);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('cancels a running countdown, and does not restart on later activity', () => {
    const onExpire = vi.fn();
    const timer = new RefollowTimer(onExpire);

    timer.arm(5);
    vi.advanceTimersByTime(2000);
    timer.cancel(); // e.g. the user tapped Follow themselves
    expect(timer.armed).toBe(false);

    timer.reset();
    vi.advanceTimersByTime(60000);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('fires once only — a spent countdown cannot be restarted by activity', () => {
    const onExpire = vi.fn();
    const timer = new RefollowTimer(onExpire);

    timer.arm(5);
    vi.advanceTimersByTime(5000);
    expect(onExpire).toHaveBeenCalledTimes(1);

    timer.reset();
    vi.advanceTimersByTime(60000);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('re-arming replaces the countdown already running', () => {
    const onExpire = vi.fn();
    const timer = new RefollowTimer(onExpire);

    timer.arm(30);
    vi.advanceTimersByTime(20000);
    timer.arm(5);

    vi.advanceTimersByTime(4999);
    expect(onExpire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('never arms for a delay that is not a usable number', () => {
    const onExpire = vi.fn();
    const timer = new RefollowTimer(onExpire);

    timer.arm(NaN);
    expect(timer.armed).toBe(false);

    timer.arm(-5);
    expect(timer.armed).toBe(false);

    vi.advanceTimersByTime(60000);
    expect(onExpire).not.toHaveBeenCalled();
  });
});

describe('isRefollowActivity', () => {
  const HERE: [number, number] = [24.7, 59.7];

  it('counts a zoom as activity', () => {
    expect(isRefollowActivity({ lonlat: HERE, zoomChanged: true }, HERE)).toBe(
      true
    );
  });

  it('counts a move of the centre as activity even with no zoom change', () => {
    // OpenLayers' keyboardpan moves the view with the arrow keys: it fires a
    // move-end but emits no pointerdrag and changes no zoom, so the centre is
    // the only evidence that the user panned.
    expect(
      isRefollowActivity({ lonlat: [24.8, 59.7], zoomChanged: false }, HERE)
    ).toBe(true);
    expect(
      isRefollowActivity({ lonlat: [24.7, 59.8], zoomChanged: false }, HERE)
    ).toBe(true);
  });

  it('does NOT count a rotation-only move-end as activity', () => {
    // Heading-up re-rotates the chart on every heading update, follow mode on or
    // off, and each rotation ends in its own move-end — same centre, same zoom.
    // Counting those held the countdown open forever (#714).
    expect(isRefollowActivity({ lonlat: HERE, zoomChanged: false }, HERE)).toBe(
      false
    );
  });

  it('does NOT count the first move-end, which has no previous centre', () => {
    expect(isRefollowActivity({ lonlat: HERE, zoomChanged: false }, null)).toBe(
      false
    );
    expect(isRefollowActivity({})).toBe(false);
  });
});

describe('RefollowTimer under a heading-up chart (#714 regression)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('still resumes while rotation-only move-ends keep arriving', () => {
    // The failing case from the boat: pan to release follow mode, then let the
    // vessel carry on under way so heading-up fires a move-end every second.
    // Feeding those to reset() pushed the deadline out on every one of them and
    // follow mode never came back.
    const onExpire = vi.fn();
    const timer = new RefollowTimer(onExpire);
    timer.arm(5);

    const helm: [number, number] = [24.7, 59.7];
    for (let second = 0; second < 10; second++) {
      const rotationOnlyMoveEnd = { lonlat: helm, zoomChanged: false };
      if (isRefollowActivity(rotationOnlyMoveEnd, helm)) {
        timer.reset();
      }
      vi.advanceTimersByTime(1000);
    }

    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('an arrow-key pan during the countdown still defers the resume', () => {
    // keyboardpan produces no pointerdrag, so the move-end's centre is the only
    // signal that the user panned. Without it the chart could snatch itself back
    // mid-pan.
    const onExpire = vi.fn();
    const timer = new RefollowTimer(onExpire);
    timer.arm(5);

    vi.advanceTimersByTime(4000);
    if (
      isRefollowActivity(
        { lonlat: [24.8, 59.7], zoomChanged: false },
        [24.7, 59.7]
      )
    ) {
      timer.reset();
    }
    vi.advanceTimersByTime(4000);
    expect(onExpire).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('a zoom during the countdown still defers the resume', () => {
    const onExpire = vi.fn();
    const timer = new RefollowTimer(onExpire);
    timer.arm(5);

    vi.advanceTimersByTime(4000);
    if (isRefollowActivity({ zoomChanged: true })) {
      timer.reset();
    }
    vi.advanceTimersByTime(4000);
    expect(onExpire).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });
});
