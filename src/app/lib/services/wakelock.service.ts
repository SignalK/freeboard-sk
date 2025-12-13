import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WakeLockService {
  private wakeLockRef: WakeLockSentinel;
  private _enabled = signal<boolean>(false);
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
    if (this._enabled) {
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
    if (this.wakeLockRef) {
      return;
    }
    try {
      this.wakeLockRef = await navigator.wakeLock.request('screen');

      // listen for release
      this.wakeLockRef.addEventListener('release', () => this.handleRelease());
      this._enabled.set(true);

      // listen for visibility change
      document.addEventListener('visibilitychange', () =>
        this.onVisibilityChange()
      );
    } catch (err) {
      this.wakeLockRef = null;
      this._enabled.set(false);
    }
  }

  /** release wakelock */
  async disable() {
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
