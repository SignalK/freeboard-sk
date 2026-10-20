import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import {
  SKResourceClass,
  SKResourceService,
  SKResourceType
} from '../skresources';
import { DeltaSignal, FBResource } from 'src/app/types';
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
      const update = this.worker.resourceUpdate();
      const np = update.path.split('.');
      if (np.length !== 3) {
        return;
      }
      // read untracked, as applyToItem() does: publishing an updated item
      // must not run this effect again for the same delta
      const item = untracked(this._item);
      this.applyToItem(update);
      if (np[1] === 'groups' || (np[1] === 'notes' && item?.type !== 'notes')) {
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
    // a delta for it that arrives while fetching is newer than the fetched
    // copy; the stream sees every delta, where the signal keeps only the last
    let changed: DeltaSignal | undefined;
    const deltas = this.worker.resourceDelta$().subscribe((update) => {
      const np = update.path.split('.');
      if (np.length === 3 && np[1] === resourceType && np[2] === id) {
        changed = update;
      }
    });
    try {
      const r = await this.skres.fromServer(resourceType, id);
      if (r) {
        this.openWith(resourceType, [
          id,
          this.skres.transform(resourceType, r, id),
          false
        ] as FBResource);
        if (changed) {
          this.applyToItem(changed);
        }
      }
    } catch {
      return;
    } finally {
      deltas.unsubscribe();
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

  /** Apply a resources.<type>.<id> delta to the item, if it is the one
   *  shown: a value replaces its resource, none means it was deleted. */
  private applyToItem(update: DeltaSignal) {
    const np = update.path.split('.');
    const item = untracked(this._item);
    if (np.length !== 3 || np[1] !== item?.type || np[2] !== item?.id) {
      return;
    }
    if (!update.value) {
      this.close();
    } else if (item.type !== 'radars') {
      // radars are not resources, so no resources delta updates one;
      // a resources.<type>.<id> delta carries that resource's definition
      const resource = update.value as Parameters<
        SKResourceService['transform']
      >[1];
      // transform() does not tie its result class to item.type
      this._item.set({
        ...item,
        resource: this.skres.transform(item.type, resource, item.id)
      } as InfoPanelItem);
    }
  }
}
