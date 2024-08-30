import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component
} from '@angular/core';
import { Feature } from 'ol';
import { Style, RegularShape, Fill, Stroke } from 'ol/style';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { AISBaseLayerComponent } from './ais-base.component';

// ** Signal K non-vessel targets **
@Component({
  selector: 'ol-map > sk-ais-targets',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AISTargetsLayerComponent extends AISBaseLayerComponent {
  constructor(
    protected mapComponent: MapComponent,
    protected changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
  }

  ngOnInit() {
    super.ngOnInit();
    this.labelPrefixes = [this.targetContext];
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
        const f = this.source.getFeatureById(id) as Feature;
        if (this.okToRenderTarget(id)) {
          if (this.targets.has(id)) {
            if (f) {
              const target = this.targets.get(id);
              const label = this.buildLabel(target);
              if (target.position) {
                f.setGeometry(new Point(fromLonLat(target.position)));
              }
              const s = this.buildStyle(label, this.isStale(target)).clone();
              f.set('name', label, true);
              f.setStyle(
                this.setTextLabel(
                  this.setRotation(s, target.orientation),
                  label
                )
              );
            } else {
              this.addTargetWithId(id);
            }
          }
        } else {
          this.source.removeFeature(f);
        }
      }
    });
  }

  // remove target features
  override onRemoveTargets(ids: Array<string>) {
    ids.forEach((id) => {
      if (id.includes(this.targetContext)) {
        const f = this.source.getFeatureById(id) as Feature;
        if (f) {
          this.source.removeFeature(f);
        }
      }
    });
  }

  // add new target
  addTargetWithId(id: string) {
    if (!id.includes(this.targetContext) || !this.targets.has(id)) {
      return;
    }
    const target = this.targets.get(id);
    const label = this.buildLabel(target);
    if (target.position) {
      const f = new Feature({
        geometry: new Point(fromLonLat(target.position)),
        name: target.name
      });
      f.setId(id);
      f.set('name', label, true);
      const s = this.buildStyle(label, this.isStale(target)).clone();
      f.setStyle(
        this.setTextLabel(this.setRotation(s, target.orientation), label)
      );
      this.source.addFeature(f);
    }
  }

  // build target style
  buildStyle(label?: string, setStale = false): Style {
    let s: Style;
    if (typeof this.targetStyles !== 'undefined') {
      if (setStale) {
        // stale
        s = this.targetStyles.inactive ?? this.targetStyles.default;
      } else {
        s = this.targetStyles.default;
      }
    } else if (this.layerProperties && this.layerProperties.style) {
      s = this.layerProperties.style;
    } else {
      s = new Style({
        image: new RegularShape({
          points: 3,
          radius: 7,
          fill: new Fill({ color: 'magenta' }),
          stroke: new Stroke({
            color: 'black',
            width: 1
          }),
          rotateWithView: true
        })
      });
    }
    return s;
  }
}
