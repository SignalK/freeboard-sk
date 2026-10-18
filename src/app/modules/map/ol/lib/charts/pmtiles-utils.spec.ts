import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as pmtiles from 'pmtiles';
import TileState from 'ol/TileState';
import ImageTile from 'ol/ImageTile';
import { get as getProjection } from 'ol/proj';
import XYZ from 'ol/source/XYZ';
import VectorTileSource from 'ol/source/VectorTile';

import { initPMTilesVectorLayer, initPMTilesXYZLayer } from './pmtiles-utils';
import { SKChart } from 'src/app/modules/skresources/resource-classes';

/**
 * PMTiles tiles are read through `PMTiles#getZxy` rather than fetched by
 * OpenLayers, so the loaders must drive OL's tile states themselves: a tile
 * that never leaves LOADING holds one of the map's shared tile-queue slots
 * for good. A raster tile's object URL must be released once its image has
 * loaded or failed, or every tile viewed stays in memory for the session.
 */
describe('PMTiles tile loaders', () => {
  const proj = getProjection('EPSG:3857');
  const chart = new SKChart({ url: 'https://c.test/chart.pmtiles' });
  const tileData = { data: new ArrayBuffer(8) } as pmtiles.RangeResponse;

  let getZxy: ReturnType<typeof vi.spyOn>;
  const createObjectURL = vi.fn(() => 'blob:tile');
  const revokeObjectURL = vi.fn();

  const settle = () => new Promise((resolve) => setTimeout(resolve));

  beforeEach(() => {
    getZxy = vi.spyOn(pmtiles.PMTiles.prototype, 'getZxy');
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (URL as { createObjectURL?: unknown }).createObjectURL;
    delete (URL as { revokeObjectURL?: unknown }).revokeObjectURL;
  });

  describe('raster (XYZ)', () => {
    const loadTile = async (): Promise<ImageTile> => {
      const source = initPMTilesXYZLayer(chart, 1).getSource() as XYZ;
      const tile = source.getTile(2, 1, 1, 1, proj) as ImageTile;
      tile.load();
      await settle();
      return tile;
    };

    const image = (tile: ImageTile) => tile.getImage() as HTMLImageElement;

    it('reports LOADED once the image has loaded, then releases its URL', async () => {
      getZxy.mockResolvedValue(tileData);
      const tile = await loadTile();

      expect(image(tile).src).toBe('blob:tile');
      expect(tile.getState()).toBe(TileState.LOADING);
      expect(revokeObjectURL).not.toHaveBeenCalled();

      Object.defineProperty(image(tile), 'naturalWidth', { value: 512 });
      Object.defineProperty(image(tile), 'naturalHeight', { value: 512 });
      image(tile).dispatchEvent(new Event('load'));

      expect(tile.getState()).toBe(TileState.LOADED);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:tile');
    });

    it('reports ERROR and releases the URL when the image fails to load', async () => {
      // OL swaps in a blank canvas on error; jsdom has no 2D context.
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
        function (this: HTMLCanvasElement) {
          return { canvas: this, fillRect: () => undefined } as never;
        }
      );
      getZxy.mockResolvedValue(tileData);
      const tile = await loadTile();

      image(tile).dispatchEvent(new Event('error'));

      expect(tile.getState()).toBe(TileState.ERROR);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:tile');
    });

    it('reports ERROR when the archive read fails', async () => {
      getZxy.mockRejectedValue(new Error('Bad response code: 500'));
      const tile = await loadTile();

      expect(tile.getState()).toBe(TileState.ERROR);
      expect(createObjectURL).not.toHaveBeenCalled();
    });

    it('reports EMPTY when the archive has no tile there', async () => {
      getZxy.mockResolvedValue(undefined);
      const tile = await loadTile();

      expect(tile.getState()).toBe(TileState.EMPTY);
    });
  });

  describe('vector', () => {
    const loadTile = async () => {
      const source = initPMTilesVectorLayer(
        chart,
        1
      ).getSource() as VectorTileSource;
      const tile = source.getTile(2, 1, 1, 1, proj);
      tile.load();
      await settle();
      return tile;
    };

    it('reports ERROR when the archive read fails', async () => {
      getZxy.mockRejectedValue(new Error('Bad response code: 500'));
      const tile = await loadTile();

      expect(tile.getState()).toBe(TileState.ERROR);
    });

    it('finishes loading when the archive has no tile there', async () => {
      getZxy.mockResolvedValue(undefined);
      const tile = await loadTile();

      expect(tile.getState()).toBe(TileState.LOADED);
    });
  });
});
