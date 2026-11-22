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
      this.chart.minZoom && this.chart.minZoom >= 0.1
        ? this.chart.minZoom - 0.1
        : this.chart.minZoom;
    this.MaxZ = this.chart.maxZoom;
  }

  public abstract ApplyStyle(vectorLayer: VectorTileLayer<never>): void;
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
    let extent: Extent | undefined;
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

    // The service refreshes when the symbols load, when their image loads and
    // when the options change. None of these changes which features a tile
    // holds, so the loaded tiles are styled and sorted again rather than
    // fetched again, which would blank the chart and show the charts beneath
    // it until they were back. OpenLayers sorts a loaded tile's features again
    // only for a new render order function, and the sort is where display
    // priority and the safe contour are worked out, so each refresh sets one.
    this.s57service.refresh.subscribe(() => {
      vectorLayer.setRenderOrder((a, b) => style.renderOrder(a, b));
      vectorLayer.changed();
    });
  }
}

@Injectable({
  providedIn: 'root'
})
export class VectorLayerStyleFactory {
  constructor(private s57service: S57Service) {}

  public CreateVectorLayerStyler(
    chart: SKChart
  ): VectorLayerStyler | undefined {
    if (chart.type === 'S-57' || chart.type === 's-57') {
      this.s57service.fetchSymbols();
      return new S57LayerStyler(chart, this.s57service);
    }
  }
}
