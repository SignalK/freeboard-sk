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
import { extentFromBounds } from './chart-utils';

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

  // Layer types the ol-mapbox-style renderer can draw. A MapLibre style may
  // contain layers it cannot (e.g. `color-relief`, `heatmap`); when such a
  // layer is the first of its source, apply() dereferences an undefined layer
  // and rejects — blanking the whole chart instead of skipping the one layer.
  private static readonly OL_RENDERABLE_LAYER_TYPES = new Set([
    'background',
    'fill',
    'fill-extrusion',
    'line',
    'symbol',
    'circle',
    'raster',
    'hillshade'
  ]);

  // ol-mapbox-style has no `image` expression operator; a style using
  // `["image", name]` fails to parse and the whole layer styles to nothing.
  // Rewrite it to its inner name expression.
  //
  // Trade-off: in a `["coalesce", ["image", a], ["image", b]]` fallback chain
  // the fallback is lost — a name the sprite lacks is skipped rather than
  // falling through to the next branch (ol-mapbox-style draws nothing for an
  // unknown name). In practice the first branch's sprite covers it; a
  // `getImage` callback on apply() would restore full fallback if a style ever
  // needs it. This keeps the icon layers visible instead of blank.
  private unwrapImageExpressions(value: unknown): unknown {
    if (!Array.isArray(value)) {
      return value;
    }
    if (value[0] === 'image' && value.length === 2) {
      return this.unwrapImageExpressions(value[1]);
    }
    return value.map((v) => this.unwrapImageExpressions(v));
  }

  // Fetch the style, normalise it for the ol-mapbox-style renderer (drop the
  // layer types it cannot draw, unwrap `image` expressions) and apply it.
  // Falls back to applying the URL directly if the style can't be fetched or
  // parsed, preserving the previous behaviour for simple styles.
  private async applyStyle(layer: LayerGroup, url: string) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const style = await response.json();
      if (Array.isArray(style?.layers)) {
        style.layers = style.layers.filter((l: { type: string }) =>
          MapStyleJsonChartLayerComponent.OL_RENDERABLE_LAYER_TYPES.has(l.type)
        );
        for (const l of style.layers) {
          if (l.layout) {
            l.layout = this.unwrapImageExpressions(l.layout);
          }
          if (l.paint) {
            l.paint = this.unwrapImageExpressions(l.paint);
          }
        }
      }
      await apply(layer, style, { styleUrl: url });
    } catch (err) {
      console.warn(
        `MapStyleJsonChart: could not normalise style ${url}, applying as-is`,
        err
      );
      apply(layer, url);
    }
  }
}
