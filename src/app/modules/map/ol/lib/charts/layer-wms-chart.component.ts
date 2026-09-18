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

import { ChartImageAdjustment, FBChart } from 'src/app/types';
import { Map } from 'ol';
import { MapService } from '../map.service';
import {
  applyChartTimeToWms,
  attachImageAdjustmentFilter,
  chartLayerClassName,
  extentFromBounds,
  resolveLayerZoomRange,
  startChartTileRefresh
} from './chart-utils';

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
  protected overZoomTiles = input<boolean>(true);
  protected mapMaxZoom = input<number>();

  private layer: TileLayer;
  private setImageAdjustment?: (adj?: ChartImageAdjustment) => void;
  private stopRefresh?: () => void;
  private refreshIntervalMs?: number;
  // Instant the source is showing; it is built showing the live frame.
  private appliedTime: string | null = null;
  private changeDetectorRef = inject(ChangeDetectorRef);
  private mapComponent = inject(MapComponent);
  private mapService = inject(MapService);

  private map: Map;
  private featureUrl: string = undefined;

  constructor() {
    this.changeDetectorRef.detach();
    this.map = this.mapComponent.getMap();
    effect(() => {
      this.chart();
      this.zIndex();
      this.overZoomTiles();
      this.mapMaxZoom();
      this.parseChart();
    });
    effect(() => {
      const ev = this.mapComponent.pointerDownSignal();
      if (!ev) {
        return;
      }
      const view = this.map.getView();
      const prj = view.getProjection();
      const resolution = view.getResolution();
      const coord = this.map.getEventCoordinate(ev);
      const src: TileWMS = this.layer.getSource() as TileWMS;
      this.featureUrl = src.getFeatureInfoUrl(coord, resolution, prj, {
        INFO_FORMAT: 'application/json'
      });
      if (this.featureUrl) {
        this.mapService.addFeatureUrls({
          id: this.chart()[0],
          name: this.chart()[1].name,
          type: 'chart',
          subType: 'wms',
          url: this.featureUrl
        });
      }
    });
  }

  ngOnDestroy() {
    this.stopRefresh?.();
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
      const zoom = resolveLayerZoomRange(
        chart[1],
        this.mapMaxZoom(),
        this.overZoomTiles()
      );

      this.layer = new TileLayer({
        source: new TileWMS({
          url: chart[1].url,
          params: {
            LAYERS: chart[1].layers ? chart[1].layers.join(',') : ''
          }
        }),
        preload: 0,
        zIndex: this.zIndex(),
        minZoom: zoom.min,
        maxZoom: zoom.max,
        opacity: chart[1].defaultOpacity ?? 1,
        extent: extentFromBounds(chart[1].bounds),
        className: chartLayerClassName(chart[0])
      });

      if (this.layer) {
        this.layer.set('id', chart[0]);
        this.layer.set('chartId', chart[0]);
        this.layer.set('chartType', chart[1].type);
        this.layer.set('chartFormat', chart[1].format);
        this.setImageAdjustment = attachImageAdjustmentFilter(this.layer);
        this.map.addLayer(this.layer);
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
      const src = this.layer.getSource() as TileWMS;
      const l = chart[1].layers ? chart[1].layers.join(',') : '';
      const p = src.getParams();
      if (p.LAYERS && p.LAYERS !== l) {
        src.updateParams({ LAYERS: l });
        src.refresh();
      }
    }
    if (this.layer) {
      // Show the selected instant of a time-varying chart (null = live). Any
      // change applies -- including back to live for a chart that has just
      // lost its time dimension, so no stale TIME lingers on the source.
      const time = chart[1].timeValue ?? null;
      if (time !== this.appliedTime) {
        applyChartTimeToWms(this.layer.getSource() as TileWMS, time);
        this.appliedTime = time;
      }
      // Auto-refresh time-varying charts (radar/satellite) non-destructively.
      // A historical frame does not change, so the timer is suspended while an
      // instant is selected and resumes on return to live.
      const iv = time === null ? chart[1].refreshInterval : undefined;
      if (!this.stopRefresh || iv !== this.refreshIntervalMs) {
        this.stopRefresh?.();
        this.refreshIntervalMs = iv;
        this.stopRefresh = startChartTileRefresh(this.layer.getSource(), iv);
      }
    }
    this.setImageAdjustment?.(chart[1].imageAdjustment);
    this.map.render();
  }
}
