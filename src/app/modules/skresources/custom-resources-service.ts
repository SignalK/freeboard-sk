import { Injectable, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SignalKClient } from 'signalk-client-angular';
import { AppFacade } from 'src/app/app.facade';
import { SKInfoLayer, SKResourceSet } from './custom-resource-classes';
import { SKResourceService, SKSelection } from './resources.service';
import {
  FBInfoLayer,
  FBInfoLayers,
  InfoLayerResource,
  InfoLayers,
  ResourceSet,
  ResourceSets
} from 'src/app/types';
import { processUrlTokens } from 'src/app/app.config';
import { HttpErrorResponse } from '@angular/common/http';

type FBResourceSets = Map<string, SKResourceSet[]>;
type CustomResourceType = 'InfoLayer' | 'ResourceSet';

// ** Signal K custom / other resource(s) operations
@Injectable({ providedIn: 'root' })
export class FBCustomResourceService {
  private resSetCacheSignal = signal<FBResourceSets>(new Map());
  readonly resourceSets = this.resSetCacheSignal.asReadonly();

  private infoLayerCacheSignal = signal<FBInfoLayers>([]);
  readonly infoLayers = this.infoLayerCacheSignal.asReadonly();

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
    for (const cr of this.app.CUSTOM_RESOURCES) {
      let r = await this.checkCustomCollection(cr.name, cr.description);
      rcs[cr.featureKey] = r;
    }
    return rcs;
  }

  /**
   * @description Check for supplied custom resource collection
   * @param name Name of resource collection to check
   * @param description Collection description.
   * @returns true if collection is available on the Signal K server
   */
  private checkCustomCollection(
    name: string,
    description: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.signalk.api
        .get(this.app.skApiVersion, `resources/${name}`)
        .subscribe(
          () => resolve(true),
          () => {
            this.signalk
              .post(`/plugins/resources-provider/_config/${name}`, {
                description: description
              })
              .subscribe(
                () => resolve(true),
                () => resolve(false)
              );
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
  public customListFromServer<T>(
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
        (res: ResourceSets | InfoLayers) => {
          const list = Object.entries(res);
          if (list.length === 0) {
            resolve([]);
          }
          list.forEach((i) => (i[1].id = i[0]));
          let flist: any[];
          if (type === 'InfoLayer') {
            flist = list
              .filter((i) => this.isInfoLayer(i[1]))
              .map((i) => [
                i[0],
                new SKInfoLayer(i[1]),
                this.isSelected(collection as SKSelection, i[1].type, i[0])
              ]);
          } else if (type === 'ResourceSet') {
            flist = list
              .filter((i) => this.isResourceSet(i[1]))
              .map((i) => [
                i[0],
                new SKResourceSet(i[1]),
                this.isSelected(collection as SKSelection, i[1].type, i[0])
              ]);
          }
          flist = onlySelected ? flist.filter((i) => i[2]) : flist;
          resolve(flist);
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
    if (type === 'InfoLayer') {
      return !this.skres.selectionIsFiltered(collection)
        ? true
        : this.skres.selectionHas(collection, id);
    } else if (type === 'ResourceSet') {
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
      .filter((i: SKResourceSet) => i[0] === rSetId)[0];
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
      const items = await this.customListFromServer<SKResourceSet>(
        collection,
        'ResourceSet',
        query,
        true
      );
      this.resSetCacheSignal.update((current: FBResourceSets) => {
        current.set(collection, items);
        return current;
      });
    } catch (err) {
      this.app.debug('** refreshResourceSets()', err);
      this.resSetCacheSignal.update((current: FBResourceSets) => {
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

  /** **********************************
   * InfoLayer methods
   *************************************/

  /**
   * Test if supplied item is a InfoLayer
   * @param item Item to test
   * @returns true on success
   */
  private isInfoLayer(item: InfoLayerResource) {
    if (typeof item.type === 'undefined') return false;
    if (item.type !== 'InfoLayer') return false;
    if (typeof item.values === 'undefined') return false;
    return true;
  }

  /**
   * @description Refresh InfoLayer cache with entries fetched from sk server
   * @param query Filter criteria for items in placed in the cache
   */
  public async refreshInfoLayers(query?: string) {
    if (query && query[0] !== '?') {
      query = '?' + query;
    }
    this.app.debug(`** refreshInfoLayers(): ${query}`);
    try {
      const layers = await this.customListFromServer<FBInfoLayer>(
        'infolayers',
        'InfoLayer',
        query,
        true
      );
      let flist = layers.filter((layer: FBInfoLayer) => layer[2]);
      //flist = this.arrangeLayers(flist);
      this.infoLayerCacheSignal.set(flist);
    } catch (err) {
      this.app.debug('** refreshInfoLayers:', err);
    }
  }

  /**
   * @description Update InfoLayer cache with provided data (without fetching from server)
   * @param layers Array of InfoLayer data to set in the cache
   */
  public updateInfoLayerCache(layers: FBInfoLayers) {
    this.infoLayerCacheSignal.set(layers);
  }
}
