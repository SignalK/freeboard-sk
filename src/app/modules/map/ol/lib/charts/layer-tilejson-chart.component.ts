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
import { TileJSON } from 'ol/source';

import { MapComponent } from '../map.component';

import { FBChart } from 'src/app/types';
import { resolveLayerMaxZoom } from './zoom-utils';

// ** Freeboard TileJSON Chart **
@Component({
  selector: 'ol-map > fb-tilejson-chart',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class TileJsonChartLayerComponent implements OnDestroy {
  protected chart = input<FBChart>();
  protected zIndex = input<number>();
  protected overZoomTiles = input<boolean>(true);
  protected mapMaxZoom = input<number>();

  private layer: TileLayer;
  private changeDetectorRef = inject(ChangeDetectorRef);
  private mapComponent = inject(MapComponent);

  constructor() {
    this.changeDetectorRef.detach();
    effect(() => {
      this.chart();
      this.zIndex();
      this.overZoomTiles();
      this.mapMaxZoom();
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
      const minZ =
        chart[1].minZoom && chart[1].minZoom >= 0.1
          ? chart[1].minZoom - 0.1
          : chart[1].minZoom;
      const maxZ = chart[1].maxZoom;
      const layerMaxZ = resolveLayerMaxZoom(
        maxZ,
        this.mapMaxZoom(),
        this.overZoomTiles()
      );

      this.layer = new TileLayer({
        source: new TileJSON({
          url: chart[1].url,
          crossOrigin: 'anonymous'
        }),
        preload: 0,
        zIndex: this.zIndex(),
        minZoom: minZ,
        maxZoom: layerMaxZ,
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
      const minZ =
        chart[1].minZoom && chart[1].minZoom >= 0.1
          ? chart[1].minZoom - 0.1
          : chart[1].minZoom;
      const maxZ = chart[1].maxZoom;
      const layerMaxZ = resolveLayerMaxZoom(
        maxZ,
        this.mapMaxZoom(),
        this.overZoomTiles()
      );
      this.layer.setZIndex(this.zIndex());
      this.layer.setMinZoom(minZ);
      this.layer.setMaxZoom(layerMaxZ);
      this.layer.setOpacity(chart[1].defaultOpacity ?? 1);
    }
    map.render();
  }
}
