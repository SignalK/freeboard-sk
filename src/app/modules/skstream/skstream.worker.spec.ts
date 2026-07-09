import { expect, describe, it, vi, afterEach } from 'vitest';
import { apiGet } from './skstream.worker';

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
