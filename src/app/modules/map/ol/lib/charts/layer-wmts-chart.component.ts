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

import { MapComponent } from '../map.component';

import { ChartImageAdjustment, FBChart } from 'src/app/types';
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS';

import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import {
  applyChartTimeToWmts,
  attachImageAdjustmentFilter,
  chartLayerClassName,
  extentFromBounds,
  resolveLayerZoomRange,
  startChartTileRefresh
} from './chart-utils';

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
  protected overZoomTiles = input<boolean>(true);
  protected mapMaxZoom = input<number>();

  private layer: TileLayer;
  private capabilities: string;
  private setImageAdjustment?: (adj?: ChartImageAdjustment) => void;
  private stopRefresh?: () => void;
  private refreshIntervalMs?: number;
  // Dimension values the capabilities declared as defaults: what the live
  // frame is drawn with, and what a selected instant is restored to.
  private defaultDimensions: Record<string, unknown> = {};
  // Instant the source is showing; it is built showing the live frame.
  private appliedTime: string | null = null;
  private destroyed = false;
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
    this.destroyed = true;
    this.stopRefresh?.();
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
        const url = `${chart[1].url}`;
        this.capabilities = await this.fetchWMTSCapabilities(url);
      } catch (err) {
        console.log(err);
        return;
      }
    }
    // The capabilities fetch is async: if the component was destroyed while it
    // was in flight, don't resurrect the layer or start an orphaned timer.
    if (this.destroyed) {
      return;
    }
    const options = optionsFromCapabilities(this.capabilities, {
      layer: chart[1].layers[0],
      matrixSet: 'EPSG:3857'
    });

    if (!this.layer) {
      const zoom = resolveLayerZoomRange(
        chart[1],
        this.mapMaxZoom(),
        this.overZoomTiles()
      );

      // Copied: the source takes the dimensions object by reference and
      // mutates it on every update.
      this.defaultDimensions = { ...(options.dimensions ?? {}) };
      this.layer = new TileLayer({
        source: new WMTS(options),
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
    if (this.layer) {
      // Show the selected instant of a time-varying chart (null = live).
      const time = chart[1].timeValue ?? null;
      if (chart[1].time && time !== this.appliedTime) {
        applyChartTimeToWmts(
          this.layer.getSource() as WMTS,
          time,
          this.defaultDimensions
        );
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
    map.render();
  }

  /** Retrieve WMTS capabilities as JSON object*/
  private async fetchWMTSCapabilities(hostUrl: string) {
    const abortCtrl = new AbortController();
    const abortTimer = setTimeout(() => abortCtrl.abort(), 5000);
    try {
      const r = await fetch(hostUrl + `?request=GetCapabilities&service=wmts`, {
        signal: abortCtrl.signal
      });
      clearTimeout(abortTimer);
      const res = await r.text();
      const wmts = new WMTSCapabilities();
      const capabilities = wmts.read(res);
      return capabilities;
    } catch (err) {
      clearTimeout(abortTimer);
      throw new Error(err.message ?? 'Unable to retrieve capabilities!', {
        cause: err
      });
    }
  }
}
