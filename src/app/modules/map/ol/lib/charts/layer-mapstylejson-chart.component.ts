import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
  input,
  OnDestroy
} from '@angular/core';

import LayerGroup from 'ol/layer/Group';

import { MapComponent } from '../map.component';

import { FBChart } from 'src/app/types';
import { applyMapStyle, extentFromBounds } from './chart-utils';

// ** Freeboard MapStyleJSON Chart **
@Component({
  selector: 'ol-map > fb-mapstylejson-chart',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class MapStyleJsonChartLayerComponent implements OnDestroy {
  protected chart = input<FBChart>();
  protected zIndex = input<number>();

  private layer: LayerGroup;
  private stopRecovery?: () => void;
  private destroyed = false;
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
    this.destroyed = true;
    this.stopRecovery?.();
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
      this.layer = new LayerGroup({
        zIndex: this.zIndex()
      });

      if (this.layer) {
        this.layer.set('id', chart[0]);
        this.layer.set('chartId', chart[0]);
        this.layer.set('chartType', chart[1].type);
        this.layer.set('chartFormat', chart[1].format);
        this.layer.setOpacity(chart[1].defaultOpacity ?? 1);
        this.layer.setExtent(extentFromBounds(chart[1].bounds));
        applyMapStyle(this.layer, `${chart[1].url}`).then((stop) => {
          // If we were destroyed before the async style apply resolved, stop the
          // outage-recovery watcher now; otherwise keep it for ngOnDestroy.
          if (this.destroyed) {
            stop();
          } else {
            this.stopRecovery = stop;
          }
        });
        map.addLayer(this.layer);
      }
    } else {
      this.layer.setZIndex(this.zIndex());
      this.layer.setOpacity(chart[1].defaultOpacity ?? 1);
      this.layer.setExtent(extentFromBounds(chart[1].bounds));
    }
    map.render();
  }
}
