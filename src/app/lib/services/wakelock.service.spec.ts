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
  it('takes a new lock when re-enabled while a late grant is being released', async () => {
    const wakeLock = TestBed.inject(WakeLockService);
    let finishRelease = (): void => undefined;
    sentinel.release = vi.fn(
      () => new Promise<void>((resolve) => (finishRelease = resolve))
    );
    const enabling = wakeLock.enable();
    await wakeLock.disable();
    resolveRequest(sentinel as unknown as WakeLockSentinel);
    await vi.waitFor(() => expect(sentinel.release).toHaveBeenCalled());
    await wakeLock.enable();
    finishRelease();
    await vi.waitFor(() =>
      expect(navigator.wakeLock.request).toHaveBeenCalledTimes(2)
    );
    resolveRequest({
      ...sentinel,
      release: vi.fn()
    } as unknown as WakeLockSentinel);
    await enabling;
    expect(wakeLock.enabled()).toBe(true);
  });

  // The status bar shows the lost-lock icon for wanted() && !enabled().
  it('stays wanted when the browser releases the lock', async () => {
    const wakeLock = TestBed.inject(WakeLockService);
    const enabling = wakeLock.enable();
    resolveRequest(sentinel as unknown as WakeLockSentinel);
    await enabling;
    expect(wakeLock.wanted()).toBe(true);
    expect(wakeLock.enabled()).toBe(true);
    const onRelease = sentinel.addEventListener.mock.calls.find(
      ([type]) => type === 'release'
    )?.[1] as () => void;
    onRelease();
    expect(wakeLock.wanted()).toBe(true);
    expect(wakeLock.enabled()).toBe(false);
  });

  it('is not wanted once disabled', async () => {
    const wakeLock = TestBed.inject(WakeLockService);
    const enabling = wakeLock.enable();
    resolveRequest(sentinel as unknown as WakeLockSentinel);
    await enabling;
    await wakeLock.disable();
    expect(wakeLock.wanted()).toBe(false);
  });

  it('removes the release listener it added', async () => {
    const wakeLock = TestBed.inject(WakeLockService);
    const enabling = wakeLock.enable();
    resolveRequest(sentinel as unknown as WakeLockSentinel);
    await enabling;
    await wakeLock.disable();
    const added = sentinel.addEventListener.mock.calls[0];
    expect(sentinel.removeEventListener).toHaveBeenCalledWith(
      added[0],
      added[1]
    );
  });

  it('takes the lock back once per return to the page', async () => {
    const wakeLock = TestBed.inject(WakeLockService);
    const visibility = vi
      .spyOn(document, 'visibilityState', 'get')
      .mockReturnValue('visible');
    const newSentinel = () => ({
      release: vi.fn(() => Promise.resolve()),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    });
    const dropLock = (held: typeof sentinel) =>
      (
        held.addEventListener.mock.calls.find(
          ([type]) => type === 'release'
        )?.[1] as () => void
      )();

    const enabling = wakeLock.enable();
    resolveRequest(sentinel as unknown as WakeLockSentinel);
    await enabling;

    let held = sentinel;
    for (let cycle = 1; cycle <= 2; cycle++) {
      dropLock(held);
      expect(wakeLock.enabled()).toBe(false);
      document.dispatchEvent(new Event('visibilitychange'));
      await vi.waitFor(() =>
        expect(navigator.wakeLock.request).toHaveBeenCalledTimes(cycle + 1)
      );
      held = newSentinel();
      resolveRequest(held as unknown as WakeLockSentinel);
      await vi.waitFor(() => expect(wakeLock.enabled()).toBe(true));
    }
    expect(navigator.wakeLock.request).toHaveBeenCalledTimes(3);
    visibility.mockRestore();
    await wakeLock.disable();
  });
});
