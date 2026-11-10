import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component
} from '@angular/core';
import { Feature } from 'ol';
import { Style, RegularShape, Fill, Stroke, Text } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import { Point } from 'ol/geom';
import { MapComponent } from '../map.component';
import { AISBaseLayerComponent } from './ais-base.component';
import { SKVessel } from 'src/app/modules/skresources';
import { MapImageRegistry } from '../map-image-registry.service';

// ** Signal K AIS Vessel targets **
@Component({
  selector: 'ol-map > sk-ais-vessels',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class AISVesselsLayerComponent extends AISBaseLayerComponent {
  constructor(
    protected override mapComponent: MapComponent,
    protected override changeDetectorRef: ChangeDetectorRef,
    protected mapImages: MapImageRegistry
  ) {
    super(mapComponent, changeDetectorRef);
  }

  override ngOnInit() {
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
    const source = this.source;
    if (!source) return;
    ids.forEach((id: string) => {
      if (id.includes(this.targetContext)) {
        if (this.okToRenderTarget(id)) {
          if (this.targets.has(id)) {
            const f = source.getFeatureById('ais-' + id) as Feature;
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
    const source = this.source;
    if (!source) {
      return;
    }
    ids.forEach((id) => {
      if (id.includes(this.targetContext)) {
        const f = source.getFeatureById('ais-' + id) as Feature;
        if (f) {
          source.removeFeature(f);
        }
        this.removeCogLine(id);
      }
    });
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
      this.source?.addFeature(f);
      this.parseCogLine(id, target);
    }
  }

  // build target style
  buildVesselStyle(target: SKVessel, label?: string, setStale = false): Style {
    let s: Style | undefined;
    const isMoored = target.state === 'moored';

    const shipClass = target.type?.id
      ? Math.abs(Math.floor(target.type.id / 10) * 10)
      : -1;

    const icon =
      target.id === this.focusId
        ? this.mapImages.getVessel('focused')
        : setStale
          ? this.mapImages.getVessel('inactive', isMoored)
          : target.buddy
            ? this.mapImages.getVessel('buddy', isMoored)
            : shipClass === -1
              ? this.mapImages.getVessel('default', isMoored)
              : this.mapImages.getVessel(shipClass, isMoored);

    const iconStyle = () =>
      new Style({
        image: icon,
        text: new Text({
          text: '',
          offsetX: 0,
          offsetY: isMoored ? 12 : 22
        })
      });
    if (icon && typeof this.targetStyles === 'undefined') {
      return iconStyle();
    }

    if (typeof this.targetStyles !== 'undefined') {
      if (target.id === this.focusId && this.targetStyles.focus) {
        s = this.targetStyles.focus;
      } else if (setStale) {
        // stale
        s = this.targetStyles.inactive ?? this.targetStyles.default;
      } else if (target.type && this.targetStyles[shipClass]) {
        // ship type & state: a ship type's entry is either one style or a
        // style per state
        const typeEntry = this.targetStyles[shipClass];
        if (typeEntry instanceof Style) {
          s = typeEntry;
        } else if (typeEntry) {
          if (target.state && typeEntry[target.state]) {
            s = typeEntry[target.state];
          } else {
            s = typeEntry['default'];
          }
        }
      } else if (target.buddy && this.targetStyles.buddy) {
        // buddy
        s = this.targetStyles.buddy;
      } else {
        // all others
        const stateStyle = target.state
          ? this.targetStyles[target.state]
          : undefined;
        if (stateStyle instanceof Style) {
          // state only
          s = stateStyle;
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
    // targetStyles without a style for this vessel
    return s ?? iconStyle();
  }
}
