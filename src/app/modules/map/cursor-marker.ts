import { signal, Signal } from '@angular/core';
import { Position } from 'src/app/types';

/**
 * Longest press still read as a tap. A longer hold is a deliberate gesture of
 * its own — the chart context menu, or a vertex delete while editing a route —
 * and must not also pin the readout. Matches the 500 ms the map component uses
 * to fire its long-press. (A press that *drags* never reaches here at all:
 * OpenLayers suppresses `singleclick` for a gesture that has dragged, so a pan
 * is excluded without a guard of our own.)
 */
export const TAP_MAX_DURATION = 500;

/** Fade duration (seconds) when the setting is unset. */
export const DEFAULT_TAP_FADE_SPEED = 1.5;

/**
 * Shortest fade the setting allows. Below about a second the marker is gone
 * before a glance down at the instrument can land on it, which on touch also
 * takes the readout with it — the mark is the only thing identifying the point
 * the bearing refers to.
 */
export const MIN_TAP_FADE_SPEED = 1;

/**
 * Longest fade a timer can actually hold. `setTimeout` keeps its delay in a
 * signed 32-bit int, so a longer one overflows and fires immediately — which
 * would expire the pin the instant it was set, the very failure this feature
 * exists to avoid. The setting has no maximum by design, so the guard belongs
 * here; at ~24 days it rules out nothing a user could mean.
 */
const MAX_TIMEOUT = 2147483647;

/**
 * Fade duration in ms for the configured setting, which is stored in seconds
 * and arrives from the server's config — so it is validated here rather than
 * trusted. A value below the minimum is raised to it rather than replaced by
 * the default: the form lets one through (it flags the entry but still
 * persists), and honouring "as fast as allowed" is less surprising than
 * silently reverting to a *slower* fade than was asked for.
 */
export function tapFadeMs(setting: number | undefined | null): number {
  if (typeof setting !== 'number' || !Number.isFinite(setting)) {
    return DEFAULT_TAP_FADE_SPEED * 1000;
  }
  return Math.min(Math.max(setting, MIN_TAP_FADE_SPEED) * 1000, MAX_TIMEOUT);
}

export interface CursorMarker {
  /**
   * Distinct per tap. The fade is a CSS animation, which only restarts when the
   * element is recreated — so the template tracks by this id rather than
   * updating one long-lived element in place.
   */
  id: number;
  /** Canonical lon/lat of the tapped point. */
  position: Position;
  /** Render-space offset of the world copy the tap landed in (#572). */
  worldOffset: number;
  /**
   * How long this marker takes to fade away, driving both the CSS animation and
   * how long the readout stays pinned. Carried per-marker so a setting change
   * applies to the next tap without disturbing one already fading.
   */
  fadeMs: number;
}

/**
 * Holds the cursor bearing/distance/ETA readout on a tapped point.
 *
 * A hovering pointer is a mouse-only luxury: on touch the readout can only ever
 * describe the last point tapped, and a bearing with nothing on the chart to
 * anchor it is what made the feature unusable there (#546). Pinning gives both
 * input types the same gesture — tap a point, the readout freezes on it and a
 * marker shows where "it" is — and expires the two together, so the numbers
 * never outlive the mark explaining what they refer to.
 *
 * The marker starts fading the moment it appears rather than holding solid
 * first: it is deliberately not hit-tested away from features, so anything it
 * lands on top of — a waypoint popover, or the route vertex you are reaching
 * for to start an edit — is obscured until it clears.
 */
export class CursorPin {
  private readonly _marker = signal<CursorMarker | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;
  private seq = 0;

  /** @param onExpire run when the pin lapses of its own accord. */
  constructor(private readonly onExpire: () => void = () => undefined) {}

  /** The marker to draw, or null when nothing is pinned. */
  get marker(): Signal<CursorMarker | null> {
    return this._marker.asReadonly();
  }

  /** Whether the readout is currently held on a tapped point. */
  get active(): boolean {
    return this._marker() !== null;
  }

  /** Pin the readout to `position` and fade a marker there over `fadeMs`. */
  pin(position: Position, worldOffset: number, fadeMs: number) {
    this.stopTimer();
    this._marker.set({ id: ++this.seq, position, worldOffset, fadeMs });
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this._marker.set(null);
      this.onExpire();
    }, fadeMs);
  }

  /** Drop the pin without running `onExpire` (teardown, or a superseding action). */
  release() {
    this.stopTimer();
    this._marker.set(null);
  }

  private stopTimer() {
    clearTimeout(this.timer);
    this.timer = undefined;
  }
}
