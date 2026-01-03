import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
  input,
  OnDestroy
} from '@angular/core';

import TileLayer from 'ol/layer/Tile';
import { TileWMS } from 'ol/source';

import { MapComponent } from '../map.component';

import { FBChart } from 'src/app/types';
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS';
import { WMTSCapabilities } from 'ol/format';
import { WMTSGetCapabilities } from 'src/app/modules/skresources/components/charts/wmslib';

// ** Freeboard WMTS Chart **
@Component({
  selector: 'ol-map > fb-wmts-chart',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class WmtsChartLayerComponent implements OnDestroy {
  protected chart = input<FBChart>();
  protected zIndex = input<number>();
  protected params =
    input<Array<{ id: string; param: { [key: string]: any } }>>();

  private layer: TileLayer;
  private capabilities: string;
  private changeDetectorRef = inject(ChangeDetectorRef);
  private mapComponent = inject(MapComponent);

  constructor() {
    this.changeDetectorRef.detach();
    effect(() => {
      this.chart();
      this.zIndex();
      this.parseChart();
    });
    effect(() => {
      if (!this.layer || !Array.isArray(this.params())) return;
      const src = this.layer.getSource();
      if (src) {
        (src as WMTS).updateDimensions(this.params);
      }
    });
  }

  ngOnDestroy() {
    this.capabilities = undefined;
    const map = this.mapComponent.getMap();
    if (this.layer) {
      map.removeLayer(this.layer);
      map.render();
    }
  }

  private async parseChart(chart: FBChart = this.chart()) {
    const map = this.mapComponent.getMap();
    if (!map) {
      return;
    }

    if (!this.capabilities) {
      try {
        const url = `${chart[1].url}?request=GetCapabilities&service=wmts`;
        this.capabilities = await WMTSGetCapabilities(url);
      } catch (err) {
        console.log(err);
        return;
      }
    }
    const options = optionsFromCapabilities(this.capabilities, {
      layer: chart[1].layers[0],
      matrixSet: 'EPSG:3857'
    });

    if (!this.layer) {
      const minZ =
        chart[1].minZoom && chart[1].minZoom >= 0.1
          ? chart[1].minZoom - 0.1
          : chart[1].minZoom;
      const maxZ = chart[1].maxZoom;

      this.layer = new TileLayer({
        source: new WMTS(options),
        preload: 0,
        zIndex: this.zIndex(),
        minZoom: minZ,
        maxZoom: maxZ,
        opacity: chart[1].defaultOpacity ?? 1
      });

      if (this.layer) {
        this.layer.set('id', chart[0]);
        this.layer.set('chartId', chart[0]);
        this.layer.set('chartType', chart[1].type);
        this.layer.set('chartFormat', chart[1].format);
        map.addLayer(this.layer);
      }
    } else {
      this.layer.setZIndex(this.zIndex());
      this.layer.setOpacity(chart[1].defaultOpacity ?? 1);
      const src = this.layer.getSource() as WMTS;
      src.updateDimensions({
        LAYERS: chart[1].layers ? chart[1].layers.join(',') : ''
      });
      src.refresh();
    }
    map.render();
  }
}
