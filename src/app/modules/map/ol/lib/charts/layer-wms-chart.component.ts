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
import { Map } from 'ol';

// ** Freeboard WMS Chart **
@Component({
  selector: 'ol-map > fb-wms-chart',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class WmsChartLayerComponent implements OnDestroy {
  protected chart = input<FBChart>();
  protected zIndex = input<number>();
  protected params =
    input<Array<{ id: string; param: { [key: string]: any } }>>();

  private layer: TileLayer;
  private changeDetectorRef = inject(ChangeDetectorRef);
  private mapComponent = inject(MapComponent);

  private map: Map;
  private featureUrl: string = undefined;

  constructor() {
    this.changeDetectorRef.detach();
    this.map = this.mapComponent.getMap();
    effect(() => {
      this.chart();
      this.zIndex();
      this.parseChart();
    });
    effect(() => {
      if (!this.layer || !Array.isArray(this.params())) return;
      const src = this.layer.getSource();
      if (src) {
        (src as TileWMS).updateParams(this.params);
      }
    });
    effect(() => {
      const ev = this.mapComponent.pointerDownSignal();
      const view = this.map.getView();
      const prj = view.getProjection();
      const resolution = view.getResolution();
      const coord = this.map.getEventCoordinate(ev);

      const src: TileWMS = this.layer.getSource() as TileWMS;
      this.featureUrl = src.getFeatureInfoUrl(coord, resolution, prj, {
        INFO_FORMAT: 'application/json'
      });
      //const data = this.layer.getData(this.map.getEventPixel(ev));
      //const hit = data && data[3] > 0;
      //console.log('data', data, 'hit', hit);
      /*if (this.featureUrl) { // && data) {
        fetch(this.featureUrl)
          .then((response) => response.json())
          .then((json) => {
            console.log(json);
          });
      }*/
    });
  }

  ngOnDestroy() {
    if (this.layer) {
      this.map.removeLayer(this.layer);
      this.map.render();
    }
  }

  private parseChart(chart: FBChart = this.chart()) {
    if (!this.map) {
      return;
    }

    if (!this.layer) {
      const minZ =
        chart[1].minZoom && chart[1].minZoom >= 0.1
          ? chart[1].minZoom - 0.1
          : chart[1].minZoom;
      const maxZ = chart[1].maxZoom;

      this.layer = new TileLayer({
        source: new TileWMS({
          url: chart[1].url,
          params: {
            LAYERS: chart[1].layers ? chart[1].layers.join(',') : ''
          }
        }),
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
        this.map.addLayer(this.layer);
      }
    } else {
      this.layer.setZIndex(this.zIndex());
      this.layer.setOpacity(chart[1].defaultOpacity ?? 1);
      const src = this.layer.getSource() as TileWMS;
      src.updateParams({
        LAYERS: chart[1].layers ? chart[1].layers.join(',') : ''
      });
      src.refresh();
    }
    this.map.render();
  }
}
