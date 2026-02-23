import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
  input,
  OnDestroy
} from '@angular/core';

import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import { MVT } from 'ol/format';
import { applyStyle } from 'ol-mapbox-style';

import { MapComponent } from '../map.component';

import { FBChart } from 'src/app/types';
import { initPMTilesVectorLayer } from './pmtiles-utils';
import { resolveLayerMaxZoom } from './zoom-utils';

// ** Freeboard Vector TileLayer Chart **
@Component({
  selector: 'ol-map > fb-tilelayer-vector',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class VectorChartLayerComponent implements OnDestroy {
  protected chart = input<FBChart>();
  protected zIndex = input<number>();
  protected overZoomTiles = input<boolean>(true);
  protected mapMaxZoom = input<number>();

  private layer: VectorTileLayer;
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

      if (chart[1].url.indexOf('.pmtiles') !== -1) {
        this.layer = initPMTilesVectorLayer(chart[1], this.zIndex());
      } else {
        this.layer = new VectorTileLayer({
          source: new VectorTileSource({
            url: chart[1].url,
            format: new MVT({
              layers:
                Array.isArray(chart[1].layers) && chart[1].layers.length !== 0
                  ? chart[1].layers
                  : null
            }),
            maxZoom: maxZ
          }),
          preload: 0,
          zIndex: this.zIndex(),
          minZoom: minZ,
          maxZoom: layerMaxZ,
          opacity: chart[1].defaultOpacity ?? 1
        });
      }

      if (this.layer) {
        this.layer.setMinZoom(minZ);
        this.layer.setMaxZoom(layerMaxZ);
      }

      if (this.layer) {
        if (chart[1].style) {
          applyStyle(this.layer as any, chart[1].style);
        }
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
