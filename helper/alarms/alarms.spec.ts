import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initAlarms, shutdownAlarms } from './alarms';
import type { FreeboardHelperApp } from '../index';

// Regression guards for the initial region load in initAlarms():
//
// #732 — the load runs from a timer that discards the promise, so a server
// with no `regions` provider (resources-provider disabled, `regions` unticked
// in its config, or a dev checkout with no providers) rejected it with nothing
// to catch it. That surfaced as an unhandled rejection — a crash on servers
// < 2.24.0, and an error badge on the Freeboard-SK plugin on newer ones.
//
// #746 — the load was a single shot 5s after start, so a provider that
// registered later than that left on-disk hazard regions unloaded until one
// was edited. It now retries with a doubling delay.

// Mirrors REGION_LOAD_DELAYS_MS in alarms.ts: 5s, 10s, 20s, 40s, 60s, 60s.
const RETRY_DELAYS_MS = [5_000, 10_000, 20_000, 40_000, 60_000, 60_000];
const TOTAL_RETRY_MS = RETRY_DELAYS_MS.reduce((a, b) => a + b, 0);

const noop = () => undefined;

type RouteHandler = (req: unknown, res: unknown) => unknown;

// The smallest server surface initAlarms() actually touches: route
// registration, the delta subscription, and resourcesApi.listResources().
// GET handlers are captured so a test can read the loaded alarm areas back
// through the API the app uses, rather than poking module state.
const makeServer = (
  listResources: (...args: unknown[]) => Promise<unknown>
) => {
  const getRoutes = new Map<string, RouteHandler>();
  const server = {
    debug: noop,
    get: (path: string, handler: RouteHandler) => getRoutes.set(path, handler),
    post: noop,
    put: noop,
    delete: noop,
    subscriptionmanager: { subscribe: noop },
    resourcesApi: { listResources }
  } as unknown as FreeboardHelperApp;
  return { server, getRoutes };
};

// Invoke a captured GET handler and return what it sent as JSON.
const invokeGet = async (handler: RouteHandler, path: string) => {
  let body: unknown;
  const res = {
    status: () => res,
    json: (payload: unknown) => {
      body = payload;
    }
  };
  await handler({ method: 'GET', path }, res);
  return body;
};

const AREA_PATH = '/signalk/v2/api/alarms/area';

const hazardRegion = {
  name: 'Reef',
  feature: {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-80.1, 25.1],
          [-80.2, 25.1],
          [-80.2, 25.2],
          [-80.1, 25.1]
        ]
      ]
    },
    properties: { skIcon: 'hazard' }
  }
};

