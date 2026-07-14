import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  SimpleChanges
} from '@angular/core';
import { Feature } from 'ol';
import { Style, RegularShape, Fill, Stroke, Text, Icon } from 'ol/style';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { AISBaseLayerComponent, SKTarget } from './ais-base.component';
import { MapImageRegistry } from '../map-image-registry.service';
import { SKMeteo } from 'src/app/modules';
import { meteoWindBucket } from 'src/app/modules/icons';
import { AppFacade } from 'src/app/app.facade';
import { WindIndicator } from 'src/app/types';

// ** Signal K non-vessel targets **
@Component({
  selector: 'ol-map > sk-ais-targets',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class AISTargetsLayerComponent extends AISBaseLayerComponent {
  // Wind glyph for meteo (weather-station) targets: 'barb' (default) or the
  // 'arrow' with a speed label. Ignored for non-meteo target contexts.
  @Input() windIndicator: WindIndicator = 'barb';

  constructor(
    protected override mapComponent: MapComponent,
    protected override changeDetectorRef: ChangeDetectorRef,
    protected mapImages: MapImageRegistry,
    private app: AppFacade
  ) {
    super(mapComponent, changeDetectorRef);
  }

  override ngOnInit() {
    super.ngOnInit();
    this.labelPrefixes = [this.targetContext];
  }

  override ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
    if (
      this.layer &&
      changes['windIndicator'] &&
      !changes['windIndicator'].firstChange
    ) {
      this.onUpdateTargets(this.extractKeys(this.targets));
    }
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
              const s = this.buildStyle(target).clone();
              f.set('name', label, true);
              f.setStyle(
                this.setTextLabel(
                  this.setRotation(s, this.targetRotation(target)),
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
      const s = this.buildStyle(target).clone();
      f.setStyle(
        this.setTextLabel(
          this.setRotation(s, this.targetRotation(target)),
          label
        )
      );
      this.source.addFeature(f);
    }
  }

  // Whether this meteo target should render as an arrow (only when the arrow
  // indicator is selected and the target reports a usable wind).
  private isMeteoArrow(target: SKTarget): boolean {
    if (this.targetContext !== 'meteo' || this.windIndicator !== 'arrow') {
      return false;
    }
    const meteo = target as SKMeteo;
    return Boolean(meteoWindBucket(meteo.tws)) && Number.isFinite(meteo.twd);
  }

  // Meteo (weather-station) targets rotate to the reported wind: a barb's staff
  // points into the wind (its "from" direction); an arrow points where the wind
  // flows to. Every other target keeps its fixed orientation.
  private targetRotation(target: SKTarget): number {
    if (this.targetContext !== 'meteo') {
      return target.orientation;
    }
    const meteo = target as SKMeteo;
    if (this.isMeteoArrow(target)) {
      return meteo.twd + Math.PI;
    }
    return meteoWindBucket(meteo.tws) && Number.isFinite(meteo.twd)
      ? meteo.twd
      : 0;
  }

  // Whether a meteo target reports a wind speed to display alongside its glyph.
  private hasMeteoWind(target: SKTarget): boolean {
    return (
      this.targetContext === 'meteo' && Number.isFinite((target as SKMeteo).tws)
    );
  }

  // Append the wind speed to a meteo target's label for both indicators — the
  // speed value is always shown (in the user's configured wind-speed units),
  // whether the glyph is an arrow or a barb.
  protected override buildLabel(target: SKTarget): string {
    const label = super.buildLabel(target);
    if (!this.hasMeteoWind(target)) {
      return label;
    }
    const speed = this.app.formatValueForDisplay(
      (target as SKMeteo).tws,
      'm/s',
      {
        precision: 0,
        path: this.app.twsDisplayUnitPath()
      }
    );
    return label ? `${label} ${speed}` : speed;
  }

  // build target style
  buildStyle(target: SKTarget): Style {
    const icon = this.isMeteoArrow(target)
      ? this.mapImages.getWindArrow()
      : this.targetContext === 'meteo'
        ? this.mapImages.getMeteoIcon((target as SKMeteo).tws, target.virtual)
        : this.mapImages.getAtoN(target.type?.id, target.virtual);
    if (icon && typeof this.targetStyles === 'undefined') {
      if (icon) {
        return new Style({
          image: icon,
          text: new Text({
            text: '',
            offsetX: 0,
            offsetY: -18
          })
        });
      }
      return;
    }
    let s: Style;
    const setStale = this.isStale(target);
    if (typeof this.targetStyles !== 'undefined') {
      if (setStale) {
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
