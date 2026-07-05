import { effect, inject, Injectable, signal } from '@angular/core';
import {
  SKChart,
  SKNote,
  SKRegion,
  SKResourceService,
  SKResourceType,
  SKRoute,
  SKTrack,
  SKWaypoint
} from '../skresources';
import {
  ChartResource,
  FBNote,
  FBRegion,
  FBRoute,
  FBWaypoint
} from 'src/app/types';
import { SKWorkerService } from '../skstream/skstream.service';
import { ActiveRadar } from '../radar/radar-api.service';

export type InfoPanelResource =
  SKRoute | SKWaypoint | SKRegion | SKNote | SKChart | SKTrack | ActiveRadar;

export interface InfoPanelItem {
  type: SKResourceType | 'radars';
  id: string;
  resource: InfoPanelResource;
}

@Injectable({ providedIn: 'root' })
export class InfoPanelFacade {
  private _opened = signal<boolean>(false);
  readonly opened = this._opened.asReadonly();

  private _item = signal(undefined);
  readonly item = this._item.asReadonly();

  private _related = signal<string>(undefined);
  readonly related = this._related.asReadonly();

  private worker = inject(SKWorkerService);
  private skres = inject(SKResourceService);

  constructor() {
    // resources delta handler
    effect(() => {
      const np = this.worker.resourceUpdate().path.split('.');
      if (np.length !== 3) {
        return;
      }
      if (np[1] === this._item()?.type && np[2] === this._item()?.id) {
        if (!this.worker.resourceUpdate().value) {
          // deleted
          this.close();
        } else {
          this._item.update((current) => {
            current.resource = this.skres.transform(
              current.type,
              this.worker.resourceUpdate().value,
              current.id
            );
            return current;
          });
        }
      }
      if (
        np[1] === 'groups' ||
        (np[1] === 'notes' && this._item()?.type !== 'notes')
      ) {
        this._related.set(`${np[1]}.${Date.now()}`);
      }
    });
  }

  /**
   * @description Fetch resource with supplied id and open InfoPanel
   * @param id note identifier
   */
  public async open(resourceType: SKResourceType, id: string) {
    if (!id) {
      return;
    }
    try {
      const r = await this.skres.fromServer(resourceType, id);
      if (r) {
        this.openWith(resourceType, [
          id,
          this.skres.transform(resourceType, r, id) as any,
          false
        ]);
        return;
      }
    } catch (err) {
      return;
    }
  }

  /**
   * @description Open InfoPanel with the supplied resource
   * @param resource
   */
  public openWith(
    resourceType: SKResourceType,
    resource: FBNote | FBRegion | FBWaypoint | FBRoute
  ) {
    if (!resourceType || !resource) {
      return;
    }
    this._item.set({
      type: resourceType,
      id: resource[0],
      resource: resource[1]
    });
    this._opened.set(true);
  }

  public openRadar(radar: ActiveRadar) {
    this._item.set({
      type: 'radars',
      id: radar.device.id,
      resource: radar
    });
    this._opened.set(true);
  }

  public close() {
    this._item.set(undefined);
    this._opened.set(false);
  }
}
