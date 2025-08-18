import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
import { Layer } from 'ol/layer';
import { Feature } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Stroke, Fill, Text } from 'ol/style';
import { Circle } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { mapifyRadius } from '../util';
import { AsyncSubject } from 'rxjs';
import { Convert } from '../../../../../lib/convert';

// ** Freeboard Range Circles component **
@Component({
  selector: 'ol-map > fb-range-circles',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class RangeCirclesComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer;
  public source: VectorSource;
  protected features: Array<Feature>;

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  @Input() position: Coordinate;
  @Input() minZoom: number;
  @Input() zoomLevel: number;
  @Input() units = 'm';
  @Input() opacity: number;
  @Input() visible: boolean;
  @Input() extent: Extent;
  @Input() zIndex: number;
  @Input() minResolution: number;
  @Input() maxResolution: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() layerProperties: { [index: string]: any };

  public mapifiedLine: Array<Coordinate> = [];

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    this.parseValues();
    this.source = new VectorSource({ features: this.features });
    this.layer = new VectorLayer(
      Object.assign(this, { ...this.layerProperties })
    );

    const map = this.mapComponent.getMap();
    if (this.layer && map) {
      map.addLayer(this.layer);
      map.render();
      this.layerReady.next(this.layer);
      this.layerReady.complete();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.layer) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const properties: { [index: string]: any } = {};

      for (const key in changes) {
        if (['position', 'zoomLevel', 'minZoom', 'units'].includes(key)) {
          this.parseValues();
          if (this.source) {
            this.source.clear();
            this.source.addFeatures(this.features);
          }
        } else if (key === 'layerProperties') {
          this.layer.setProperties(properties, false);
        } else {
          properties[key] = changes[key].currentValue;
        }
      }
      this.layer.setProperties(properties, false);
    }
  }

  ngOnDestroy() {
    const map = this.mapComponent.getMap();
    if (this.layer && map) {
      map.removeLayer(this.layer);
      map.render();
      this.layer = null;
    }
  }

  parseValues() {
    const map = this.mapComponent.getMap();
    const zoomResolution = map.getView().getResolutionForZoom(this.zoomLevel);
    const fa: Feature[] = [];
    if (this.zoomLevel >= this.minZoom) {
      const range =
        zoomResolution > 400
          ? 10000
          : zoomResolution > 130
          ? 5000
          : zoomResolution > 60
          ? 2000
          : zoomResolution > 25
          ? 1000
          : zoomResolution > 10
          ? 500
          : 250;
      const st0 = this.buildStyle(range);
      const st = this.buildStyle();
      const qty = 4;
      for (let i = 1; i <= qty; ++i) {
        const f = new Feature({
          geometry: new Circle(
            fromLonLat(this.position),
            mapifyRadius(range * i, this.position)
          )
        });
        f.setStyle(i === 1 ? st0 : st);
        fa.push(f);
      }
    }
    this.features = fa;
  }

  // build target style
  buildStyle(value?: number): Style {
    let cs: Style;
    if (this.layerProperties && this.layerProperties.style) {
      cs = this.layerProperties.style;
    } else {
      // default style
      cs = new Style({
        fill: new Fill({ color: 'rgba(255, 255, 255, 0)' }),
        stroke: new Stroke({
          color: 'rgba(152, 153, 10, 1)',
          width: 1.5,
          lineDash: [2, 3]
        }),
        text: new Text({
          text: value ? this.formatLabel(value) : '',
          offsetX: 45,
          offsetY: 0,
          stroke: new Stroke({ color: 'rgba(242, 197, 33, 1)' })
        })
      });
    }
    return cs;
  }

  formatLabel(value: number): string {
    if (this.units === 'm') {
      return value >= 1000 ? `${Math.floor(value / 1000)} km` : `${value} m`;
    } else {
      const nm = Convert.kmToNauticalMiles(value / 1000);
      return `${nm.toFixed(1)} NM`;
    }
  }
}
