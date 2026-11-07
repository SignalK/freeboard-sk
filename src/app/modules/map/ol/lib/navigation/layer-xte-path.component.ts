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
import { Style, Stroke } from 'ol/style';
import { LineString } from 'ol/geom';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { fromLonLatArray, mapifyCoords } from '../util';
import { AsyncSubject } from 'rxjs';

// ** Freeboard XTE path component **
@Component({
  selector: 'ol-map > fb-xte-path',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class XTEPathComponent implements OnInit, OnDestroy, OnChanges {
  protected layer?: Layer;
  public source?: VectorSource;
  protected features: Array<Feature> = [];

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  protected startPosition = input<Coordinate>();
  protected destPosition = input<Coordinate>();
  protected color = input<string>();

  @Input() opacity?: number;
  @Input() visible?: boolean;
  @Input() extent?: Extent;
  @Input() zIndex?: number;
  @Input() minResolution?: number;
  @Input() maxResolution?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() layerProperties?: { [index: string]: any };

  public mapifiedLine: Array<Coordinate> = [];

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
    effect(() => {
      this.startPosition();
      this.destPosition();
      this.color();
      this.parseValues();
      if (this.source) {
        this.source.clear();
        this.source.addFeatures(this.features);
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
        if (key === 'layerProperties') {
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
      this.layer = undefined;
    }
  }

  parseValues() {
    const fa: Feature[] = [];
    const startPosition = this.startPosition();
    const destPosition = this.destPosition();
    if (Array.isArray(startPosition) && Array.isArray(destPosition)) {
      this.mapifiedLine = mapifyCoords([startPosition, destPosition]);

      const f = new Feature({
        geometry: new LineString(fromLonLatArray(this.mapifiedLine))
      });
      f.setStyle(this.buildStyle());
      fa.push(f);
    }
    this.features = fa;
  }

  // build target style
  buildStyle(): Style | Style[] {
    if (this.layerProperties && this.layerProperties.style) {
      return this.layerProperties.style;
    }
    // the leg the course is steered along, so it carries the weight a
    // plotter gives its course line
    const color = this.color() || 'rgba(221, 149, 0, 1)';
    return [
      new Style({
        stroke: new Stroke({
          color: 'white',
          width: 6
        })
      }),
      new Style({
        stroke: new Stroke({
          color: color,
          width: 2
        })
      })
    ];
  }
}
