import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WakeLockService {
  private wakeLockRef?: WakeLockSentinel | null;
  private _enabled = signal<boolean>(false);
  // whether the lock is wanted: disable() can run while a request is pending
  private wanted = false;
  private requesting = false;
  readonly enabled = this._enabled.asReadonly();

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
    this.wanted = true;
    if (this.wakeLockRef || this.requesting) {
      return;
    }
    this.requesting = true;
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      if (!this.wanted) {
        await sentinel.release();
        // enable() during the release found a request still running
        if (this.wanted) {
          this.requesting = false;
          await this.enable();
        }
        return;
      }
      this.wakeLockRef = sentinel;

      // listen for release
      this.wakeLockRef.addEventListener('release', () => this.handleRelease());
      this._enabled.set(true);

      // listen for visibility change
      document.addEventListener('visibilitychange', () =>
        this.onVisibilityChange()
      );
    } catch {
      this.wakeLockRef = null;
      this._enabled.set(false);
    } finally {
      this.requesting = false;
    }
  }

  /** release wakelock */
  async disable() {
    this.wanted = false;
    if (this.wakeLockRef) {
      await this.wakeLockRef.release();
      this.wakeLockRef.removeEventListener('release', () =>
        this.handleRelease()
      );
      this.wakeLockRef = null;
    }
  }

  /** Handle release event */
  private handleRelease() {
    this._enabled.set(false);
  }

  /** handle document visibility change event */
  private async onVisibilityChange() {
    if (this.wakeLockRef !== null && document.visibilityState === 'visible') {
      this.wakeLockRef = await navigator.wakeLock.request('screen');
      this._enabled.set(true);
    }
  }
}
