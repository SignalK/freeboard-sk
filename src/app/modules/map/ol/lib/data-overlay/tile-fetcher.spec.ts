import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OverlayStyle } from 'signalk-plotterext-bus/host';
import { DataOverlayModel } from 'src/app/modules/plotterext/data-overlay-model';
import { TileFetcher } from './tile-fetcher';

const ORIGIN = 'http://sk.local:3000';

/**
 * Just what TileFetcher reads of a fetch Response. A real `Response` can't
 * wrap jsdom's `Blob` on Node 22 ("object.stream is not a function").
 */
const tileResponse = (status: number) =>
  ({
    status,
    ok: status >= 200 && status < 300,
    blob: async () => new Blob(['png'])
  }) as unknown as Response;

function setup(source: Record<string, unknown>) {
  const model = new DataOverlayModel(
    {
      version: 8,
      sources: { s: source },
      layers: []
    } as unknown as OverlayStyle,
    ORIGIN
  );
  const plan = model.sources['s'] as ConstructorParameters<
    typeof TileFetcher
  >[2];
  return { model, fetcher: new TileFetcher(model, 's', plan) };
}

describe('TileFetcher', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => tileResponse(200));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('fetches a server tile with credentials and the HTTP cache, once', async () => {
    const { fetcher } = setup({
      type: 'raster-dem',
      tiles: ['/p/{z}/{x}/{y}.png']
    });
    const a = await fetcher.fetch(3, 2, 1);
    const b = await fetcher.fetch(3, 2, 1);
    expect(a).toBe(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`${ORIGIN}/p/3/2/1.png`, {
      credentials: 'include',
      cache: 'default'
    });
  });

  it('fetches an https tile without credentials, choosing among templates by tile', async () => {
    const { fetcher } = setup({
      type: 'raster',
      tiles: ['https://a.example/{z}/{x}/{y}', 'https://b.example/{z}/{x}/{y}']
    });
    await fetcher.fetch(1, 0, 1);
    expect(fetchMock).toHaveBeenCalledWith('https://b.example/1/0/1', {
      credentials: 'omit',
      cache: 'default'
    });
  });

  it('fetches a refreshed tile afresh, and only that tile', async () => {
    const { model, fetcher } = setup({
      type: 'raster-dem',
      tiles: ['/p/{z}/{x}/{y}.png']
    });
    await fetcher.fetch(3, 2, 1);
    await fetcher.fetch(3, 3, 1);
    model.refresh({ source: 's', tiles: [[3, 2, 1]] });
    fetcher.invalidate([[3, 2, 1]]);
    await fetcher.fetch(3, 2, 1);
    await fetcher.fetch(3, 3, 1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenLastCalledWith(`${ORIGIN}/p/3/2/1.png`, {
      credentials: 'include',
      cache: 'reload'
    });
    expect(model.needsReload('s', 3, 2, 1)).toBe(false);
  });

  it('keeps a refresh that arrives while the tile is being fetched', async () => {
    const { model, fetcher } = setup({
      type: 'raster-dem',
      tiles: ['/p/{z}/{x}/{y}.png']
    });
    const first = fetcher.fetch(3, 2, 1);
    model.refresh({ source: 's', tiles: [[3, 2, 1]] });
    fetcher.invalidate([[3, 2, 1]]);
    await first;
    expect(model.needsReload('s', 3, 2, 1)).toBe(true);
    await fetcher.fetch(3, 2, 1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('treats 404 and 204 as a tile with no data', async () => {
    const { fetcher } = setup({ type: 'raster', tiles: ['/p/{z}/{x}/{y}'] });
    fetchMock.mockResolvedValueOnce(tileResponse(404));
    fetchMock.mockResolvedValueOnce(tileResponse(204));
    expect(await fetcher.fetch(1, 0, 0)).toBeNull();
    expect(await fetcher.fetch(1, 1, 0)).toBeNull();
  });

  it('fails on any other error', async () => {
    const { fetcher } = setup({ type: 'raster', tiles: ['/p/{z}/{x}/{y}'] });
    fetchMock.mockResolvedValueOnce(tileResponse(500));
    await expect(fetcher.fetch(1, 0, 0)).rejects.toThrow('HTTP 500');
  });

  it('does not fetch tiles outside the source bounds', async () => {
    const { fetcher } = setup({
      type: 'vector',
      tiles: ['/p/{z}/{x}/{y}.pbf'],
      bounds: [-81, 24, -79, 26]
    });
    // zoom 2: tile 0/1 covers lon -180..-90, tile 1/1 covers -90..0
    expect(await fetcher.fetch(2, 0, 1)).toBeNull();
    expect(await fetcher.fetch(2, 1, 1)).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('TileFetcher decoded tiles', () => {
  let decode: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => tileResponse(200))
    );
    decode = vi.fn(async () => ({ width: 256, height: 256 }) as ImageBitmap);
    vi.stubGlobal('createImageBitmap', decode);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('decodes a DEM tile exactly as served, once, until it is refreshed', async () => {
    const { model, fetcher } = setup({
      type: 'raster-dem',
      tiles: ['/p/{z}/{x}/{y}.png']
    });
    const a = await fetcher.image(3, 2, 1);
    expect(await fetcher.image(3, 2, 1)).toBe(a);
    expect(decode).toHaveBeenCalledTimes(1);
    expect(decode).toHaveBeenCalledWith(expect.any(Blob), {
      premultiplyAlpha: 'none',
      colorSpaceConversion: 'none'
    });
    model.refresh({ source: 's', tiles: [[3, 2, 1]] });
    fetcher.invalidate([[3, 2, 1]]);
    await fetcher.image(3, 2, 1);
    expect(decode).toHaveBeenCalledTimes(2);
  });

  it('decodes a raster tile with the browser defaults, and an empty tile not at all', async () => {
    const { fetcher } = setup({
      type: 'raster',
      tiles: ['/p/{z}/{x}/{y}.png']
    });
    vi.mocked(fetch).mockResolvedValueOnce(tileResponse(404));
    expect(await fetcher.image(1, 0, 0)).toBeNull();
    await fetcher.image(1, 1, 0);
    expect(decode).toHaveBeenCalledTimes(1);
    expect(decode).toHaveBeenCalledWith(expect.any(Blob), {});
  });
});
