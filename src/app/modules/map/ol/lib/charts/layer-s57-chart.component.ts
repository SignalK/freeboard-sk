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
import { applyStyle } from 'ol-mapbox-style';

import { VectorLayerStyleFactory } from './vectorLayerStyleFactory';
import { MapComponent } from '../map.component';

import { ChartCoverage, FBChart } from 'src/app/types';
import { setChartExtent } from './chart-utils';
import { CHART_COVERAGE } from './chart-coverage';
import { S57Service } from './s57.service';

/**
 * The chart's coverage, where Freeboard draws it with its own S-52 styling,
 * whose depth and land areas fill it: once the S-52 lookups have loaded, and
 * only for a chart without a style of its own, which may leave them out.
 */
export function opaqueCoverage(
  chart: FBChart,
  lookupsReady: boolean
): ChartCoverage | undefined {
  return lookupsReady && !chart[1].style ? chart[1].coverage : undefined;
}

// ** Freeboard S-57 Chart **
@Component({
  selector: 'ol-map > fb-s57-chart',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class S57ChartLayerComponent implements OnDestroy {
  protected chart = input.required<FBChart>();
  protected zIndex = input.required<number>();

  private layer?: VectorTileLayer;
  private vectorLayerStyleFactory = inject(VectorLayerStyleFactory);
  private changeDetectorRef = inject(ChangeDetectorRef);
  private mapComponent = inject(MapComponent);
  private s57 = inject(S57Service);
  // The layer's tiles and style come from the chart it was built from.
  private builtFrom?: { url?: string; style?: string };

  constructor() {
    this.changeDetectorRef.detach();
    effect(() => {
      this.chart();
      this.zIndex();
      this.s57.lookupsReady();
      this.parseChart();
    });
  }

  /**
   * The coverage the layer may claim. A chart served again with another URL
   * or style keeps the layer built from the first, so it claims none.
   */
  private coverage(chart: FBChart): ChartCoverage | undefined {
    const built = this.builtFrom;
    if (
      !built ||
      built.url !== chart[1].url ||
      built.style !== chart[1].style
    ) {
      return undefined;
    }
    return opaqueCoverage(chart, this.s57.lookupsReady());
  }

  ngOnDestroy() {
    const map = this.mapComponent.getMap();
    if (this.layer && map) {
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
      const styleFactory = this.vectorLayerStyleFactory.CreateVectorLayerStyler(
        chart[1]
      );
      if (!styleFactory) {
        return;
      }
      this.layer = styleFactory.CreateLayer();
      if (this.layer) {
        this.builtFrom = { url: chart[1].url, style: chart[1].style };
        styleFactory.ApplyStyle(this.layer as VectorTileLayer<never>);
        this.layer.setZIndex(this.zIndex());
        this.layer.setOpacity(chart[1].defaultOpacity ?? 1);
        if (chart[1].style) {
          applyStyle(this.layer, chart[1].style);
        }
        setChartExtent(this.layer, chart[1].bounds, map);

        this.layer.set('id', chart[0]);
        this.layer.set('chartId', chart[0]);
        this.layer.set('chartType', chart[1].type);
        this.layer.set('chartFormat', chart[1].format);
        this.layer.set(CHART_COVERAGE, this.coverage(chart));
        map.addLayer(this.layer);
      }
    } else {
      this.layer.setZIndex(this.zIndex());
      this.layer.setOpacity(chart[1].defaultOpacity ?? 1);
      this.layer.set(CHART_COVERAGE, this.coverage(chart));
      setChartExtent(this.layer, chart[1].bounds, map);
    }
    map.render();
  }
}