describe('initAlarms() — regions provider missing (#732)', () => {
  let unhandled: ReturnType<typeof vi.fn>;
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // fake only the timers the region load uses; setImmediate stays real so
    // the test can yield a macrotask for Node to emit 'unhandledRejection'
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    warn = vi.spyOn(console, 'warn').mockImplementation(noop);
  });

  afterEach(() => {
    shutdownAlarms();
    process.off('unhandledRejection', unhandled);
    warn.mockRestore();
    vi.useRealTimers();
  });

  it('does not leak an unhandled rejection when listResources() rejects', async () => {
    const { server } = makeServer(() =>
      Promise.reject(new Error('No provider for regions'))
    );

    initAlarms(server, 'freeboard-sk');
    await vi.advanceTimersByTimeAsync(5000);
    // Node emits 'unhandledRejection' once the microtask queue has drained
    // at the end of a macrotask — yield one so a floating rejection surfaces
    await new Promise((resolve) => setImmediate(resolve));

    expect(unhandled).not.toHaveBeenCalled();
  });

  it('loads hazard regions as alarm areas when a provider is present', async () => {
    const listResources = vi.fn(() =>
      Promise.resolve({ 'region-1': hazardRegion })
    );
    const { server, getRoutes } = makeServer(listResources);

    initAlarms(server, 'freeboard-sk');
    await vi.advanceTimersByTimeAsync(5000);

    expect(listResources).toHaveBeenCalledWith('regions', undefined);
    expect(unhandled).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();

    const areas = await invokeGet(getRoutes.get(AREA_PATH), AREA_PATH);
    expect(areas).toEqual([
      [
        'region-1',
        {
          trigger: 'entry',
          geometry: 'region',
          name: 'Reef',
          coords: [
            { latitude: 25.1, longitude: -80.1 },
            { latitude: 25.1, longitude: -80.2 },
            { latitude: 25.2, longitude: -80.2 },
            { latitude: 25.1, longitude: -80.1 }
          ]
        }
      ]
    ]);
  });

  it('retries the region load until a provider registers (#746)', async () => {
    // provider absent for the first two attempts, present on the third
    const listResources = vi
      .fn()
      .mockRejectedValueOnce(new Error('No provider for regions'))
      .mockRejectedValueOnce(new Error('No provider for regions'))
      .mockResolvedValue({ 'late-region': { ...hazardRegion, name: 'Bar' } });
    const { server, getRoutes } = makeServer(listResources);
    const getAreas = () => invokeGet(getRoutes.get(AREA_PATH), AREA_PATH);

    initAlarms(server, 'freeboard-sk');

    await vi.advanceTimersByTimeAsync(RETRY_DELAYS_MS[0]);
    expect(listResources).toHaveBeenCalledTimes(1);
    expect(await getAreas()).not.toContainEqual([
      'late-region',
      expect.anything()
    ]);

    await vi.advanceTimersByTimeAsync(RETRY_DELAYS_MS[1]);
    expect(listResources).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(RETRY_DELAYS_MS[2]);
    expect(listResources).toHaveBeenCalledTimes(3);
    expect(await getAreas()).toContainEqual([
      'late-region',
      expect.objectContaining({ geometry: 'region', name: 'Bar' })
    ]);

    // success ends the schedule — no further attempts, nothing to warn about
    await vi.advanceTimersByTimeAsync(TOTAL_RETRY_MS);
    expect(listResources).toHaveBeenCalledTimes(3);
    expect(warn).not.toHaveBeenCalled();
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('gives up with a single warning once the retry delays are exhausted', async () => {
    const listResources = vi.fn(() =>
      Promise.reject(new Error('No provider for regions'))
    );
    const { server } = makeServer(listResources);

    initAlarms(server, 'freeboard-sk');
    await vi.advanceTimersByTimeAsync(TOTAL_RETRY_MS);

    expect(listResources).toHaveBeenCalledTimes(RETRY_DELAYS_MS.length);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('No provider for regions')
    );

    // and stays given up
    await vi.advanceTimersByTimeAsync(TOTAL_RETRY_MS);
    expect(listResources).toHaveBeenCalledTimes(RETRY_DELAYS_MS.length);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('cancels a pending retry on shutdown', async () => {
    const listResources = vi.fn(() =>
      Promise.reject(new Error('No provider for regions'))
    );
    const { server } = makeServer(listResources);

    initAlarms(server, 'freeboard-sk');
    await vi.advanceTimersByTimeAsync(RETRY_DELAYS_MS[0]);
    expect(listResources).toHaveBeenCalledTimes(1);

    shutdownAlarms();
    await vi.advanceTimersByTimeAsync(TOTAL_RETRY_MS);

    expect(listResources).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('does not reschedule when an attempt in flight fails after shutdown', async () => {
    let rejectInFlight: (err: Error) => void;
    const listResources = vi.fn(
      () =>
        new Promise((_resolve, reject) => {
          rejectInFlight = reject;
        })
    );
    const { server } = makeServer(listResources);

    initAlarms(server, 'freeboard-sk');
    await vi.advanceTimersByTimeAsync(RETRY_DELAYS_MS[0]);
    expect(listResources).toHaveBeenCalledTimes(1);

    // plugin stopped while listResources() is still pending, then it fails
    shutdownAlarms();
    rejectInFlight(new Error('No provider for regions'));
    await vi.advanceTimersByTimeAsync(TOTAL_RETRY_MS);

    expect(listResources).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('does not warn when the final attempt in flight fails after shutdown', async () => {
    let rejectInFlight: (err: Error) => void;
    const listResources = vi.fn(
      () =>
        new Promise((_resolve, reject) => {
          rejectInFlight = reject;
        })
    );
    const { server } = makeServer(listResources);

    initAlarms(server, 'freeboard-sk');
    // reject every attempt but the last, which is left pending
    for (let i = 0; i < RETRY_DELAYS_MS.length; i++) {
      await vi.advanceTimersByTimeAsync(RETRY_DELAYS_MS[i]);
      if (i < RETRY_DELAYS_MS.length - 1) {
        rejectInFlight(new Error('No provider for regions'));
      }
    }
    expect(listResources).toHaveBeenCalledTimes(RETRY_DELAYS_MS.length);

    shutdownAlarms();
    rejectInFlight(new Error('No provider for regions'));
    await vi.advanceTimersByTimeAsync(0);

    expect(warn).not.toHaveBeenCalled();
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('does not load areas when an attempt in flight succeeds after shutdown', async () => {
    let resolveInFlight: (list: unknown) => void;
    const listResources = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveInFlight = resolve;
        })
    );
    const { server, getRoutes } = makeServer(listResources);

    initAlarms(server, 'freeboard-sk');
    await vi.advanceTimersByTimeAsync(RETRY_DELAYS_MS[0]);
    expect(listResources).toHaveBeenCalledTimes(1);

    shutdownAlarms();
    resolveInFlight({ 'stale-region': { ...hazardRegion, name: 'Stale' } });
    await vi.advanceTimersByTimeAsync(0);

    const areas = await invokeGet(getRoutes.get(AREA_PATH), AREA_PATH);
    expect(areas).not.toContainEqual(['stale-region', expect.anything()]);
  });
});
