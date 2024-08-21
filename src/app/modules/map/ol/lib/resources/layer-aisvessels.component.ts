import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnChanges,
  OnDestroy,
  OnInit
} from '@angular/core';
import { Feature } from 'ol';
import { Style, RegularShape, Fill, Stroke, Circle } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import { Point, LineString } from 'ol/geom';
import { Coordinate } from 'ol/coordinate';
import { MapComponent } from '../map.component';
import { AISBaseLayerComponent } from './ais-base.component';
import { SKVessel } from 'src/app/modules/skresources';
import { fromLonLatArray } from '../util';

// ** Signal K AIS Vessel targets **
@Component({
  selector: 'ol-map > sk-ais-vessels',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AISVesselsLayerComponent
  extends AISBaseLayerComponent
  implements OnInit, OnDestroy, OnChanges
{
  constructor(
    protected mapComponent: MapComponent,
    protected changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
  }

  ngOnInit() {
    super.ngOnInit();
    this.labelPrefixes = ['ais-'];
  }

  // reload all Features from this.targets
  override onReloadTargets() {
    this.extractKeys(this.targets).forEach((id) => {
      this.addTargetWithId(id);
    });
  }

  // update targets
  override onUpdateTargets(ids: Array<string>) {
    ids.forEach((id: string) => {
      if (id.includes(this.targetContext)) {
        if (this.okToRenderTarget(id)) {
          if (this.targets.has(id)) {
            const f = this.source.getFeatureById('ais-' + id) as Feature;
            if (f) {
              const target = this.targets.get(id) as SKVessel;
              const label = this.buildLabel(target);
              if (target.position) {
                f.setGeometry(new Point(fromLonLat(target.position)));
              }
              const s = this.buildVesselStyle(
                target,
                label,
                this.isStale(target)
              ).clone();
              f.set('name', label, true);
              f.setStyle(
                this.setTextLabel(
                  this.setRotation(s, target.orientation),
                  label
                )
              );
              this.parseCogLine(id, target);
            } else {
              this.addTargetWithId(id);
            }
          }
        } else {
          this.onRemoveTargets([id]);
        }
      }
    });
  }

  // remove target features
  override onRemoveTargets(ids: Array<string>) {
    ids.forEach((id) => {
      if (id.includes(this.targetContext)) {
        let f = this.source.getFeatureById('ais-' + id) as Feature;
        if (f) {
          this.source.removeFeature(f);
        }
        f = this.source.getFeatureById('cog-' + id) as Feature;
        if (f) {
          this.source.removeFeature(f);
        }
      }
    });
  }

  // label zoom threshold crossed
  override onLabelZoomThreshold(entered: boolean) {
    super.updateLabels();
    this.toggleCogLines(entered);
  }

  // add new target
  addTargetWithId(id: string) {
    if (!id.includes(this.targetContext) || !this.targets.has(id)) {
      return;
    }
    const target = this.targets.get(id) as SKVessel;
    if (this.okToRenderTarget(id) && target.position) {
      const label = this.buildLabel(target);
      const f = new Feature({
        geometry: new Point(fromLonLat(target.position)),
        name: target.name
      });
      f.setId('ais-' + id);
      f.set('name', label, true);
      const s = this.buildVesselStyle(
        target,
        label,
        this.isStale(target)
      ).clone();
      f.setStyle(
        this.setTextLabel(this.setRotation(s, target.orientation), label)
      );
      this.source.addFeature(f);
      this.parseCogLine(id, target);
    }
  }

  // build target style
  buildVesselStyle(target: SKVessel, label?: string, setStale = false): Style {
    let s: Style;
    const shipClass = target.type.id
      ? Math.floor(target.type.id / 10) * 10
      : -1;

    if (typeof this.targetStyles !== 'undefined') {
      if (target.id === this.focusId && this.targetStyles.focus) {
        s = this.targetStyles.focus;
      } else if (setStale) {
        // stale
        s = this.targetStyles.inactive ?? this.targetStyles.default;
      } else if (target.type && this.targetStyles[shipClass]) {
        // ship type & state
        if (target.state && this.targetStyles[shipClass][target.state]) {
          s = this.targetStyles[shipClass][target.state];
        } else {
          s = this.targetStyles[shipClass]['default'];
        }
      } else if (target.buddy && this.targetStyles.buddy) {
        // buddy
        s = this.targetStyles.buddy;
      } else {
        // all others
        if (target.state && this.targetStyles[target.state]) {
          // state only
          s = this.targetStyles[target.state];
        } else {
          s = this.targetStyles.default;
        }
      }
    } else if (this.layerProperties && this.layerProperties.style) {
      s = this.layerProperties.style;
    } else {
      if (target.id === this.focusId) {
        s = new Style({
          image: new RegularShape({
            points: 3,
            radius: 4,
            fill: new Fill({ color: 'red' }),
            stroke: new Stroke({
              color: 'black',
              width: 1
            }),
            rotateWithView: true
          })
        });
      } else if (setStale) {
        s = new Style({
          image: new RegularShape({
            points: 3,
            radius: 4,
            fill: new Fill({ color: 'orange' }),
            stroke: new Stroke({
              color: 'black',
              width: 1
            }),
            rotateWithView: true
          })
        });
      } else {
        s = new Style({
          image: new RegularShape({
            points: 3,
            radius: 4,
            fill: new Fill({ color: 'magenta' }),
            stroke: new Stroke({
              color: 'black',
              width: 1
            }),
            rotateWithView: true
          })
        });
      }
    }
    return s;
  }

  // add update COG vector
  parseCogLine(id: string, target: SKVessel) {
    if (!this.source || !target.vectors.cog) {
      return;
    }

    let cf = this.source.getFeatureById('cog-' + id) as Feature;
    if (
      !this.okToRenderCogLines ||
      !this.okToRenderTarget(id) ||
      !target.position
    ) {
      if (cf) {
        this.source.removeFeature(cf);
      }
      return;
    }

    if (cf) {
      // update vector
      cf.setGeometry(new LineString(fromLonLatArray(target.vectors.cog)));
      cf.setStyle(this.buildCogLineStyle(id, cf));
    } else {
      // create vector
      cf = new Feature(new LineString(fromLonLatArray(target.vectors.cog)));
      cf.setId('cog-' + id);
      cf.setStyle(this.buildCogLineStyle(id, cf));
      this.source.addFeature(cf);
    }
  }

  // show / hide cog vector
  toggleCogLines(show: boolean) {
    if (show) {
      this.targets.forEach((v: SKVessel, k) => {
        this.parseCogLine(k, v);
      });
    } else {
      this.source.forEachFeature((cl: Feature<LineString>) => {
        if ((cl.getId() as string).includes('cog-')) {
          this.source.removeFeature(cl);
        }
      });
    }
  }

  // build COG vector style
  buildCogLineStyle(id: string, feature: Feature) {
    const opacity =
      this.okToRenderTarget(id) && this.okToRenderCogLines() ? 0.7 : 0;
    const geometry = feature.getGeometry() as LineString;
    const color = `rgba(0,0,0, ${opacity})`;
    const styles = [];
    styles.push(
      new Style({
        stroke: new Stroke({
          color: color,
          width: 1,
          lineDash: [5, 5]
        })
      })
    );
    geometry.forEachSegment((start: Coordinate, end: Coordinate) => {
      styles.push(
        new Style({
          geometry: new Point(end),
          image: new Circle({
            radius: 2,
            stroke: new Stroke({
              color: color,
              width: 1
            }),
            fill: new Fill({ color: 'transparent' })
          })
        })
      );
    });
    return styles;
  }

  // ok to show cog lines
  okToRenderCogLines() {
    return this.mapZoom >= this.labelMinZoom;
  }
}
