import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges
} from '@angular/core';
import { Feature } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Point } from 'ol/geom';
import { circular } from 'ol/geom/Polygon';
import { fromLonLat } from 'ol/proj';
import { Fill, Stroke, Style, Text } from 'ol/style';
import { computeDestinationPoint } from 'geolib';
import { MapComponent } from '../map.component';
import { Coordinate } from '../models';

export interface RangeRing {
  /** metres */
  distance: number;
  label: string;
}

// points per ring, so a ring stays round at any zoom
const RING_POINTS = 256;
// labels sit east of the radar, clear of the heading line and of the vessel
// range circles' labels, which sit south
const LABEL_BEARING = 90;

const LIGHT = {
  ring: 'rgba(40, 40, 40, 0.6)',
  halo: 'rgba(255, 255, 255, 0.8)'
};
const DARK = { ring: 'rgba(230, 230, 230, 0.7)', halo: 'rgba(0, 0, 0, 0.8)' };

// ** Freeboard radar range rings component **
@Component({
  selector: 'ol-map > fb-radar-rings',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class RadarRingsComponent implements OnInit, OnChanges, OnDestroy {
  @Input() rings: RangeRing[] = [];
  @Input() position: Coordinate;
  @Input() darkMode = false;
  @Input() zIndex: number;

  protected layer: VectorLayer<VectorSource>;
  protected source: VectorSource;

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    this.source = new VectorSource({ features: this.buildFeatures() });
    this.layer = new VectorLayer({ source: this.source, zIndex: this.zIndex });
    this.mapComponent.getMap()?.addLayer(this.layer);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.layer) {
      return;
    }
    if (changes['zIndex']) {
      this.layer.setZIndex(this.zIndex);
    }
    if (changes['rings'] || changes['position'] || changes['darkMode']) {
      this.source.clear();
      this.source.addFeatures(this.buildFeatures());
    }
  }

  ngOnDestroy() {
    this.mapComponent.getMap()?.removeLayer(this.layer);
    this.layer = null;
  }

  private buildFeatures(): Feature[] {
    if (!Array.isArray(this.position) || !Array.isArray(this.rings)) {
      return [];
    }
    const theme = this.darkMode ? DARK : LIGHT;
    const ringStyle = new Style({
      stroke: new Stroke({ color: theme.ring, width: 1 })
    });
    const centre = { longitude: this.position[0], latitude: this.position[1] };
    return this.rings.flatMap((r) => {
      const ring = new Feature({
        geometry: circular(
          [centre.longitude, centre.latitude],
          r.distance,
          RING_POINTS
        ).transform('EPSG:4326', 'EPSG:3857')
      });
      ring.setStyle(ringStyle);
      const at = computeDestinationPoint(centre, r.distance, LABEL_BEARING);
      const label = new Feature({
        geometry: new Point(fromLonLat([at.longitude, at.latitude]))
      });
      label.setStyle(
        new Style({
          text: new Text({
            text: r.label,
            fill: new Fill({ color: theme.ring }),
            stroke: new Stroke({ color: theme.halo, width: 3 })
          })
        })
      );
      return [ring, label];
    });
  }
}
