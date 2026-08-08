import { expect, describe, it, vi, afterEach, beforeEach } from 'vitest';
import {
  apiGet,
  handleStreamEvent,
  initVessels,
  processVessel
} from './skstream.worker';
import { SKVessel } from '../skresources/resource-classes';

// getVesselTrail() fetches the server-side "self" track with several apiGet()
// calls fired in the same tick and awaited via Promise.all. A shared in-flight
// guard (added in v2.21.0) made every concurrent call after the first resolve
// to `undefined`, so Promise.all yielded holes, the trail parse threw, and the
// server track silently vanished (#492). Guard the concurrency contract:
// each concurrent call must return a real Promise that resolves with its own
// payload.
describe('skstream.worker apiGet — concurrent requests', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves every concurrent call, not just the first', async () => {
    // Respond after a macrotask so all calls are in flight simultaneously —
    // reproduces the overlap getVesselTrail() creates.
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve({
          json: () => new Promise((r) => setTimeout(() => r({ url }), 0))
        } as unknown as Response)
      )
    );

    const urls = ['/self/track?a', '/self/track?b', '/self/track?c'];
    const results = await Promise.all(urls.map((u) => apiGet(u)));

    expect(results).toEqual(urls.map((url) => ({ url })));
  });
});

// The stale-position indication (#672) is driven by a receipt time stamped
// here, in the worker, because only the worker sees per-path deltas. Stamping
// on the delta rather than on a changed value is what makes a boat at anchor —
// which reports the same position indefinitely — read as live rather than
// stale, so the stamp must advance on every position delta.
describe('skstream.worker processVessel — position receipt time (#672)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const positionDelta = {
    path: 'navigation.position',
    value: { latitude: 25.7, longitude: -80.2 }
  };

  it('stamps the local receipt time when a position delta arrives', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const vessel = new SKVessel();

    processVessel(vessel, positionDelta, true);

    expect(vessel.positionUpdatedAt).toBe(1_700_000_000_000);
  });

  it('advances the stamp when the reported position is unchanged', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const vessel = new SKVessel();
    processVessel(vessel, positionDelta, true);

    now.mockReturnValue(1_700_000_030_000);
    processVessel(vessel, positionDelta, true);

    expect(vessel.positionUpdatedAt).toBe(1_700_000_030_000);
  });

  it('leaves the stamp untouched for a non-position delta', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const vessel = new SKVessel();

    processVessel(
      vessel,
      { path: 'navigation.speedOverGround', value: 3 },
      true
    );

    expect(vessel.positionUpdatedAt).toBe(0);
  });
});

// The status bar's "No server messages!" indicator is driven by the watchdog
// alarm, which the interval timer raises after ~9s of silence. A detected close
// used to *disarm* the watchdog instead of alarming — and since closeStream()
// also stops that interval, the alarm became unreachable in exactly the case
// where the server is known to be gone: a clean server shutdown or restart
// (#695). The indicator only appeared for a silently-dead socket, the harder
// case. Guard that a detected loss of connection reports itself immediately.
describe('skstream.worker handleStreamEvent — watchdog on disconnect (#695)', () => {
  let posted: Array<Record<string, unknown>>;

  beforeEach(() => {
    initVessels(); // openStream() does this before any stream event arrives
    posted = [];
    vi.stubGlobal(
      'postMessage',
      vi.fn((msg: Record<string, unknown>) => posted.push(msg))
    );
    // The watchdog is module state that initVessels() does not touch, so an
    // alarm raised by one test would leak into the next. Start every test from
    // a live connection, via the same event that arms the watchdog for real.
    handleStreamEvent({
      action: 'onConnect',
      msg: { target: { readyState: 1 } }
    });
    posted = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const alarmUpdates = () =>
    posted.filter((m) => m.action === 'update' && m.watchDogAlarm === true);

  it('raises the alarm on a detected close', () => {
    handleStreamEvent({ action: 'onClose', msg: {} });

    expect(alarmUpdates()).toHaveLength(1);
  });

  it('still posts the close message the app reconnects on', () => {
    handleStreamEvent({ action: 'onClose', msg: {} });

    expect(posted.some((m) => m.action === 'close')).toBe(true);
  });

  it('raises the alarm on a connection error', () => {
    handleStreamEvent({ action: 'onError', msg: {} });

    expect(alarmUpdates()).toHaveLength(1);
  });
});
