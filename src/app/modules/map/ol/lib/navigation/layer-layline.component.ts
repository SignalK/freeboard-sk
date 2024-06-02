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
import { Style } from 'ol/style';
import { LineString } from 'ol/geom';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { fromLonLatArray, mapifyCoords } from '../util';
import { AsyncSubject } from 'rxjs';
import { Convert } from 'src/app/lib/convert';

// ** Freeboard Layline component **
@Component({
  selector: 'ol-map > fb-layline',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LaylineComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer;
  public source: VectorSource;
  protected features: Array<Feature> = [];

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  @Input() lines: { port: Array<Coordinate[]>; starboard: Array<Coordinate[]> };
  @Input() mapZoom = 10;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() laylineStyles: { [key: string]: any };
  @Input() heading: number;
  @Input() awa: number;
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
        if (
          key === 'lines' ||
          key === 'heading' ||
          key === 'bearing' ||
          key === 'awa'
        ) {
          this.parseValues();
          if (this.source) {
            this.source.clear();
            this.source.addFeatures(this.features);
          }
        } else if (key === 'mapZoom') {
          //this.handleLabelZoomChange(key, changes[key]);
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
    let idx = 0;
    // is upwind
    if (
      typeof this.heading !== 'number' ||
      Math.abs(Convert.radiansToDegrees(this.awa)) >= 90
    ) {
      this.features = [];
      return;
    }

    if (this.lines) {
      if (this.lines.port && Array.isArray(this.lines.port)) {
        this.lines.port.forEach((l: Coordinate[]) => {
          const mapifiedLine = mapifyCoords(l);
          const f = new Feature({
            geometry: new LineString(fromLonLatArray(mapifiedLine))
          });
          f.setStyle(this.buildStyle(idx === 0 ? 'port' : 'starboard'));
          fa.push(f);
          idx++;
        });
      }
      idx = 0;
      if (this.lines.starboard && Array.isArray(this.lines.starboard)) {
        this.lines.starboard.forEach((l: Coordinate[]) => {
          const mapifiedLine = mapifyCoords(l);
          const f = new Feature({
            geometry: new LineString(fromLonLatArray(mapifiedLine))
          });
          f.setStyle(this.buildStyle(idx === 0 ? 'port' : 'starboard'));
          fa.push(f);
          idx++;
        });
      }
    }
    this.features = fa;
  }

  // build target style
  buildStyle(key: string): Style {
    if (this.laylineStyles && this.laylineStyles[key]) {
      return this.laylineStyles[key];
    } else {
      if (this.layerProperties && this.layerProperties.style) {
        return this.layerProperties.style;
      } else {
        return undefined;
      }
    }
  }
}
