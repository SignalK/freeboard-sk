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
 * Whether a settled map move restarts the idle countdown.
 *
 * Only a zoom does. A heading-up chart re-rotates on every heading update — and
 * it does so whether or not follow mode is on, because `rotateMap()` is not
 * gated on it — so each heading change ends in its own move-end. Treating every
 * move-end as activity therefore holds the countdown open indefinitely on a
 * vessel under way, and follow mode never comes back (#714). A pan is reported
 * separately by the pointer-drag handler, where it is unambiguously the user.
 */
export function isRefollowActivity(move: { zoomChanged?: boolean }): boolean {
  return move.zoomChanged === true;
}
