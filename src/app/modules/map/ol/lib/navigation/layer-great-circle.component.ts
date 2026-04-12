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
  input,
  effect
} from '@angular/core';
import { Layer } from 'ol/layer';
import { Feature } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Stroke } from 'ol/style';
import { MultiLineString } from 'ol/geom';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { fromLonLatArray, splitAtAntimeridian, lineDashFor } from '../util';
import { AsyncSubject } from 'rxjs';
import { ILineStyle } from 'src/app/types';

/**
 * Great-circle arc line component.
 *
 * Receives an array of [lon, lat] coordinates that are already densified
 * (many intermediate great-circle points). Renders them as a multi-vertex
 * LineString that visually curves on a Mercator map.
 */
@Component({
  selector: 'ol-map > fb-great-circle',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class GreatCircleComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer;
  public source: VectorSource;
  protected features: Array<Feature> = [];

  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject();

  protected coords = input<Coordinate[]>();
  protected lineStyle = input<ILineStyle>();

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
      this.coords();
      this.lineStyle();
      this.parseInput();
      if (this.source) {
        this.source.clear();
        this.source.addFeatures(this.features);
      }
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
      this.layer = null;
    }
  }

  parseInput() {
    const fa: Feature[] = [];
    const c = this.coords();
    if (Array.isArray(c) && c.length >= 2) {
      const projected = splitAtAntimeridian(c.map(p => [p[0], p[1]] as Coordinate))
        .map(seg => fromLonLatArray(seg));
      const feat = new Feature({
        geometry: new MultiLineString(projected)
      });
      feat.setId('greatCircleSelf');
      const ls = this.lineStyle();
      const color = ls?.color ?? 'rgba(0,128,255,0.7)';
      const lineWidth = ls?.width ?? 1;
      const lineDash = ls ? lineDashFor(ls.dash) : [8, 4];
      feat.setStyle(
        new Style({
          stroke: new Stroke({ color, width: lineWidth, lineDash })
        })
      );
      fa.push(feat);
    }
    this.features = fa;
  }
}
