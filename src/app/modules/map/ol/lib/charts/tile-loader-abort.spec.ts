import type { FeatureLike } from 'ol/Feature';
import type { Extent } from 'ol/extent';
import type Projection from 'ol/proj/Projection';
import type VectorTile from 'ol/VectorTile';
import TileState from 'ol/TileState';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAbortableVectorTileLoader } from './tile-loader-abort';

type TileLoader = (
  extent: Extent,
  resolution: number,
  projection: Projection
) => void;

function makeTile(z = 9) {
  let loader: TileLoader | undefined;
  const states: number[] = [];
  const decodedFeatures = [{} as FeatureLike];
  const setFeatures = vi.fn();
  const readFeatures = vi.fn(() => decodedFeatures);
  const tile = {
    getTileCoord: () => [z, 0, 0],
    setLoader: (nextLoader: TileLoader) => {
      loader = nextLoader;
    },
    setState: (state: number) => states.push(state),
    getFormat: () => ({ readFeatures }),
    setFeatures
  } as unknown as VectorTile<FeatureLike>;

  return {
    tile,
    states,
    readFeatures,
    setFeatures,
    decodedFeatures,
    start: () => loader?.([] as unknown as Extent, 1, {} as Projection)
  };
}

function abortAwarePendingFetch(
  signals: AbortSignal[]
): (src: string, init?: RequestInit) => Promise<Response> {
  return (_src, init) => {
    const signal = init?.signal;
    if (!signal) return Promise.reject(new Error('missing abort signal'));
    signals.push(signal);
    return new Promise<Response>((_resolve, reject) => {
      signal.addEventListener(
        'abort',
        () => reject(new DOMException('Aborted', 'AbortError')),
        { once: true }
      );
    });
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createAbortableVectorTileLoader', () => {
  it('loads, decodes, and releases a successful request', async () => {
    const fetchMock = vi.fn(
      (_src: string, _init?: RequestInit): Promise<Response> =>
        Promise.resolve(
          new Response(new Uint8Array([1, 2, 3]), { status: 200 })
        )
    );
    vi.stubGlobal('fetch', fetchMock);
    const { tileLoadFunction, abortPending } =
      createAbortableVectorTileLoader();
    const tile = makeTile();

    tileLoadFunction(tile.tile, 'https://example.test/tile.pbf');
    tile.start();

    await vi.waitFor(() => {
      expect(tile.states).toEqual([TileState.LOADING, TileState.LOADED]);
    });
    expect(tile.readFeatures).toHaveBeenCalledOnce();
    expect(tile.setFeatures).toHaveBeenCalledWith(tile.decodedFeatures);
    const signal = fetchMock.mock.calls[0]?.[1]?.signal;
    expect(signal?.aborted).toBe(false);

    abortPending();

    expect(signal?.aborted).toBe(false);
  });

  it('keeps repeated requests at the same zoom active until teardown', async () => {
    const signals: AbortSignal[] = [];
    vi.stubGlobal('fetch', vi.fn(abortAwarePendingFetch(signals)));
    const { tileLoadFunction, abortPending } =
      createAbortableVectorTileLoader();
    const first = makeTile(10);
    const second = makeTile(10);

    tileLoadFunction(first.tile, 'https://example.test/first.pbf');
    tileLoadFunction(second.tile, 'https://example.test/second.pbf');
    first.start();
    second.start();

    expect(signals).toHaveLength(2);
    expect(signals.every((signal) => !signal.aborted)).toBe(true);

    abortPending();

    expect(signals.every((signal) => signal.aborted)).toBe(true);
    await vi.waitFor(() => {
      expect(first.states).toEqual([TileState.LOADING, TileState.ERROR]);
      expect(second.states).toEqual([TileState.LOADING, TileState.ERROR]);
    });
  });

  it('aborts a superseded zoom without canceling the current zoom', async () => {
    const signals: AbortSignal[] = [];
    vi.stubGlobal('fetch', vi.fn(abortAwarePendingFetch(signals)));
    const { tileLoadFunction, abortPending } =
      createAbortableVectorTileLoader();
    const oldZoom = makeTile(8);
    const currentZoom = makeTile(12);

    tileLoadFunction(oldZoom.tile, 'https://example.test/old.pbf');
    oldZoom.start();
    tileLoadFunction(currentZoom.tile, 'https://example.test/current.pbf');
    currentZoom.start();

    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
    await vi.waitFor(() => {
      expect(oldZoom.states).toEqual([TileState.LOADING, TileState.ERROR]);
    });

    abortPending();

    expect(signals[1]?.aborted).toBe(true);
    await vi.waitFor(() => {
      expect(currentZoom.states).toEqual([TileState.LOADING, TileState.ERROR]);
    });
  });

  it('marks an HTTP error response as an error without decoding it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('missing', { status: 404 })))
    );
    const { tileLoadFunction } = createAbortableVectorTileLoader();
    const tile = makeTile();

    tileLoadFunction(tile.tile, 'https://example.test/missing.pbf');
    tile.start();

    await vi.waitFor(() => {
      expect(tile.states).toEqual([TileState.LOADING, TileState.ERROR]);
    });
    expect(tile.readFeatures).not.toHaveBeenCalled();
    expect(tile.setFeatures).not.toHaveBeenCalled();
  });

  it('marks ordinary fetch failures as errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline')))
    );
    const { tileLoadFunction } = createAbortableVectorTileLoader();
    const tile = makeTile();

    tileLoadFunction(tile.tile, 'https://example.test/tile.pbf');
    tile.start();

    await vi.waitFor(() => {
      expect(tile.states).toEqual([TileState.LOADING, TileState.ERROR]);
    });
  });
});
