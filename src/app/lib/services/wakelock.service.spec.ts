import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WakeLockService } from './wakelock.service';

describe('WakeLockService', () => {
  let resolveRequest: (sentinel: WakeLockSentinel) => void;
  let sentinel: {
    release: ReturnType<typeof vi.fn>;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    sentinel = {
      release: vi.fn(() => Promise.resolve()),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    vi.stubGlobal('navigator', {
      ...navigator,
      wakeLock: {
        request: vi.fn(
          () =>
            new Promise<WakeLockSentinel>(
              (resolve) => (resolveRequest = resolve)
            )
        )
      }
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  // Turning "keep screen awake" off while the browser is still granting the
  // lock must not leave the screen locked awake.
  it('releases a lock granted after it was disabled', async () => {
    const wakeLock = TestBed.inject(WakeLockService);
    const enabling = wakeLock.enable();
    await wakeLock.disable();
    resolveRequest(sentinel as unknown as WakeLockSentinel);
    await enabling;
    expect(sentinel.release).toHaveBeenCalled();
    expect(wakeLock.enabled()).toBe(false);
  });

  it('keeps a lock that is wanted again before it is granted', async () => {
    const wakeLock = TestBed.inject(WakeLockService);
    const enabling = wakeLock.enable();
    await wakeLock.disable();
    await wakeLock.enable();
    resolveRequest(sentinel as unknown as WakeLockSentinel);
    await enabling;
    expect(sentinel.release).not.toHaveBeenCalled();
    expect(wakeLock.enabled()).toBe(true);
    expect(navigator.wakeLock.request).toHaveBeenCalledTimes(1);
  });
});
