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
import { Style, Stroke, Fill, Circle, Text } from 'ol/style';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { AsyncSubject } from 'rxjs';

// ** Goto location marker component **
@Component({
  selector: 'ol-map > fb-goto-marker',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class GotoMarkerComponent
  implements OnInit, OnDestroy, OnChanges
{
  protected layer: Layer;
  public source: VectorSource;
  protected features: Array<Feature> = [];

  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject();

  @Input() position: Coordinate | null = null;  // [lon, lat]
  @Input() label = '';
  @Input() opacity: number = 1;
  @Input() visible: boolean = true;
  @Input() extent: Extent;
  @Input() zIndex: number = 500;
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
        if (key === 'position' || key === 'label') {
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
    this.features = [];
    
    if (this.position && Array.isArray(this.position) && this.position.length >= 2) {
      const f = new Feature({
        geometry: new Point(fromLonLat([this.position[0], this.position[1]]))
      });
      f.setId('goto-marker');
      f.setStyle(this.buildStyle());
      this.features.push(f);
    }
  }

  buildStyle(): Style {
    return new Style({
      image: new Circle({
        radius: 10,
        fill: new Fill({ color: 'rgba(255, 0, 0, 0.6)' }),
        stroke: new Stroke({
          color: '#FFFFFF',
          width: 3
        })
      }),
      text: this.label ? new Text({
        text: this.label,
        offsetY: -20,
        fill: new Fill({ color: '#FFFFFF' }),
        stroke: new Stroke({ color: '#000000', width: 2 }),
        font: 'bold 12px Roboto'
      }) : undefined
    });
  }
}
