import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CursorPin,
  DEFAULT_TAP_FADE_SPEED,
  MIN_TAP_FADE_SPEED,
  tapFadeMs
} from './cursor-marker';
import { Position } from 'src/app/types';

const TAPPED: Position = [151.2, -33.85];
const FADE = 3000;

describe('tapFadeMs', () => {
  it('converts the configured seconds to ms', () => {
    expect(tapFadeMs(4.5)).toBe(4500);
  });

  it('falls back to the default when unset or not a number', () => {
    const fallback = DEFAULT_TAP_FADE_SPEED * 1000;
    expect(tapFadeMs(undefined)).toBe(fallback);
    expect(tapFadeMs(null)).toBe(fallback);
    expect(tapFadeMs(NaN)).toBe(fallback);
  });

  it('raises a too-fast value to the minimum rather than to the default', () => {
    // The form flags a sub-minimum entry but still persists it, and the user
    // asked for "fast" — reverting to the slower default would fight them.
    expect(tapFadeMs(0.2)).toBe(MIN_TAP_FADE_SPEED * 1000);
    expect(tapFadeMs(-5)).toBe(MIN_TAP_FADE_SPEED * 1000);
  });

  it('leaves a slow fade alone — the setting has no upper bound', () => {
    expect(tapFadeMs(30)).toBe(30000);
  });

  it('caps an absurd fade at what a timer can hold', () => {
    // Past the signed-32-bit limit setTimeout overflows and fires immediately,
    // which would expire the pin instantly — the opposite of "very slow".
    expect(tapFadeMs(60 * 60 * 24 * 365)).toBe(2147483647);
  });
});

describe('CursorPin', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('is inactive until a tap pins it', () => {
    const pin = new CursorPin();
    expect(pin.active).toBe(false);
    expect(pin.marker()).toBeNull();
  });

  it('marks the tapped point in the world copy it was tapped in', () => {
    const pin = new CursorPin();
    pin.pin(TAPPED, 40075016.68, FADE);

    expect(pin.active).toBe(true);
    expect(pin.marker()).toMatchObject({
      position: TAPPED,
      worldOffset: 40075016.68,
      fadeMs: FADE
    });
  });

  it('holds the pin for the whole marker fade, then expires', () => {
    const onExpire = vi.fn();
    const pin = new CursorPin(onExpire);
    pin.pin(TAPPED, 0, FADE);

    // Still pinned while the marker is mid-fade — the readout must not resume
    // updating until the mark explaining it has actually gone.
    vi.advanceTimersByTime(FADE - 1);
    expect(pin.active).toBe(true);
    expect(onExpire).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(pin.active).toBe(false);
    expect(pin.marker()).toBeNull();
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('expires on the fade the tap was given, not a fixed one', () => {
    const onExpire = vi.fn();
    const pin = new CursorPin(onExpire);
    pin.pin(TAPPED, 0, 8000);

    vi.advanceTimersByTime(FADE);
    expect(pin.active).toBe(true);

    vi.advanceTimersByTime(8000 - FADE);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('gives each tap a new id so the fade animation restarts', () => {
    const pin = new CursorPin();
    pin.pin(TAPPED, 0, FADE);
    const first = pin.marker()?.id;

    pin.pin([0, 0], 0, FADE);
    expect(pin.marker()?.id).not.toBe(first);
  });

  it('restarts the countdown on a re-tap rather than expiring on the old one', () => {
    const onExpire = vi.fn();
    const pin = new CursorPin(onExpire);
    pin.pin(TAPPED, 0, FADE);

    vi.advanceTimersByTime(FADE - 1);
    pin.pin([0, 0], 0, FADE);

    vi.advanceTimersByTime(1);
    expect(pin.active).toBe(true);
    expect(onExpire).not.toHaveBeenCalled();

    vi.advanceTimersByTime(FADE);
    expect(pin.active).toBe(false);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('releasing drops the pin without running onExpire', () => {
    const onExpire = vi.fn();
    const pin = new CursorPin(onExpire);
    pin.pin(TAPPED, 0, FADE);

    pin.release();
    expect(pin.active).toBe(false);
    expect(pin.marker()).toBeNull();

    // The cancelled timer must not fire later and clear a readout that has
    // since moved on.
    vi.advanceTimersByTime(FADE * 2);
    expect(onExpire).not.toHaveBeenCalled();
  });
});
