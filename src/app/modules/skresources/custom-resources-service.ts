import { Injectable, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SignalKClient } from 'signalk-client-angular';
import { AppFacade } from 'src/app/app.facade';
import { SKResourceSet } from './custom-resource-classes';
import { SKResourceService, SKSelection } from './resources.service';
import {
  FBResourceSet,
  FBResourceSets,
  ResourceSet,
  ResourceSets
} from 'src/app/types';
import { processUrlTokens } from 'src/app/app.config';
import { HttpErrorResponse } from '@angular/common/http';

/** ResourceSet entries cached per collection */
type ResourceSetCache = Map<string, FBResourceSets>;
type CustomResourceType = 'ResourceSet';

// ** Signal K custom / other resource(s) operations
@Injectable({ providedIn: 'root' })
export class FBCustomResourceService {
  private resSetCacheSignal = signal<ResourceSetCache>(new Map());
  readonly resourceSets = this.resSetCacheSignal.asReadonly();

  constructor(
    public dialog: MatDialog,
    public signalk: SignalKClient,
    public app: AppFacade,
    private skres: SKResourceService
  ) {}

  /** **********************************
   * Custom Resource common methods
   *************************************/

  /**
   * @description Check status and initialise custom resource paths required for Freeboard features
   * @returns object items to be added to this.app.featureFlags
   */
  public async initCustomCollections() {
    const rcs = {};
    await Promise.all(
      this.app.CUSTOM_RESOURCES.map(async (cr) => {
        rcs[cr.featureKey] = await this.checkCustomCollection(
          cr.name,
          cr.description,
          cr.createIfMissing ?? true
        );
      })
    );
    return rcs;
  }

