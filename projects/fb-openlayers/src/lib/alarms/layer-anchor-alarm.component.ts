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
} from '@angular/core';
import { Layer } from 'ol/layer';
import { Feature } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Stroke, Fill } from 'ol/style';
import { Circle, LineString, Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { fromLonLatArray, mapifyCoords, mapifyRadius } from '../util';
import { AsyncSubject } from 'rxjs';

// ** Freeboard Anchor Alarm component **
@Component({
  selector: 'ol-map > fb-anchor-alarm',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnchorAlarmComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer;
  public source: VectorSource;
  protected features: Array<Feature>;

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  @Input() radius: number;
  @Input() anchorPosition: Coordinate;
  @Input() lineCoords: Array<Coordinate>;
  @Input() anchorStyles: { [key: string]: any };
  @Input() opacity: number;
  @Input() visible: boolean;
  @Input() extent: Extent;
  @Input() zIndex: number;
  @Input() minResolution: number;
  @Input() maxResolution: number;
  @Input() layerProperties: { [index: string]: any };

  public mapifiedRadius: number = 0;
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
      const properties: { [index: string]: any } = {};

      for (const key in changes) {
        if (key == 'radius' || key == 'anchorPosition' || key == 'lineCoords') {
          this.parseValues();
          if (this.source) {
            this.source.clear();
            this.source.addFeatures(this.features);
          }
        } else if (key == 'layerProperties') {
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
    this.mapifiedRadius = mapifyRadius(this.radius, this.anchorPosition);
    this.mapifiedLine = mapifyCoords(this.lineCoords);
    let fa: Feature[] = [];
    let f = new Feature({
      geometry: new LineString(fromLonLatArray(this.mapifiedLine)),
    });
    f.setStyle(this.buildStyle('line'));
    fa.push(f);
    f = new Feature({
      geometry: new Circle(
        fromLonLat(this.anchorPosition),
        this.mapifiedRadius
      ),
    });
    f.setStyle(this.buildStyle('circle'));
    fa.push(f);
    f = new Feature({
      geometry: new Point(fromLonLat(this.anchorPosition)),
    });
    f.setStyle(this.buildStyle('anchor'));
    fa.push(f);
    this.features = fa;
  }

  // build target style
  buildStyle(key: string): Style {
    if (this.anchorStyles && this.anchorStyles[key]) {
      return this.anchorStyles[key];
    } else {
      if (this.layerProperties && this.layerProperties.style) {
        return this.layerProperties.style;
      } else {
        // default style
        return new Style({
          stroke: new Stroke({
            width: 2,
            color: 'black',
            lineDash: [5, 5],
          }),
          fill: new Fill({
            color: 'rgba(0, 255, 0, .3)',
          }),
        });
      }
    }
  }
}
