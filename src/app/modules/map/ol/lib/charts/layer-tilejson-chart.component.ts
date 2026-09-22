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

import { UrlFunction } from 'ol/Tile';

import { resolveChartTime } from 'src/app/lib/chart-time';
import { ChartImageAdjustment, FBChart } from 'src/app/types';
import {
  applyChartTimeToTileSource,
  attachImageAdjustmentFilter,
  chartLayerClassName,
  extentFromBounds,
  resolveLayerZoomRange,
  startChartTileRefresh
} from './chart-utils';

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
  private setImageAdjustment?: (adj?: ChartImageAdjustment) => void;
  private stopRefresh?: () => void;
  private refreshIntervalMs?: number;
  // The tile-URL function the source built from its TileJSON document: what
  // draws the live frame. Captured once the document has loaded, since the
  // source overwrites its function at that point.
  private liveTileUrlFunction?: UrlFunction;
  // Instant the tile source is requesting; it is built requesting the live
  // frame.
  private appliedTime: string | null = null;
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
    this.stopRefresh?.();
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

      const source = new TileJSON({
        url: chart[1].url,
        crossOrigin: 'anonymous'
      });
      // The document arrives asynchronously; an instant can only be applied
      // over the tile-URL function it yields. Captured for every chart, as
      // a dimension can arrive later through a chart-resource update.
      const onLoaded = () => {
        if (source.getState() !== 'ready') {
          return;
        }
        source.un('change', onLoaded);
        this.liveTileUrlFunction = source.getTileUrlFunction();
        this.applyTime(this.chart());
      };
      source.on('change', onLoaded);
      this.layer = new TileLayer({
        source,
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
    this.applyTime(chart);
    // Auto-refresh time-varying charts (radar/satellite) non-destructively.
    // A historical frame does not change, so the timer is suspended while an
    // instant is selected and resumes on return to the newest frame, which
    // each tick resolves afresh.
    if (this.layer) {
      const iv =
        typeof chart[1].timeValue === 'string'
          ? undefined
          : chart[1].refreshInterval;
      if (!this.stopRefresh || iv !== this.refreshIntervalMs) {
        this.stopRefresh?.();
        this.refreshIntervalMs = iv;
        this.stopRefresh = startChartTileRefresh(
          this.layer.getSource(),
          iv,
          () => this.applyTime(this.chart())
        );
      }
    }
    this.setImageAdjustment?.(chart[1].imageAdjustment);
    map.render();
  }

  /**
   * Request the selected instant of a time-varying chart, or its newest frame
   * for `null` (live where the source serves it, else the newest frame that
   * exists now), once the TileJSON document has yielded the live tile-URL
   * function to return to.
   */
  private applyTime(chart?: FBChart) {
    const source = this.layer?.getSource();
    if (!chart || !(source instanceof TileJSON) || !this.liveTileUrlFunction) {
      return;
    }
    // Any change applies -- including back to live for a chart that has just
    // lost its time dimension, so no stale instant lingers on the source.
    const time = resolveChartTime(chart[1].time, chart[1].timeValue ?? null);
    if (time === this.appliedTime) {
      return;
    }
    applyChartTimeToTileSource(
      source,
      time,
      chart[1].time?.url,
      this.liveTileUrlFunction
    );
    this.appliedTime = time;
  }
}