  /**
   * @description Check for supplied custom resource collection
   * @param name Name of resource collection to check
   * @param description Collection description.
   * @param createIfMissing Create the collection when it is not found.
   * @returns true if collection is available on the Signal K server
   */
  private checkCustomCollection(
    name: string,
    description: string,
    createIfMissing = true
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.signalk.api
        .get(this.app.skApiVersion, `resources/${name}`)
        .subscribe(
          () => resolve(true),
          () => {
            if (!createIfMissing) {
              resolve(false);
              return;
            }
            this.signalk
              .post(`/plugins/resources-provider/_config/${name}`, {
                description: description
              })
              .subscribe({
                next: () => resolve(true),
                error: () => resolve(false)
              });
          }
        );
    });
  }

  /**
   * @description Fetch custom resources of supplied type from Signal K server.
   * @param collection The custom resource collection endpoint to query e.g. infolayers, fishing
   * @param type Custom resource type
   * @param query  Filter criteria for resources to return
   * @returns Promise<T[]> (rejects with HTTPErrorResponse)
   */
  public customListFromServer<T extends FBResourceSet>(
    collection: string,
    type: CustomResourceType,
    query?: string,
    onlySelected?: boolean
  ): Promise<T[]> {
    if (query) {
      query = query.startsWith('?') ? query : `?${query}`;
    } else {
      query = '';
    }
    return new Promise((resolve, reject) => {
      const skf = this.signalk.api.get(
        this.app.skApiVersion,
        `/resources/${collection}${query}`
      );
      skf?.subscribe(
        (res: ResourceSets) => {
          const list = Object.entries(res);
          if (list.length === 0) {
            resolve([]);
          }
          list.forEach((i) => (i[1].id = i[0]));
          let flist: Array<FBResourceSet>;
          if (type === 'ResourceSet') {
            flist = list
              .filter((i) => this.isResourceSet(i[1]))
              .map((i): FBResourceSet => [
                i[0],
                new SKResourceSet(i[1]),
                this.isSelected(collection as SKSelection, i[1].type, i[0])
              ]);
          }
          flist = onlySelected ? flist.filter((i) => i[2]) : flist;
          resolve(flist as T[]);
        },
        (err: HttpErrorResponse) => reject(err)
      );
    });
  }

  /**
   * @description Determines if a resource item is selected for display.
   * @param collection The custom resource collection endpoint to query e.g. infolayers, fishing
   * @param type Custom resource type
   * @param id  Resource identifier
   */
  private isSelected(
    collection: SKSelection,
    type: CustomResourceType,
    id: string
  ): boolean {
    if (type === 'ResourceSet') {
      if (Array.isArray(this.app.config.selections.resourceSets[collection])) {
        return this.app.config.selections.resourceSets[collection].includes(id);
      } else {
        return false;
      }
    }
    return false;
  }

  /** **********************************
   * ResourceSet methods
   *************************************/

  /**
   * Test if supplied item is a ResourceSet
   * @param item Item to test
   * @returns true on success
   */
  private isResourceSet(item: ResourceSet) {
    if (typeof item.type === 'undefined') return false;
    if (item.type !== 'ResourceSet') return false;
    if (typeof item.values === 'undefined') return false;
    return true;
  }

  /**
   * @description Retrieve cached Resource Set | feature at index (app.data)
   * @params id Map feature id.
   * @params getFeature  true = return Feature entry, false = return whole RecordSet
   * @returns Feature OR Resource Set.
   */
  public fromResourceSetCache(mapFeatureId: string, getFeature?: boolean) {
    const t = mapFeatureId.split('.');
    if (t[0] !== 'rset') {
      return;
    }
    const collection = t[1];
    const rSetId = t[2];
    const index = Number(t[t.length - 1]);
    if (!Array.isArray(this.resSetCacheSignal().get(collection))) {
      return;
    }
    const item = this.resSetCacheSignal()
      .get(collection)
      .filter((i) => i[0] === rSetId)[0];
    return getFeature ? item[1].values.features[index] : item[1];
  }

  /**
   * @description Refresh ResourceSet cache with "in bounds" items fetched from sk server
   * @param collection ResourceSet collection name
   * @param query Filter criteria for ResourceSets in placed in the cache
   */
  private async refreshResourceSets(collection: string, query?: string) {
    if (this.app.IGNORE_RESOURCES.includes(collection)) {
      return;
    }
    this.app.debug(`** refreshResourceSets() query: ${query}`);
    try {
      const items = await this.customListFromServer<FBResourceSet>(
        collection,
        'ResourceSet',
        query,
        true
      );
      this.resSetCacheSignal.update((current) => {
        current.set(collection, items);
        return current;
      });
    } catch (err) {
      this.app.debug('** refreshResourceSets()', err);
      this.resSetCacheSignal.update((current) => {
        current.set(collection, []);
        return current;
      });
    }
  }

  /**
   * Refresh ResourceSet cache with "in bounds" items for all active ResourceSet collections
   */
  public refreshResourceSetsInBounds(collection?: string) {
    const doRefresh = async (c: string) => {
      if (!Array.isArray(this.app.config.selections.resourceSets[c])) {
        return;
      }
      this.app.debug(`refreshResourceSetsInBounds(${c})`);
      await this.refreshResourceSets(c, this.buildResourceSetFilterQuery());
    };

    if (collection) {
      if (!this.app.IGNORE_RESOURCES.includes(collection)) {
        doRefresh(collection);
      }
    } else {
      Object.keys(this.app.config.selections.resourceSets)
        .filter((r) => !this.app.IGNORE_RESOURCES.includes(r))
        .forEach(async (collection: string) => doRefresh(collection));
    }
  }

  /**
   * Build resource filter query to return in bounds entries.
   * @returns query string
   */
  private buildResourceSetFilterQuery() {
    let q = '';
    if (
      this.app.config.resources.fetchRadius !== 0 &&
      this.app.config.resources.fetchFilter
    ) {
      q = processUrlTokens(
        this.app.config.resources.fetchFilter,
        this.app.config
      );
      if (!q.startsWith('?')) {
        q = '?' + q;
      }
    }
    return q;
  }

  /**
   * Returns true if there are items selected in any ResourceSet collection.
   * Used to trigger fetch of items within a map extent.
   * */
  public anyResourceSetSelection(): boolean {
    let result = false;
    Object.entries(this.app.config.selections.resourceSets)
      .filter((r) => !this.app.IGNORE_RESOURCES.includes(r[0]))
      .forEach((r) => {
        if (r[1].length > 0) {
          result = true;
        }
      });
    return result;
  }
}
