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
import { Style } from 'ol/style';
import { MapComponent } from '../map.component';
import { SKAircraft, SKAtoN, SKSaR, SKVessel, SKMeteo } from 'src/app/modules';
import { FBFeatureLayerComponent } from '../sk-feature.component';

type SKTarget = SKVessel | SKAircraft | SKAtoN | SKSaR | SKMeteo;

// ** Signal K AIS Target Base Compnent  **
@Component({
  selector: 'ol-map > sk-ais-target-base',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
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

  constructor(
    protected mapComponent: MapComponent,
    protected changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
    this.labelPrefixes = [];
  }

  ngOnInit() {
    super.ngOnInit();
    this.reloadTargets();
  }

  ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
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
          keys.some((k) => ['focusId', 'filterIds', 'inactiveTime'].includes(k))
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

    if (this.filterByShipType && Array.isArray(this.filterShipTypes)) {
      const st = Math.floor(this.targets.get(id).type.id / 10) * 10;
      return this.filterShipTypes.includes(st) && checkImo(id);
    }
    if (!this.filterIds) {
      return checkImo(id);
    }
    if (Array.isArray(this.filterIds)) {
      return this.filterIds.includes(id) && checkImo(id);
    } else {
      return checkImo(id);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  protected onUpdateTargets(ids: Array<string>, areStale: boolean) {
    // overloadable
  }

  // remove target features
  private removeTargetIds(ids: Array<string>) {
    if (!this.source || !Array.isArray(ids)) {
      return;
    }
    this.onRemoveTargets(ids);
  }

  protected onRemoveTargets(ids: Array<string>) {
    // overloadable
  }
}
