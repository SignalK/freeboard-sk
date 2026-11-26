import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WakeLockService {
  private wakeLockRef?: WakeLockSentinel | null;
  private _enabled = signal<boolean>(false);
  // whether the lock is wanted: disable() can run while a request is pending,
  // and the browser can release a wanted lock on its own
  private _wanted = signal<boolean>(false);
  private requesting = false;
  readonly enabled = this._enabled.asReadonly();
  readonly wanted = this._wanted.asReadonly();

  constructor() {}

  ngOnDestroy() {
    this.disable();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  get isAvailable(): boolean {
    return 'wakeLock' in navigator;
  }

  toggle() {
    if (this._enabled()) {
      this.disable();
    } else {
      this.enable();
    }
  }

  /** set wakelock */
  async enable() {
    if (!this.isAvailable) {
      return;
    }
    this._wanted.set(true);
    if (this.wakeLockRef || this.requesting) {
      return;
    }
    this.requesting = true;
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      if (!this._wanted()) {
        await sentinel.release();
        // enable() during the release found a request still running
        if (this._wanted()) {
          this.requesting = false;
          await this.enable();
        }
        return;
      }
      this.wakeLockRef = sentinel;

      // listen for release
      this.wakeLockRef.addEventListener('release', this.onRelease);
      this._enabled.set(true);

      // listen for visibility change
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    } catch {
      this.wakeLockRef = null;
      this._enabled.set(false);
    } finally {
      this.requesting = false;
    }
  }

  /** release wakelock */
  async disable() {
    this._wanted.set(false);
    if (this.wakeLockRef) {
      await this.wakeLockRef.release();
      this.wakeLockRef.removeEventListener('release', this.onRelease);
      this.wakeLockRef = null;
    }
  }

  // Stable references, so removeEventListener finds them and a repeated
  // addEventListener does not stack another listener.
  private readonly onRelease = () => this._enabled.set(false);

  private readonly onVisibilityChange = async () => {
    if (
      this._wanted() &&
      !this._enabled() &&
      document.visibilityState === 'visible'
    ) {
      // the released sentinel cannot be reused, and enable() skips a held ref
      this.wakeLockRef = null;
      await this.enable();
    }
  };
}
