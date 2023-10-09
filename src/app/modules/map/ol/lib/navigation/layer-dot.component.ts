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
import { getRhumbLineBearing, getCenter } from 'geolib';
import { SKPosition } from 'src/app/types';

// ** Freeboard direction of travel component **
@Component({
  selector: 'ol-map > fb-route-direction',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DirectionOfTravelComponent
  implements OnInit, OnDestroy, OnChanges
{
  protected layer: Layer;
  public source: VectorSource;
  protected features: Array<Feature> = [];

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  @Input() points: Array<Coordinate> = [];
  @Input() reverse = false;
  @Input() pointIndex = 0;
  @Input() mapZoom = 10;
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
        if (key === 'points' || key === 'reverse' || key === 'pointIndex') {
          this.parseValues();
          if (this.source) {
            this.source.clear();
            this.source.addFeatures(this.features);
          }
        } else if (key === 'mapZoom') {
          this.handleLabelZoomChange(key);
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
    const arrows: number[] = [];
    if (this.points && this.points.length !== 0) {
      if (this.points.length < 4) {
        arrows.push(0);
      } else {
        for (let idx = 1; idx < this.points.length - 2; idx = idx + 2) {
          arrows.push(idx);
        }
      }

      arrows.forEach((idx: number) => {
        const pctr: SKPosition = getCenter(
          this.points.slice(idx, idx + 2)
        ) as SKPosition;
        const f = new Feature({
          geometry: new Point(fromLonLat([pctr.longitude, pctr.latitude]))
        });
        f.setId(`dot.${idx}`);
        f.setStyle(this.buildStyle(idx));
        fa.push(f);
      });
    }

    this.features = fa;
  }

  // build target style
  buildStyle(index: number): Style {
    return new Style({
      image: new RegularShape({
        points: 3,
        radius: 7,
        fill: new Fill({ color: 'blue' }),
        stroke: new Stroke({
          color: 'white',
          width: 1
        }),
        rotateWithView: true,
        rotation: this.getOrientation(index)
      })
    });
  }

  // return a Style with rotation set
  setRotation(s: Style, index: number): Style {
    if (!s) {
      return s;
    }
    const cs = s.clone();
    const im = cs.getImage();
    if (im) {
      const o = this.getOrientation(index);
      im.setRotation(o ?? 0);
      cs.setImage(im);
    }
    return cs;
  }

  getOrientation(idx: number) {
    const o = this.reverse
      ? getRhumbLineBearing(this.points[idx + 1], this.points[idx])
      : getRhumbLineBearing(this.points[idx], this.points[idx + 1]);
    return (Math.PI / 180) * o;
  }

  // ** assess attribute change **
  handleLabelZoomChange(key: string) {
    if (key === 'labelMinZoom') {
      if (typeof this.mapZoom !== 'undefined') {
        //this.updateLabel();
      }
    } else if (key === 'mapZoom') {
      /*if (typeof this.labelMinZoom !== 'undefined') {
        if (
          (change.currentValue >= this.labelMinZoom &&
            change.previousValue < this.labelMinZoom) ||
          (change.currentValue < this.labelMinZoom &&
            change.previousValue >= this.labelMinZoom)
        ) {
          this.updateLabel();
        }
      }*/
    }
  }
}
