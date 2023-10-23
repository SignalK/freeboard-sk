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
import { Style, Stroke, Fill, RegularShape } from 'ol/style';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { AsyncSubject } from 'rxjs';

// ** Freeboard Notification Alarm component **
@Component({
  selector: 'ol-map > fb-alarm',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlarmComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer;
  public source: VectorSource;
  protected features: Array<Feature>;

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  @Input() position: Coordinate;
  @Input() alarmType: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() alarmStyles: { [key: string]: any };
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
        if (key === 'position' || key === 'alarmType') {
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
    const fa: Feature[] = [];
    if (!this.position) return;
    const fp = new Feature({
      geometry: new Point(fromLonLat(this.position))
    });
    fp.setStyle(this.buildStyle(this.alarmType));
    fp.setId(`alarm.${this.alarmType}`);
    fa.push(fp);
    this.features = fa;
  }

  // build target style
  buildStyle(key: string): Style {
    if (this.alarmStyles && this.alarmStyles[key]) {
      return this.alarmStyles[key];
    } else {
      if (this.layerProperties && this.layerProperties.style) {
        return this.layerProperties.style;
      } else {
        // default style
        return new Style({
          image: new RegularShape({
            points: 3,
            radius: 7,
            fill: new Fill({ color: 'red' }),
            stroke: new Stroke({
              color: 'white',
              width: 2
            }),
            rotateWithView: false
          })
        });
      }
    }
  }
}
