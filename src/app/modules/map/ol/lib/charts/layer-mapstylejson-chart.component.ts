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
import apply from 'ol-mapbox-style';

import { MapComponent } from '../map.component';

import { FBChart } from 'src/app/types';
import {
  extentFromBounds,
  normaliseStyleForOl,
  type MapStyleDocument
} from './chart-utils';

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
        this.applyStyle(this.layer, `${chart[1].url}`);
        map.addLayer(this.layer);
      }
    } else {
      this.layer.setZIndex(this.zIndex());
      this.layer.setOpacity(chart[1].defaultOpacity ?? 1);
      this.layer.setExtent(extentFromBounds(chart[1].bounds));
    }
    map.render();
  }

  // Fetch the style, normalise it for the ol-mapbox-style (OpenLayers) renderer
  // (see `normaliseStyleForOl`) and apply it. Falls back to applying the URL
  // directly if the style can't be fetched or parsed, so styles that don't need
  // normalisation behave exactly as before.
  private async applyStyle(layer: LayerGroup, url: string) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const style: MapStyleDocument = await response.json();
      // Resolve relative sprite/glyph/tile URLs against the style's final URL
      // (after any redirect), falling back to the requested URL.
      await apply(layer, normaliseStyleForOl(style), {
        styleUrl: response.url || url
      });
    } catch (err) {
      console.warn(
        `MapStyleJsonChart: could not normalise style ${url}, applying as-is`,
        err
      );
      apply(layer, url);
    }
  }
}
