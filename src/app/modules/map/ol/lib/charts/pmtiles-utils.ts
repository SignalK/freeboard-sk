import DataTile from 'ol/source/DataTile';
import TileLayer from 'ol/layer/Tile';
import WebGLTileLayer from 'ol/layer/WebGLTile';
import { XYZ } from 'ol/source';
import * as pmtiles from 'pmtiles';
import { SKChart } from 'src/app/modules/skresources';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import { MVT } from 'ol/format';

// create a PMTile WebGLtile layer
export function initPMTilesWebGLLayer(
  url: string,
  minZoom: number,
  maxZoom: number,
  zIndex: number
): WebGLTileLayer {
  const tiles = new pmtiles.PMTiles(url);

  function loadImage(src: string) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.addEventListener('load', () => resolve(img));
      img.addEventListener('error', () => reject(new Error('load failed')));
      img.src = src;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function loader(z, x, y): Promise<any> {
    const response = await tiles.getZxy(z, x, y);
    const blob = new Blob([response.data]);
    const src = URL.createObjectURL(blob);
    const image = await loadImage(src);
    URL.revokeObjectURL(src);
    return image;
  }

  return new WebGLTileLayer({
    source: new DataTile({
      loader,
      wrapX: true,
      maxZoom: maxZoom,
      minZoom: minZoom
    }),
    style: {},
    zIndex: zIndex
  });
}

// create a PMTile XYZ source TileLayer
export function initPMTilesXYZLayer(
  chart: SKChart,
  zIndex: number
): TileLayer<XYZ> {
  const tiles = new pmtiles.PMTiles(chart.url);

  function loader(tile, url) {
    tile.setState(1); // LOADING
    // the URL construction is done internally by OL, so we need to parse it
    // back out here using a hacky regex
    const re = new RegExp(/pmtiles:\/\/(.+)\/(\d+)\/(\d+)\/(\d+)/);
    const result = url.match(re);
    const z = +result[2];
    const x = +result[3];
    const y = +result[4];

    tiles.getZxy(z, x, y).then((tile_result) => {
      if (tile_result) {
        const blob = new Blob([tile_result.data]);
        const imageUrl = window.URL.createObjectURL(blob);
        tile.getImage().src = imageUrl;
        tile.setState(2); // LOADED
      } else {
        tile.setState(4); // EMPTY
      }
    });
  }

  return new TileLayer({
    source: new XYZ({
      tileLoadFunction: loader,
      tileSize: [512, 512],
      url: 'pmtiles://' + chart.url + '/{z}/{x}/{y}',
      wrapX: true,
      maxZoom: chart.maxZoom,
      minZoom: chart.minZoom
    }),
    zIndex: zIndex,
    opacity: chart.defaultOpacity ?? 1
  });
}

// create a PMTile Vector layer
export function initPMTilesVectorLayer(
  chart: SKChart,
  zIndex: number
): VectorTileLayer {
  const tiles = new pmtiles.PMTiles(chart.url);

  function loader(tile, url) {
    // the URL construction is done internally by OL, so we need to parse it
    // back out here using a hacky regex
    const re = new RegExp(/pmtiles:\/\/(.+)\/(\d+)\/(\d+)\/(\d+)/);
    const result = url.match(re);
    const z = +result[2];
    const x = +result[3];
    const y = +result[4];

    tile.setLoader((extent, resolution, projection) => {
      tile.setState(1); // LOADING
      tiles.getZxy(z, x, y).then((tile_result) => {
        if (tile_result) {
          const format = tile.getFormat();
          const features = format.readFeatures(tile_result.data, {
            extent: extent,
            featureProjection: projection
          });
          tile.setFeatures(features);
          tile.setState(2); // LOADED
        } else {
          tile.setState(4); // EMPTY
        }
      });
    });
  }

  return new VectorTileLayer({
    source: new VectorTileSource({
      format: new MVT(),
      url: 'pmtiles://' + chart.url + '/{z}/{x}/{y}',
      tileLoadFunction: loader
    }),
    zIndex: zIndex,
    opacity: chart.defaultOpacity ?? 1,
    minZoom: chart.minZoom,
    maxZoom: chart.maxZoom,
    declutter: true,
    preload: 0
  });
}
