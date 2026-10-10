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
import { Style, Fill, Stroke, Circle } from 'ol/style';
import { Point, LineString } from 'ol/geom';
import { Coordinate } from 'ol/coordinate';
import { MapComponent } from '../map.component';
import {
  SKAircraft,
  SKAtoN,
  SKSaR,
  SKVessel,
  SKMeteo,
  SKSensorTarget
} from 'src/app/modules';
import { FBFeatureLayerComponent } from '../sk-feature.component';
import { fromLonLatArray } from '../util';
import { Position } from 'src/app/types';

export type SKTarget =
  SKVessel | SKAircraft | SKAtoN | SKSaR | SKMeteo | SKSensorTarget;

// ** Signal K AIS Target Base Compnent  **
@Component({
  selector: 'ol-map > sk-ais-target-base',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class AISBaseLayerComponent
  extends FBFeatureLayerComponent
  implements OnInit, OnDestroy, OnChanges
{
  @Input() targets: Map<string, SKTarget> = new Map();
  @Input() targetContext: string; // e.g. 'vessels', 'atons', 'aircraft', 'meteo'
  @Input() targetStyles: { [key: string]: Style };
  @Input() focusId: string;
  @Input() inactiveTime = 180000; // in ms (3 mins)
  @Input() filterByShipType: boolean;
  @Input() filterShipTypes: Array<number>;
  @Input() filterIds: Array<string>;
  @Input() updateIds: Array<string> = [];
  @Input() staleIds: Array<string> = [];
  @Input() removeIds: Array<string> = [];
  // course line length in minutes of travel; 0 hides course lines
  @Input() cogLineLength = 0;

  constructor(
    protected override mapComponent: MapComponent,
    protected override changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
    this.labelPrefixes = [];
  }

  override ngOnInit() {
    super.ngOnInit();
    this.reloadTargets();
  }

  override ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
    if ('cogLineLength' in changes) {
      this.cogLineLength = changes['cogLineLength'].currentValue ?? 0;
    }
    if (this.layer) {
      const keys = Object.keys(changes);
      if (
        (keys.includes('targets') &&
          changes['targets'].previousValue.size === 0) ||
        keys.includes('filterShipTypes') ||
        keys.includes('filterByShipType')
      ) {
        this.reloadTargets();
      } else {
        if (keys.includes('removeIds')) {
          this.removeTargetIds(changes['removeIds'].currentValue);
        }
        if (keys.includes('updateIds')) {
          this.updateTargetIds(changes['updateIds'].currentValue);
        }
        if (keys.includes('staleIds')) {
          this.updateTargetIds(changes['staleIds'].currentValue, true);
        }
        if (
          (keys.includes('targetStyles') &&
            !changes['targetStyles'].firstChange) ||
          keys.some((k) =>
            ['focusId', 'filterIds', 'inactiveTime', 'cogLineLength'].includes(
              k
            )
          )
        ) {
          this.updateTargetIds(this.extractKeys(this.targets));
        }
      }
    }
  }

  /** Extract target ids
   * @param m Map object containing AIS targets of targetContext
   * @returns array of target ids
   */
  protected extractKeys(m: Map<string, SKTarget>): Array<string> {
    const keys = [];
    m.forEach((v, k) => {
      if (k.includes(this.targetContext)) {
        keys.push(k);
      }
    });
    return keys;
  }

  /** Determine if target with id should be rendered
   * @params id target identifier
   * @returns true if target should be rendered
   */
  protected okToRenderTarget(id: string): boolean {
    // IMO only
    const checkImo = (id: string) => {
      const imo =
        Array.isArray(this.filterShipTypes) &&
        this.filterShipTypes.includes(-999);
      if (imo) {
        const t = this.targets.get(id);
        if ('imo' in (t as SKVessel).registrations) {
          return true;
        } else {
          return false;
        }
      } else {
        return true;
      }
    };

    // Buddies only
    const checkBuddy = (id: string) => {
      const buddiesOnly =
        Array.isArray(this.filterShipTypes) &&
        this.filterShipTypes.includes(-998);
      if (buddiesOnly) {
        return (this.targets.get(id) as SKVessel).buddy === true;
      } else {
        return true;
      }
    };

    const passesSentinelFilters = (id: string) =>
      checkImo(id) && checkBuddy(id);

    if (this.filterByShipType && Array.isArray(this.filterShipTypes)) {
      const st = Math.floor(this.targets.get(id).type.id / 10) * 10;
      return this.filterShipTypes.includes(st) && passesSentinelFilters(id);
    }
    if (!this.filterIds) {
      return passesSentinelFilters(id);
    }
    if (Array.isArray(this.filterIds)) {
      return this.filterIds.includes(id) && passesSentinelFilters(id);
    } else {
      return passesSentinelFilters(id);
    }
  }

  /** Determine if target is stale
   * @params target AIS target
   * @returns true if target is stale
   */
  protected isStale(target: SKTarget): boolean {
    if (isNaN(this.inactiveTime)) {
      return false;
    }
    const now = new Date().valueOf();

    return target.lastUpdated.valueOf() < now - this.inactiveTime;
  }

  /** Return a feature label */
  protected buildLabel(target: SKTarget) {
    return (
      target.name ??
      target.callsignVhf ??
      target.callsignHf ??
      target.mmsi ??
      ''
    );
  }

  // reload all Features from this.targets
  private reloadTargets() {
    if (!this.targets || !this.source) {
      return;
    }
    this.source.clear();
    this.onReloadTargets();
  }

  protected onReloadTargets() {
    // overloadable
  }

  // update Features with supplied ids
  private updateTargetIds(ids: Array<string>, areStale = false) {
    if (!this.source || !Array.isArray(ids)) {
      return;
    }
    this.onUpdateTargets(ids, areStale);
  }

  protected onUpdateTargets(_ids: Array<string>, _areStale: boolean) {
    // overloadable
  }

  // remove target features
  private removeTargetIds(ids: Array<string>) {
    if (!this.source || !Array.isArray(ids)) {
      return;
    }
    this.onRemoveTargets(ids);
  }

  protected onRemoveTargets(_ids: Array<string>) {
    // overloadable
  }

  // label zoom threshold crossed
  override onLabelZoomThreshold(entered: boolean) {
    super.updateLabels();
    this.toggleCogLines(entered);
  }

  // add update COG vector
  protected parseCogLine(id: string, target: SKTarget) {
    const vector = cogVector(target);
    if (!this.source) {
      return;
    }

    let cf = this.source.getFeatureById('cog-' + id) as Feature;
    if (
      !vector ||
      !this.okToRenderCogLines() ||
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
      cf.setGeometry(new LineString(fromLonLatArray(vector)));
      cf.setStyle(this.buildCogLineStyle(id, cf));
    } else {
      // create vector
      cf = new Feature(new LineString(fromLonLatArray(vector)));
      cf.setId('cog-' + id);
      cf.setStyle(this.buildCogLineStyle(id, cf));
      this.source.addFeature(cf);
    }
  }

  protected removeCogLine(id: string) {
    const f = this.source.getFeatureById('cog-' + id) as Feature;
    if (f) {
      this.source.removeFeature(f);
    }
  }

  // show / hide cog vector
  protected toggleCogLines(show: boolean) {
    if (show) {
      this.targets.forEach((v: SKTarget, k) => {
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
  protected buildCogLineStyle(id: string, feature: Feature) {
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
  protected okToRenderCogLines() {
    return this.cogLineLength !== 0 && this.mapZoom >= this.labelMinZoom;
  }
}

/** The course line of a target that reports one: AIS vessels and sensor
 * targets. */
function cogVector(target: SKTarget): Position[] | undefined {
  return 'vectors' in target ? (target.vectors.cog ?? undefined) : undefined;
}
