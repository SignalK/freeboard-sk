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
import {
  attachImageAdjustmentFilter,
  chartLayerClassName,
  extentFromBounds,
  resolveLayerZoomRange
} from './chart-utils';

import { ChartImageAdjustment, FBChart } from 'src/app/types';

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
  protected overZoomTiles = input<boolean>(true);
  protected mapMaxZoom = input<number>();

  private layer: TileLayer | WebGLTileLayer;
  private setImageAdjustment?: (adj?: ChartImageAdjustment) => void;
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
      const zoom = resolveLayerZoomRange(
        chart[1],
        this.mapMaxZoom(),
        this.overZoomTiles()
      );

      if (chart[0] === 'openstreetmap') {
        this.layer = osmLayer(chartLayerClassName(chart[0]));
        this.layer.setZIndex(this.zIndex());
        this.layer.setMinZoom(zoom.min);
        this.layer.setMaxZoom(zoom.max);
        this.layer.setOpacity(chart[1].defaultOpacity ?? 1);
      } else {
        if (chart[1].url.indexOf('.pmtiles') !== -1) {
          this.layer = initPMTilesXYZLayer(
            chart[1],
            this.zIndex(),
            chartLayerClassName(chart[0])
          );
        } else {
          this.layer = new TileLayer({
            source: new XYZ({
              url: chart[1].url,
              // Tile source keeps the declared maximum: the display range gates
              // rendering, it never changes which tiles exist.
              maxZoom: chart[1].maxZoom,
              tileSize: chart[1].tileSize ?? 256
            }),
            preload: 0,
            zIndex: this.zIndex(),
            minZoom: zoom.min,
            maxZoom: zoom.max,
            opacity: chart[1].defaultOpacity ?? 1,
            className: chartLayerClassName(chart[0])
          });
        }
        if (this.layer) {
          this.layer.setMinZoom(zoom.min);
          this.layer.setMaxZoom(zoom.max);
        }
      }
      if (this.layer) {
        this.layer.setExtent(extentFromBounds(chart[1].bounds));
        this.layer.set('id', chart[0]);
        this.layer.set('chartId', chart[0]);
        this.layer.set('chartType', chart[1].type);
        this.layer.set('chartFormat', chart[1].format);
        // Brightness/contrast is a canvas filter; the WebGL pmtiles layer has no
        // 2D context, so it is left unadjusted.
        if (this.layer instanceof TileLayer) {
          this.setImageAdjustment = attachImageAdjustmentFilter(this.layer);
        }
        map.addLayer(this.layer);
      }
    } else {
      const zoom = resolveLayerZoomRange(
        chart[1],
        this.mapMaxZoom(),
        this.overZoomTiles()
      );
      this.layer.setZIndex(this.zIndex());
      this.layer.setMinZoom(zoom.min);
      this.layer.setMaxZoom(zoom.max);
      this.layer.setOpacity(chart[1].defaultOpacity ?? 1);
      this.layer.setExtent(extentFromBounds(chart[1].bounds));
    }
    this.setImageAdjustment?.(chart[1].imageAdjustment);
    map.render();
  }
}
