import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  SimpleChanges
} from '@angular/core';
import { Feature } from 'ol';
import { Style, Icon, Text } from 'ol/style';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { AISBaseLayerComponent } from './ais-base.component';

// ** Signal K AIS Vessel Flags  **
@Component({
  selector: 'ol-map > sk-ais-flags',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class AISFlagsLayerComponent extends AISBaseLayerComponent {
  @Input() flagged?: Array<string>;

  constructor(
    protected override mapComponent: MapComponent,
    protected override changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
  }

  override ngOnChanges(changes: SimpleChanges): void {
    super.ngOnChanges(changes);
    if ('flagged' in changes) {
      this.updateFlags();
    }
  }

  updateFlags() {
    if (!this.flagged) {
      return;
    }
    if (this.source) {
      this.source.clear();
    }
    this.flagged.forEach((id) => {
      this.addFlagWithId(id);
    });
  }

  // add new flag feature
  addFlagWithId(id: string) {
    const target = this.targets.get(id);
    if (!id.includes(this.targetContext) || !target) {
      return;
    }
    if (this.okToRenderTarget(id) && target.position) {
      const label = target.callsignVhf ?? target.callsignHf ?? '......';
      const f = new Feature({
        geometry: new Point(fromLonLat(target.position)),
        name: target.name
      });
      f.setId('flag-' + id);
      f.set('name', label, true);
      f.setStyle(this.buildStyle(label).clone());
      this.source?.addFeature(f);
    }
  }

  private buildStyle(label?: string) {
    return new Style({
      image: new Icon({
        src: './assets/img/vessels/ais_flag.svg',
        rotateWithView: false,
        scale: 0.2,
        anchor: [27, 187],
        anchorXUnits: 'pixels',
        anchorYUnits: 'pixels'
      }),
      text: new Text({
        text: label ?? '',
        offsetY: -25,
        offsetX: 20
      })
    });
  }

  // reload all Features from this.targets
  override onReloadTargets() {
    this.flagged?.forEach((id) => {
      this.addFlagWithId(id);
    });
  }

  // update flag when target updated
  override onUpdateTargets(ids: Array<string>) {
    const source = this.source;
    if (!source) {
      return;
    }
    ids.forEach((id: string) => {
      if (id.includes(this.targetContext) && this.flagged?.includes(id)) {
        const f = source.getFeatureById('flag-' + id) as Feature;
        if (this.okToRenderTarget(id)) {
          if (this.targets.has(id)) {
            if (f) {
              const position = this.targets.get(id)?.position;
              if (position) {
                f.setGeometry(new Point(fromLonLat(position)));
              }
            } else {
              this.addFlagWithId(id);
            }
          }
        } else {
          source.removeFeature(f);
        }
      }
    });
  }

  // remove flag when target removed
  override onRemoveTargets(ids: Array<string>) {
    const source = this.source;
    if (!source) {
      return;
    }
    ids.forEach((id) => {
      const f = source.getFeatureById('flag-' + id) as Feature;
      if (f) {
        source.removeFeature(f);
      }
    });
  }
}
