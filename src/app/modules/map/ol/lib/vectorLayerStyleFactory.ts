import { Injectable } from '@angular/core';
import { SKChart } from 'src/app/modules';
import { S57Service } from './s57.service';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import { MVT } from 'ol/format';
import { Style, Fill, Stroke } from 'ol/style';
import * as pmtiles from 'pmtiles';

export abstract class VectorLayerStyler {
  public MinZ: number;
  public MaxZ: number;

  constructor(public chart: SKChart) {
    this.MinZ =
      chart.minZoom && chart.minZoom >= 0.1
        ? chart.minZoom - 0.1
        : chart.minZoom;
    this.MaxZ = chart.maxZoom;
  }

  public abstract ApplyStyle(vectorLayer: VectorTileLayer);
  public abstract CreateLayer(): VectorTileLayer;
}

class S57LayerStyler extends VectorLayerStyler {
  constructor(chart: SKChart, private s57service: S57Service) {
    super(chart);
  }

  public CreateLayer(): VectorTileLayer {
    return new VectorTileLayer();
  }

  public ApplyStyle(vectorLayer: VectorTileLayer) {
    vectorLayer.set('declutter', true);
    const source = new VectorTileSource({
      url: this.chart.url,
      minZoom: this.chart.minZoom,
      maxZoom: this.chart.maxZoom,
      format: new MVT({})
    });

    vectorLayer.setSource(source);
    vectorLayer.setPreload(0);
    vectorLayer.setStyle(this.s57service.getStyle);
    vectorLayer.setMinZoom(13);
    vectorLayer.setMaxZoom(23);
    vectorLayer.setRenderOrder(this.s57service.renderOrder);

    this.s57service.refresh.subscribe(() => {
      source.refresh();
    });
  }
}

class DefaultLayerStyler extends VectorLayerStyler {
  constructor(chart: SKChart) {
    super(chart);
  }

  public CreateLayer(): VectorTileLayer {
    return new VectorTileLayer();
  }

  // apply default vector tile style
  applyVectorStyle() {
    return new Style({
      fill: new Fill({
        color: 'rgba(#224, 209, 14, 0.8)'
      }),
      stroke: new Stroke({
        color: '#444',
        width: 1
      })
    });
  }

  public ApplyStyle(vectorLayer: VectorTileLayer) {
    // mbtiles source
    const source = new VectorTileSource({
      url: this.chart.url,
      format: new MVT({
        layers:
          this.chart.layers && this.chart.layers.length !== 0
            ? this.chart.layers
            : null
      })
    });

    vectorLayer.setSource(source);
    vectorLayer.setPreload(0);
    vectorLayer.setStyle(this.applyVectorStyle);
    vectorLayer.setMinZoom(this.MinZ);
    vectorLayer.setMaxZoom(this.MaxZ);
  }
}

class PMLayerStyler extends DefaultLayerStyler {
  constructor(chart: SKChart) {
    super(chart);
  }

  public CreateLayer(): VectorTileLayer {
    return new VectorTileLayer({ declutter: true });
  }

  public ApplyStyle(vectorLayer: VectorTileLayer) {
    vectorLayer.set('declutter', true);
    const tiles = new pmtiles.PMTiles(this.chart.url);

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
              //}.buffer, {
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

    const source = new VectorTileSource({
      format: new MVT(),
      url: 'pmtiles://' + this.chart.url + '/{z}/{x}/{y}',
      tileLoadFunction: loader
    });

    vectorLayer.setSource(source);
    vectorLayer.setPreload(0);
    vectorLayer.setStyle(this.applyVectorStyle);
    vectorLayer.setMinZoom(this.chart.minZoom);
    vectorLayer.setMaxZoom(this.chart.maxZoom);
  }
}

@Injectable({
  providedIn: 'root'
})
export class VectorLayerStyleFactory {
  constructor(private s57service: S57Service) {}
  public CreateVectorLayerStyler(chart: SKChart): VectorLayerStyler {
    if (chart.url.indexOf('.pmtiles') !== -1) {
      return new PMLayerStyler(chart);
    } else if (chart.type === 'S-57') {
      return new S57LayerStyler(chart, this.s57service);
    } else {
      return new DefaultLayerStyler(chart);
    }
  }
}
