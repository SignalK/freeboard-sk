import { effect, inject, Injectable, signal } from '@angular/core';
import {
  SKResourceClass,
  SKResourceService,
  SKResourceType
} from '../skresources';
import { FBResource } from 'src/app/types';
import { SKWorkerService } from '../skstream/skstream.service';
import { ActiveRadar } from '../radar/radar-api.service';

type ResourceItem<T extends SKResourceType> = {
  type: T;
  id: string;
  resource: SKResourceClass<T>;
};

/** The item the panel shows; its `type` names the class of its `resource`. */
export type InfoPanelItem =
  | { [T in SKResourceType]: ResourceItem<T> }[SKResourceType]
  | { type: 'radars'; id: string; resource: ActiveRadar };

@Injectable({ providedIn: 'root' })
export class InfoPanelFacade {
  private _opened = signal<boolean>(false);
  readonly opened = this._opened.asReadonly();

  private _item = signal<InfoPanelItem | undefined>(undefined);
  readonly item = this._item.asReadonly();

  private _related = signal<string | undefined>(undefined);
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
            // radars are not resources, so no resources delta updates one
            if (!current || current.type === 'radars') {
              return current;
            }
            // a resources.<type>.<id> delta carries that resource's definition
            const resource = this.worker.resourceUpdate().value as Parameters<
              SKResourceService['transform']
            >[1];
            const item: ResourceItem<SKResourceType> = current;
            item.resource = this.skres.transform(item.type, resource, item.id);
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
          this.skres.transform(resourceType, r, id),
          false
        ] as FBResource);
        return;
      }
    } catch {
      return;
    }
  }

  /**
   * @description Open InfoPanel with the supplied resource
   * @param resource
   */
  public openWith(resourceType: SKResourceType, resource: FBResource) {
    if (!resourceType || !resource) {
      return;
    }
    // FBResource does not tie its resource class to resourceType
    this._item.set({
      type: resourceType,
      id: resource[0],
      resource: resource[1]
    } as InfoPanelItem);
    this._opened.set(true);
  }

  public openRadar(radar: ActiveRadar | undefined) {
    if (!radar) {
      return;
    }
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
