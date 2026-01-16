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
import WebGLTileLayer from 'ol/layer/WebGLTile';
import { XYZ } from 'ol/source';

import { initPMTilesXYZLayer } from './pmtiles-utils';
import { osmLayer } from '../util';
import { MapComponent } from '../map.component';

import { FBChart } from 'src/app/types';

// ** Freeboard Raster TileLayer Chart **
@Component({
  selector: 'ol-map > fb-tilelayer-raster',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class RasterChartLayerComponent implements OnDestroy {
  protected chart = input<FBChart>();
  protected zIndex = input<number>();

  private layer: TileLayer | WebGLTileLayer;
  private changeDetectorRef = inject(ChangeDetectorRef);
  private mapComponent = inject(MapComponent);

  constructor() {
    this.changeDetectorRef.detach();
    effect(() => {
      this.chart();
      this.zIndex();
      this.parseChart();
    });
  }

  ngOnDestroy() {
    const map = this.mapComponent.getMap();
    if (this.layer) {
      map.removeLayer(this.layer);
      map.render();
    }
  }

  private parseChart(chart: FBChart = this.chart()) {
    const map = this.mapComponent.getMap();
    if (!map) {
      return;
    }

    if (!this.layer) {
      if (chart[0] === 'openstreetmap') {
        this.layer = osmLayer();
        this.layer.setZIndex(this.zIndex());
        this.layer.setMinZoom(chart[1].minZoom);
        this.layer.setMaxZoom(chart[1].maxZoom);
        this.layer.setOpacity(chart[1].defaultOpacity ?? 1);
      } else {
        const minZ =
          chart[1].minZoom && chart[1].minZoom >= 0.1
            ? chart[1].minZoom - 0.1
            : chart[1].minZoom;
        const maxZ = chart[1].maxZoom;

        if (chart[1].url.indexOf('.pmtiles') !== -1) {
          this.layer = initPMTilesXYZLayer(chart[1], this.zIndex());
        } else {
          this.layer = new TileLayer({
            source: new XYZ({
              url: chart[1].url
            }),
            preload: 0,
            zIndex: this.zIndex(),
            minZoom: minZ,
            maxZoom: maxZ,
            opacity: chart[1].defaultOpacity ?? 1
          });
        }
      }
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
    }
    map.render();
  }
}
