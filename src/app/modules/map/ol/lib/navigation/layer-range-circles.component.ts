import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  input,
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
import { Circle, Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { mapifyRadius } from '../util';
import { AsyncSubject } from 'rxjs';
import { Convert } from '../../../../../lib/convert';
import { computeDestinationPoint } from 'geolib';
import { DarkTheme } from '../themes';

const LightTheme = {
  labelText: {
    color: 'rgba(26, 26, 1, 1)'
  }
};

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
  private theme = LightTheme;

  protected darkMode = input<boolean>(false);

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  @Input() position: Coordinate;
  @Input() maxCircles = 4;
  @Input() minZoom: number;
  @Input() mapZoom: number;
  @Input() units = 'm';

  @Input() opacity: number;
  @Input() visible: boolean;
  @Input() extent: Extent;
  @Input() zIndex: number;
  @Input() minResolution: number;
  @Input() maxResolution: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() layerProperties: { [index: string]: any };

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
    effect(() => {
      this.theme = this.darkMode() ? DarkTheme : LightTheme;
      this.parseValues();
    });
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
        if (
          ['position', 'mapZoom', 'minZoom', 'units', 'maxCircles'].includes(
            key
          )
        ) {
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
    const zoomResolution = map.getView().getResolutionForZoom(this.mapZoom);
    const fa: Feature[] = [];
    if (this.mapZoom >= this.minZoom) {
      const range =
        zoomResolution > 300
          ? 10000
          : zoomResolution > 100
          ? 5000
          : zoomResolution > 40
          ? 2000
          : zoomResolution > 20
          ? 1000
          : zoomResolution > 10
          ? 500
          : 250;
      const st = this.buildCircleStyle();
      for (let i = 1; i <= this.maxCircles; ++i) {
        const d = range * i;
        const f = new Feature({
          geometry: new Circle(
            fromLonLat(this.position),
            mapifyRadius(d, this.position)
          )
        });
        f.setStyle(st);
        fa.push(f);
        // point for text display
        const tp = computeDestinationPoint(this.position, d, 180);
        const p = new Feature({
          geometry: new Point(fromLonLat([tp.longitude, tp.latitude]))
        });
        p.setStyle(this.buildTextStyle(d));
        fa.push(p);
      }
    }
    this.features = fa;
  }

  // build target style
  buildCircleStyle(): Style {
    let cs: Style;
    if (this.layerProperties && this.layerProperties.style) {
      cs = this.layerProperties.style;
    } else {
      // default style
      cs = new Style({
        fill: new Fill({ color: 'transparent' }),
        stroke: new Stroke({
          color: 'rgba(152, 153, 10, 1)',
          width: 1.5,
          lineDash: [2, 3]
        })
      });
    }
    return cs;
  }

  buildTextStyle(value: number) {
    return new Style({
      fill: new Fill({ color: 'rgba(255, 255, 255, 0)' }),
      stroke: new Stroke({ color: 'rgba(255, 255, 255, 0)' }),
      text: new Text({
        text: value ? this.formatLabel(value) : '',
        offsetX: 0,
        offsetY: 0,
        fill: new Fill({ color: this.theme.labelText.color })
      })
    });
  }

  formatLabel(value: number): string {
    if (this.units === 'm') {
      return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${value} m`;
    } else {
      const nm = Convert.kmToNauticalMiles(value / 1000);
      return `${nm.toFixed(1)} NM`;
    }
  }
}
