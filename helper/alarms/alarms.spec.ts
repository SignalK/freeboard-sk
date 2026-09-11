import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initAlarms, shutdownAlarms } from './alarms';
import type { FreeboardHelperApp } from '../index';

// Regression guard for #732: initAlarms() schedules parseRegionList() on a
// timer and discards the promise, so a server with no `regions` provider
// (resources-provider disabled, `regions` unticked in its config, or a dev
// checkout with no providers) rejected the promise with nothing to catch it.
// That surfaced as an unhandled rejection — a crash on servers < 2.24.0, and
// an error badge on the Freeboard-SK plugin on newer ones.

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
    // fake only the 5s timer initAlarms() uses; setImmediate stays real so
    // the test can yield a macrotask for Node to emit 'unhandledRejection'
    vi.useFakeTimers({ toFake: ['setTimeout'] });
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
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('No provider for regions')
    );
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
});
