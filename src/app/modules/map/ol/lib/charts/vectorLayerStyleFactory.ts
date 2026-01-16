import { Injectable } from '@angular/core';
import { SKChart } from 'src/app/modules';
import { S57Service } from './s57.service';
import { S57Style } from './s57Style';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import { Extent } from 'ol/extent';
import { transformExtent } from 'ol/proj';
import { MVT } from 'ol/format';

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
  constructor(
    chart: SKChart,
    private s57service: S57Service
  ) {
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

@Injectable({
  providedIn: 'root'
})
export class VectorLayerStyleFactory {
  constructor(private s57service: S57Service) {}
  public CreateVectorLayerStyler(chart: SKChart): VectorLayerStyler {
    if (chart.type === 'S-57' || chart.type === 's-57') {
      return new S57LayerStyler(chart, this.s57service);
    }
  }
}
