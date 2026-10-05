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
import { Style, Stroke, Fill, Circle } from 'ol/style';
import { LineString, MultiPoint, Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { fromLonLatArray, mapifyCoords } from '../util';
import { AsyncSubject } from 'rxjs';
import { Position } from 'src/app/types';

/** A vessel in a collision alarm and, when the alarm reports them, where it
 * and own vessel will be at closest approach. */
export interface CpaTarget {
  self: Position;
  target?: Position;
  selfAtCpa?: Position;
  targetAtCpa?: Position;
}

/** What to draw for one alarm. */
export interface CpaShapes {
  /** where the danger target is now, marked with a flashing ring */
  ring?: Position;
  /** own and target course lines, extended to the closest approach */
  courseLines: Position[][];
  /** joins the two positions at closest approach */
  cpaLine?: Position[];
  /** joins the two vessels when the alarm gives no closest approach */
  rangeLine?: Position[];
}

// flash period of the danger ring
const FLASH_MS = 500;

export function cpaShapes(t: CpaTarget): CpaShapes {
  const shapes: CpaShapes = { ring: t.target, courseLines: [] };
  if (t.selfAtCpa && t.targetAtCpa) {
    shapes.courseLines.push([t.self, t.selfAtCpa]);
    if (t.target) {
      shapes.courseLines.push([t.target, t.targetAtCpa]);
    }
    shapes.cpaLine = [t.selfAtCpa, t.targetAtCpa];
  } else if (t.target) {
    shapes.rangeLine = [t.target, t.self];
  }
  return shapes;
}

// ** Freeboard CPA Alarm component **
@Component({
  selector: 'ol-map > fb-cpa-alarms',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class CPAAlarmComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer;
  public source: VectorSource;
  protected features: Array<Feature>;
  protected rings: Array<Feature> = [];
  private flashOn = true;
  private flashTimer: ReturnType<typeof setInterval>;

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  @Input() cpaTargets: Array<CpaTarget>;
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
    this.flashTimer = setInterval(() => this.flash(), FLASH_MS);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.layer) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const properties: { [index: string]: any } = {};

      for (const key in changes) {
        if (key === 'cpaTargets') {
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
    clearInterval(this.flashTimer);
    const map = this.mapComponent.getMap();
    if (this.layer && map) {
      map.removeLayer(this.layer);
      map.render();
      this.layer = null;
    }
  }

  parseValues() {
    if (!Array.isArray(this.cpaTargets)) {
      return;
    }
    const fa: Feature[] = [];
    const rings: Feature[] = [];
    const line = (coords: Position[], style: Style | Style[]) => {
      const f = new Feature({
        geometry: new LineString(fromLonLatArray(mapifyCoords(coords)))
      });
      f.setStyle(style);
      fa.push(f);
    };
    this.cpaTargets.forEach((t) => {
      const shapes = cpaShapes(t);
      shapes.courseLines.forEach((c) => line(c, this.courseStyle()));
      if (shapes.cpaLine) {
        line(shapes.cpaLine, this.cpaStyle());
      }
      if (shapes.rangeLine) {
        line(shapes.rangeLine, this.buildStyle());
      }
      if (shapes.ring) {
        const ring = new Feature({
          geometry: new Point(fromLonLat(shapes.ring as Coordinate))
        });
        ring.setStyle(this.flashOn ? this.ringStyle() : HIDDEN);
        rings.push(ring);
        fa.push(ring);
      }
    });
    this.features = fa;
    this.rings = rings;
  }

  private flash() {
    this.flashOn = !this.flashOn;
    const style = this.flashOn ? this.ringStyle() : HIDDEN;
    this.rings.forEach((r) => r.setStyle(style));
  }

  // build range line style
  buildStyle(): Style {
    let cs: Style;
    if (this.layerProperties && this.layerProperties.style) {
      cs = this.layerProperties.style;
    } else {
      // default style
      cs = new Style({
        stroke: new Stroke({
          width: 2,
          color: 'red',
          lineDash: [2, 3]
        })
      });
    }
    return cs;
  }

  private ringStyle(): Style {
    return new Style({
      image: new Circle({
        radius: 14,
        stroke: new Stroke({ width: 3, color: 'red' }),
        fill: new Fill({ color: 'rgba(255,0,0,.3)' })
      })
    });
  }

  private courseStyle(): Style {
    return new Style({
      stroke: new Stroke({ width: 2, color: 'red', lineDash: [8, 6] })
    });
  }

  // the line between the two vessels at closest approach, with its ends marked
  private cpaStyle(): Style[] {
    const end = new Circle({
      radius: 4,
      stroke: new Stroke({ width: 2, color: 'red' }),
      fill: new Fill({ color: 'white' })
    });
    return [
      new Style({ stroke: new Stroke({ width: 2, color: 'red' }) }),
      new Style({
        image: end,
        geometry: (f) =>
          new MultiPoint((f.getGeometry() as LineString).getCoordinates())
      })
    ];
  }
}

const HIDDEN = new Style({});
