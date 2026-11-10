import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  effect,
  input
} from '@angular/core';
import { Feature } from 'ol';
import { FeatureLike } from 'ol/Feature';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { LineString, Point } from 'ol/geom';
import { Fill, RegularShape, Stroke, Style, Text } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { Coordinate } from '../models';
import {
  CURRENT_MIN_DRIFT,
  CurrentVector,
  currentArrowLength
} from 'src/app/lib/current-vector';

const ARROW_COLOR = 'rgba(0, 120, 215, 0.9)';
const HALO_COLOR = 'rgba(255, 255, 255, 0.8)';

// ** Freeboard current (set / drift) arrow at the own vessel **
@Component({
  selector: 'ol-map > fb-current-vector',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class CurrentVectorComponent implements OnInit, OnDestroy {
  protected layer?: VectorLayer;
  protected source = new VectorSource();

  protected current = input<CurrentVector | null>(null);
  protected position = input<Coordinate | null>(null);
  protected label = input<string>('');

  @Input() zIndex?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() layerProperties?: { [index: string]: any };

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
    effect(() => {
      const current = this.current();
      const position = this.position();
      this.label();
      this.source.clear();
      if (
        Array.isArray(position) &&
        current &&
        current.drift >= CURRENT_MIN_DRIFT
      ) {
        const feature = new Feature({
          geometry: new Point(fromLonLat(position))
        });
        feature.setId('current');
        this.source.addFeature(feature);
      }
    });
  }

  ngOnInit() {
    this.layer = new VectorLayer({
      ...this.layerProperties,
      source: this.source,
      zIndex: this.zIndex,
      style: (feature, resolution) => this.arrowStyles(feature, resolution)
    });
    const map = this.mapComponent.getMap();
    if (map) {
      map.addLayer(this.layer);
      map.render();
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

  // The arrow keeps its on-screen length at every zoom, so its end is placed
  // from the view resolution rather than as a distance on the chart.
  private arrowStyles(feature: FeatureLike, resolution: number): Style[] {
    const current = this.current();
    const geometry = feature.getGeometry();
    if (!current || !(geometry instanceof Point)) {
      return [];
    }
    const [x, y] = geometry.getCoordinates();
    const length = currentArrowLength(current.drift) * resolution;
    const end = [
      x + length * Math.sin(current.set),
      y + length * Math.cos(current.set)
    ];
    const shaft = new LineString([[x, y], end]);
    const head = new Point(end);
    const headShape = (fill: string, radius: number) =>
      new RegularShape({
        points: 3,
        radius,
        fill: new Fill({ color: fill }),
        rotation: current.set,
        rotateWithView: true
      });
    return [
      new Style({
        geometry: shaft,
        stroke: new Stroke({ color: HALO_COLOR, width: 6 })
      }),
      new Style({ geometry: head, image: headShape(HALO_COLOR, 10) }),
      new Style({
        geometry: shaft,
        stroke: new Stroke({ color: ARROW_COLOR, width: 3 })
      }),
      new Style({
        geometry: head,
        image: headShape(ARROW_COLOR, 7),
        text: new Text({
          text: this.label(),
          offsetY: -18,
          font: 'bold 12px sans-serif',
          fill: new Fill({ color: ARROW_COLOR }),
          stroke: new Stroke({ color: HALO_COLOR, width: 3 })
        })
      })
    ];
  }
}
