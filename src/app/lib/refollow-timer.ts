/**
 * Re-arms follow mode a configurable idle period after a pan released it.
 *
 * Only the `exit` pan behaviour releases follow mode by panning, so only that
 * behaviour arms this timer (#714). The countdown measures *idle* time: every
 * settled pan or zoom restarts it, so the display has to sit still for the whole
 * delay before the vessel is followed again. A delay of zero never arms, which
 * is the default and preserves the pre-#714 behaviour.
 *
 * Deliberately turning follow mode off with the Follow button does NOT arm it —
 * a manual "off" has to stay off, or it could not be expressed at all.
 */
export class RefollowTimer {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private delayMs = 0;

  /** @param onExpire run once the display has been idle for the whole delay. */
  constructor(private onExpire: () => void) {}

  /** True while a countdown is running. */
  get armed(): boolean {
    return this.timer !== null;
  }

  /**
   * Start the countdown, replacing any countdown already running.
   * @param delaySeconds idle period before follow mode resumes; <= 0 never arms.
   */
  arm(delaySeconds: number) {
    this.cancel();
    if (!Number.isFinite(delaySeconds) || delaySeconds <= 0) {
      return;
    }
    this.delayMs = delaySeconds * 1000;
    this.start();
  }

  /** Restart the countdown after further activity. No-op when not armed. */
  reset() {
    if (!this.armed) {
      return;
    }
    this.start();
  }

  /** Stop the countdown. Safe to call when not armed. */
  cancel() {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private start() {
    this.cancel();
    this.timer = setTimeout(() => {
      // One-shot: clear before notifying so `armed` reads false to the callback
      // and any activity it triggers cannot restart a spent countdown.
      this.timer = null;
      this.onExpire();
    }, this.delayMs);
  }
}

/**
 * Whether a settled map move restarts the idle countdown — i.e. whether the
 * user moved the chart, as opposed to the chart moving by itself.
 *
 * A change of zoom or of centre is the user; a change of *rotation alone* is
 * not. A heading-up chart re-rotates on every heading update whether or not
 * follow mode is on, because `rotateMap()` is not gated on it, so each heading
 * change ends in its own move-end. Counting those holds the countdown open
 * indefinitely on a vessel under way and follow mode never comes back (#714).
 * Rotation moves neither centre nor zoom, so testing those two excludes it.
 *
 * Testing the centre — rather than trusting the pointer-drag handler to report
 * every pan — is what covers panning that never produces a pointer drag, above
 * all OpenLayers' `keyboardpan`: the arrow keys move the view and fire a
 * move-end, but emit no `pointerdrag` and change no zoom.
 *
 * @param move the settled move
 * @param previousCenter centre before it; null/absent on the first move-end
 */
export function isRefollowActivity(
  move: { lonlat?: number[]; zoomChanged?: boolean },
  previousCenter?: number[] | null
): boolean {
  if (move.zoomChanged === true) {
    return true;
  }
  if (!previousCenter || !move.lonlat) {
    return false;
  }
  return (
    move.lonlat[0] !== previousCenter[0] || move.lonlat[1] !== previousCenter[1]
  );
}
