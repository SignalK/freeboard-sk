import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  SimpleChanges
} from '@angular/core';
import { Feature } from 'ol';
import { Style, Stroke } from 'ol/style';
import { LineString } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { AISBaseLayerComponent } from './ais-base.component';
import { GeoUtils } from 'src/app/lib/geoutils';
import { SKVessel } from 'src/app/modules/skresources';

// ** Signal K AIS Vessel Wind vector  **
@Component({
  selector: 'ol-map > sk-ais-wind',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AISWindLayerComponent extends AISBaseLayerComponent {
  @Input() vectorApparent = false;

  protected zoomOffsetLevel = [
    1, 1000000, 550000, 290000, 140000, 70000, 38000, 17000, 7600, 3900, 1900,
    950, 470, 250, 120, 60, 30, 15.5, 8.1, 4, 2, 1, 0.5, 0.25, 0.12, 0.06, 0.03,
    0.015, 0.008, 1
  ];

  constructor(
    protected mapComponent: MapComponent,
    protected changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
  }

  ngOnChanges(changes: SimpleChanges): void {
    super.ngOnChanges(changes);
    if ('vectorApparent' in changes) {
      this.onUpdateTargets(this.extractKeys(this.targets));
    }
  }

  calcVector(target: SKVessel) {
    const windDirection = this.vectorApparent
      ? typeof target.wind.awa !== 'undefined'
        ? target.orientation + target.wind.awa
        : null
      : target.wind.direction;

    if (typeof windDirection !== 'number') {
      return [];
    }

    const windc = GeoUtils.destCoordinate(
      target.position,
      windDirection,
      this.zoomOffsetLevel[Math.floor(this.mapZoom)]
    );
    return [fromLonLat(target.position), fromLonLat(windc)];
  }

  // add new wind vector feature
  addWindVectorWithId(id: string) {
    if (!id.includes(this.targetContext) || !this.targets.has(id)) {
      return;
    }
    const target = this.targets.get(id) as SKVessel;
    if (this.okToRenderTarget(id) && target.position) {
      const v = this.calcVector(target);
      if (v.length !== 2) {
        return;
      }
      const f = new Feature(new LineString(v));
      f.setId('wind-' + id);
      f.setStyle(this.buildVectorStyle());
      this.source?.addFeature(f);
    }
  }

  // build wind vector style
  buildVectorStyle(): Style {
    const color = this.vectorApparent ? '16, 75, 16' : '128, 128, 0';
    return new Style({
      stroke: new Stroke({
        width: 2,
        color: `rgba(${color},1)`
      })
    });
  }

  // reload all Features from this.targets
  override onReloadTargets() {
    this.extractKeys(this.targets).forEach((id) => {
      this.addWindVectorWithId(id);
    });
  }

  // update wind vector feature when target updated
  override onUpdateTargets(ids: Array<string>) {
    ids.forEach((id: string) => {
      if (id.includes(this.targetContext)) {
        const f = this.source?.getFeatureById('wind-' + id) as Feature;
        if (this.okToRenderTarget(id)) {
          if (this.targets.has(id)) {
            if (f) {
              const target = this.targets.get(id) as SKVessel;
              const position = this.targets.get(id).position;
              const v = this.calcVector(target);
              if (position && v.length === 2) {
                f.setGeometry(new LineString(v));
              }
              f.setStyle(this.buildVectorStyle());
            } else {
              this.addWindVectorWithId(id);
            }
          }
        } else {
          this.source.removeFeature(f);
        }
      }
    });
  }

  // remove flag when target removed
  override onRemoveTargets(ids: Array<string>) {
    ids.forEach((id) => {
      const f = this.source.getFeatureById('wind-' + id) as Feature;
      if (f) {
        this.source.removeFeature(f);
      }
    });
  }
}
