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

import { FBChart } from 'src/app/types';
import { setChartExtent } from './chart-utils';
import { CHART_COVERAGE } from './chart-coverage';

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
        this.layer.set(CHART_COVERAGE, chart[1].coverage);
        map.addLayer(this.layer);
      }
    } else {
      this.layer.setZIndex(this.zIndex());
      this.layer.setOpacity(chart[1].defaultOpacity ?? 1);
      this.layer.set(CHART_COVERAGE, chart[1].coverage);
      setChartExtent(this.layer, chart[1].bounds, map);
    }
    map.render();
  }
}
