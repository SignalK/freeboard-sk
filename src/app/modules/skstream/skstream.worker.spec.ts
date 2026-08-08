import { expect, describe, it, vi, afterEach } from 'vitest';
import { apiGet, processVessel } from './skstream.worker';
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
