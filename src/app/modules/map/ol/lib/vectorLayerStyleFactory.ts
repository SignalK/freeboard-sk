import { Injectable } from '@angular/core';
import { SKChart } from 'src/app/modules';
import { S57Service } from './s57.service';
import { S57Style } from './s57Style';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import { Extent, applyTransform } from 'ol/extent';
import { transformExtent } from 'ol/proj';
import { MVT } from 'ol/format';
import { Style, Fill, Stroke } from 'ol/style';
import * as pmtiles from 'pmtiles';
import { FeatureLike } from 'ol/Feature';
import { Coordinate } from 'ol/coordinate';

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

  public abstract ApplyStyle(vectorLayer: VectorTileLayer<never>);
  public abstract CreateLayer(): VectorTileLayer<never>;
}

class S57LayerStyler extends VectorLayerStyler {
  constructor(chart: SKChart, private s57service: S57Service) {
    super(chart);
  }

  public CreateLayer(): VectorTileLayer<never> {
    let extent: Extent = null;
    if (this.chart.bounds && this.chart.bounds.length > 0) {
      extent = transformExtent(this.chart.bounds, 'EPSG:4326', 'EPSG:3857');
    }
    return new VectorTileLayer({ declutter: true, extent: extent });
  }

  public ApplyStyle(vectorLayer: VectorTileLayer<never>) {
    const source = new VectorTileSource({
      url: this.chart.url,
      minZoom: this.chart.minZoom,
      maxZoom: this.chart.maxZoom,
      format: new MVT({}),
      tileSize: 256
    });

    const style = new S57Style(this.s57service);

    vectorLayer.setSource(source as never);
    vectorLayer.setPreload(0);
    vectorLayer.setStyle(style.getStyle);
    vectorLayer.setMinZoom(this.chart.minZoom);
    vectorLayer.setMaxZoom(23);
    vectorLayer.setRenderOrder(style.renderOrder);

    this.s57service.refresh.subscribe(() => {
      source.refresh();
    });
  }
}

class DefaultLayerStyler extends VectorLayerStyler {
  constructor(chart: SKChart) {
    super(chart);
  }

  public CreateLayer(): VectorTileLayer<never> {
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

  public ApplyStyle(vectorLayer: VectorTileLayer<never>) {
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

    vectorLayer.setSource(source as never);
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

  public CreateLayer(): VectorTileLayer<never> {
    return new VectorTileLayer({ declutter: true });
  }

  public ApplyStyle(vectorLayer: VectorTileLayer<never>) {
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

    vectorLayer.setSource(source as never);
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
    } else if (chart.type === 'S-57' || chart.type === 's-57') {
      return new S57LayerStyler(chart, this.s57service);
    } else {
      return new DefaultLayerStyler(chart);
    }
  }
}
