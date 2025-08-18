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
  effect
} from '@angular/core';
import { Layer } from 'ol/layer';
import { Feature } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Stroke, Fill, Circle, Text } from 'ol/style';
import { StyleLike } from 'ol/style/Style';
import { LineString, Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { fromLonLatArray, mapifyCoords } from '../util';
import { AsyncSubject } from 'rxjs';

// ** Freeboard Bearing line component **
@Component({
  selector: 'ol-map > fb-bearing-line',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class BearingLineComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer;
  public source: VectorSource;
  protected features: Array<Feature> = [];

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  protected vesselPosition = input<Coordinate>();
  protected markerPosition = input<Coordinate>();
  protected showMarker = input<boolean>();
  protected labelMinZoom = input<number>(10);
  protected markerName = input<string>('');

  @Input() mapZoom = 10;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() bearingStyles: { [key: string]: any };
  @Input() opacity: number;
  @Input() visible: boolean;
  @Input() extent: Extent;
  @Input() zIndex: number;
  @Input() minResolution: number;
  @Input() maxResolution: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() layerProperties: { [index: string]: any };

  public mapifiedRadius = 0;
  public mapifiedLine: Array<Coordinate> = [];

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
    effect(() => {
      this.markerPosition();
      this.vesselPosition();
      this.showMarker();
      this.parseValues();
      if (this.source) {
        this.source.clear();
        this.source.addFeatures(this.features);
      }
    });
    effect(() => {
      this.labelMinZoom();
      this.markerName();
      if (typeof this.mapZoom !== 'undefined') {
        this.updateLabel();
      }
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

  parseValues() {
    const fa: Feature[] = [];
    if (
      Array.isArray(this.vesselPosition()) &&
      Array.isArray(this.markerPosition())
    ) {
      this.mapifiedLine = mapifyCoords([
        this.vesselPosition(),
        this.markerPosition()
      ]);
      const fl = new Feature({
        geometry: new LineString(fromLonLatArray(this.mapifiedLine))
      });
      fl.setStyle(this.buildStyle('line'));
      fa.push(fl);
      let fp = new Feature({
        geometry: new Point(fromLonLat(this.markerPosition()))
      });
      fp.setId('d.base');
      fp.setStyle(this.buildStyle('line'));
      this.updateLabel(fp);
      fa.push(fp);
      if (this.showMarker) {
        fp = new Feature({
          geometry: new Point(fromLonLat(this.markerPosition()))
        });
        fp.setId('dest.point');
        fp.setStyle(this.buildStyle('marker'));
        fa.push(fp);
      }
    }
    this.features = fa;
  }

  // build target style
  buildStyle(key: string): Style | Style[] {
    if (this.bearingStyles && this.bearingStyles[key]) {
      return this.bearingStyles[key];
    } else {
      if (this.layerProperties && this.layerProperties.style) {
        return this.layerProperties.style;
      } else {
        // default style
        return [
          new Style({
            stroke: new Stroke({
              color: 'white',
              width: 6
            })
          }),
          new Style({
            image: new Circle({
              radius: 5,
              stroke: new Stroke({
                width: 2,
                color: 'white'
              }),
              fill: new Fill({
                color: 'rgba(221, 149, 0, 1)'
              })
            }),
            stroke: new Stroke({
              color: 'rgba(221, 149, 0, 1)',
              width: 2
            }),
            text: new Text({
              text: '',
              offsetX: 0,
              offsetY: -29
            })
          })
        ];
      }
    }
  }

  // ** assess attribute change **
  handleLabelZoomChange(key: string, change: SimpleChange) {
    if (key === 'mapZoom') {
      if (typeof this.labelMinZoom !== 'undefined') {
        if (
          (change.currentValue >= this.labelMinZoom &&
            change.previousValue < this.labelMinZoom) ||
          (change.currentValue < this.labelMinZoom &&
            change.previousValue >= this.labelMinZoom)
        ) {
          this.updateLabel();
        }
      }
    }
  }

  // update feature labels
  updateLabel(f?: Feature) {
    if (!f && this.source) {
      f = this.source.getFeatureById('d.base') as Feature;
    }
    let s: StyleLike = f.getStyle();
    if (!s) {
      return;
    }
    s = Array.isArray(s) ? s[1] : s;

    const ts = (s as Style).getText();
    if (!ts) {
      return;
    }
    ts.setText(
      Math.abs(this.mapZoom) >= this.labelMinZoom()
        ? this.markerName() ?? ''
        : ''
    );
    (s as Style).setText(ts);
    f.setStyle(s);
  }
}
