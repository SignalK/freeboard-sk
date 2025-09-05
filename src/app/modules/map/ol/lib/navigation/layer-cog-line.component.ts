import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  SimpleChange,
  input,
  effect,
  signal
} from '@angular/core';
import { Layer } from 'ol/layer';
import { Feature } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Stroke, Fill, Circle, Text } from 'ol/style';
import { StyleLike } from 'ol/style/Style';
import { LineString, Point } from 'ol/geom';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { fromLonLatArray, mapifyCoords } from '../util';
import { AsyncSubject } from 'rxjs';
import { getDistance } from 'geolib';
import { Convert } from 'src/app/lib/convert';
import { DarkTheme } from '../themes';

const LightTheme = {
  labelText: {
    color: 'rgba(204, 12, 225, 0.7)'
  }
};

// ** Freeboard COG line component **
@Component({
  selector: 'ol-map > fb-cog-line',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class CogLineComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer;
  public source: VectorSource;
  protected features: Array<Feature> = [];
  private theme = LightTheme;

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  protected coords = input<Coordinate[]>();
  protected cogTime = input<number>();
  protected units = input<'m' | 'ft'>('m');
  protected labelMinZoom = input<number>(10);
  protected darkMode = input<boolean>(false);

  @Input() mapZoom = 10;
  @Input() opacity: number;
  @Input() visible: boolean;
  @Input() extent: Extent;
  @Input() zIndex: number;
  @Input() minResolution: number;
  @Input() maxResolution: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() layerProperties: { [index: string]: any };

  private labelText = signal<string>('');
  protected mapifiedLine: Array<Coordinate> = [];

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
    effect(() => {
      this.coords();
      this.cogTime();
      this.parseInput();
      if (this.source) {
        this.source.clear();
        this.source.addFeatures(this.features);
      }
    });
    effect(() => {
      this.labelMinZoom();
      if (typeof this.mapZoom !== 'undefined') {
        this.updateLabel();
      }
    });
    effect(() => {
      this.theme = this.darkMode() ? DarkTheme : LightTheme;
      this.updateLabel();
    });
  }

  ngOnInit() {
    this.parseInput();
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
        if (key === 'mapZoom') {
          this.handleLabelZoomChange(key, changes[key]);
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

  parseInput() {
    const fa: Feature[] = [];
    if (Array.isArray(this.coords()) && this.coords().length !== 0) {
      this.mapifiedLine = mapifyCoords(this.coords());

      this.labelText.update(() => {
        return `${this.formatNumber(
          getDistance(this.coords()[0], this.coords()[1])
        )}  ${
          this.cogTime() >= 60
            ? this.cogTime() / 60 + 'hr'
            : this.cogTime() + 'min'
        }`;
      });

      const cog = new Feature({
        geometry: new LineString(fromLonLatArray(this.mapifiedLine))
      });
      cog.setId('cogSelf');
      cog.setStyle((feature: Feature) => {
        const color = 'rgba(204, 12, 225, 0.7)';
        const geometry = feature.getGeometry() as LineString;
        const styles = [];
        styles.push(
          new Style({
            stroke: new Stroke({ color: color, width: 1 })
          })
        );
        geometry.forEachSegment((start: Coordinate, end: Coordinate) => {
          styles.push(
            new Style({
              geometry: new Point(end),
              image: new Circle({
                radius: 2,
                stroke: new Stroke({
                  color: color,
                  width: 1
                }),
                fill: new Fill({ color: 'transparent' })
              }),
              text: this.buildLabelStyle()
            })
          );
        });
        return styles;
      });
      fa.push(cog);
    }
    this.features = fa;
  }

  formatNumber(value: number): string {
    if (this.units() === 'm') {
      return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${value} m`;
    } else {
      const nm = Convert.kmToNauticalMiles(value / 1000);
      return `${nm.toFixed(1)} NM`;
    }
  }

  // ** assess attribute change **
  handleLabelZoomChange(key: string, change: SimpleChange) {
    if (key === 'mapZoom') {
      if (typeof this.labelMinZoom() !== 'undefined') {
        if (
          (change.currentValue >= this.labelMinZoom() &&
            change.previousValue < this.labelMinZoom()) ||
          (change.currentValue < this.labelMinZoom() &&
            change.previousValue >= this.labelMinZoom())
        ) {
          this.updateLabel();
        }
      }
    }
  }

  // update feature labels
  updateLabel(f?: Feature) {
    if (!f && this.source) {
      f = this.source.getFeatureById('cogSelf') as Feature;
    }
    let s: StyleLike = f.getStyle();
    if (!s) {
      return;
    }
    s = Array.isArray(s) ? s[1] : s;
    (s as Style).setText(this.buildLabelStyle());
    f.setStyle(s);
  }

  buildLabelStyle() {
    return new Text({
      text:
        Math.abs(this.mapZoom) >= this.labelMinZoom()
          ? this.labelText() ?? ''
          : '',
      offsetX: 0,
      offsetY: -10,
      fill: new Fill({ color: this.theme.labelText.color })
    });
  }
}
