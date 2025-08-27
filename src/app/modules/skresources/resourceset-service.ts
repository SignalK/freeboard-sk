import { Injectable, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SignalKClient } from 'signalk-client-angular';
import { AppFacade } from 'src/app/app.facade';
import { SKResourceSet } from './resourceset-class';
import { ResourceSet, ResourceSets } from 'src/app/types';
import { processUrlTokens } from 'src/app/app.config';
import { HttpErrorResponse } from '@angular/common/http';

type FBResourceSets = Map<string, SKResourceSet[]>;

// ** Signal K custom / other resource(s) operations
@Injectable({ providedIn: 'root' })
export class SKOtherResources {
  private resSetCacheSignal = signal<FBResourceSets>(new Map());
  readonly resourceSets = this.resSetCacheSignal.asReadonly();

  private ignoreList = ['tracks', 'buddies', 'groups'];

  constructor(
    public dialog: MatDialog,
    public signalk: SignalKClient,
    public app: AppFacade
  ) {}

  /**
   * Test if supplied item is a ResourceSet
   * @param v Item to test
   * @returns true on success
   */
  private isResourceSet(v: ResourceSet) {
    if (typeof v.type === 'undefined') return false;
    if (v.type !== 'ResourceSet') return false;
    if (typeof v.values === 'undefined') return false;
    return true;
  }

  /**
   * Build resource filter query
   * @returns query string
   */
  private buildFilterQuery() {
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
   * @description Retrieve cached Resource Set | feature at index (app.data)
   * @params id Map feature id.
   * @params getFeature  true = return Feature entry, false = return whole RecordSet
   * @returns Feature OR Resource Set.
   */
  public fromCache(mapFeatureId: string, getFeature?: boolean) {
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
      .filter((i: SKResourceSet) => i.id === rSetId)[0];
    return getFeature ? item.values.features[index] : item;
  }

  /**
   * @description Fetch resources of supplied type from Signal K server.
   * @param collection The resource collection to which the resource belongs e.g. routes, waypoints, etc.
   * @param query  Filter criteria for resources to return
   * @param onlySelected Include only selected items in the response
   * @returns Promise<T[]> (rejects with HTTPErrorResponse)
   */
  public lisFromServer(
    collection: string,
    query?: string,
    onlySelected?: boolean
  ): Promise<SKResourceSet[]> {
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
          if (!this.isResourceSet(list[0][1])) {
            resolve([]);
          }
          let rset: SKResourceSet[] = list.map((i) => {
            const r = new SKResourceSet(i[1]);
            r.id = i[0];
            return r;
          });
          if (onlySelected) {
            if (
              !Array.isArray(
                this.app.config.selections.resourceSets[collection]
              )
            ) {
              resolve([]);
            }
            rset = rset.filter((i) =>
              this.app.config.selections.resourceSets[collection].includes(i.id)
            );
          }
          resolve(rset);
        },
        (err: HttpErrorResponse) => reject(err)
      );
    });
  }

  /**
   * @description Refresh ResourceSet cache with "in bounds" items fetched from sk server
   * @param collection ResourceSet collection name
   * @param query Filter criteria for ResourceSets in placed in the cache
   */
  private async refreshItems(collection: string, query?: string) {
    if (this.ignoreList.includes(collection)) {
      return;
    }
    query = query ?? this.buildFilterQuery();
    this.app.debug(`** ResourceSet.refreshItems() query: ${query}`);
    try {
      const items = await this.lisFromServer(collection, query, true);
      this.resSetCacheSignal.update((current: FBResourceSets) => {
        current.set(collection, items);
        return current;
      });
    } catch (err) {
      this.app.debug('** ResourceSet.refreshItems()', err);
      this.resSetCacheSignal.update((current: FBResourceSets) => {
        current.set(collection, []);
        return current;
      });
    }
  }

  /**
   * Refresh ResourceSet cache with "in bounds" items for all active ResourceSet collections
   */
  public refreshInBoundsItems(collection?: string) {
    const doRefresh = async (c: string) => {
      if (!Array.isArray(this.app.config.selections.resourceSets[c])) {
        return;
      }
      this.app.debug(`refreshInBoundsItems(${c})`);
      await this.refreshItems(c, this.buildFilterQuery());
    };

    if (collection) {
      if (!this.ignoreList.includes(collection)) {
        doRefresh(collection);
      }
    } else {
      Object.keys(this.app.config.selections.resourceSets)
        .filter((r) => !this.ignoreList.includes(r))
        .forEach(async (collection: string) => doRefresh(collection));
    }
  }

  /**
   * Returns true if there are items selected in any ResourceSet collection.
   * Used to trigger fetch of items within a map extent.
   * */
  public anySelected(): boolean {
    let result = false;
    Object.entries(this.app.config.selections.resourceSets)
      .filter((r) => !this.ignoreList.includes(r[0]))
      .forEach((r) => {
        if (r[1].length > 0) {
          result = true;
        }
      });
    return result;
  }
}
