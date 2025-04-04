import { Injectable, signal } from '@angular/core';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { Subject, Observable } from 'rxjs';
import ngeohash from 'ngeohash';

import { SignalKClient } from 'signalk-client-angular';
import { AppFacade, OSM } from 'src/app/app.facade';
import { GeoUtils } from 'src/app/lib/geoutils';

import { LoginDialog } from 'src/app/lib/components/dialogs';
import {
  NoteDialog,
  RegionDialog,
  RouteDialog,
  WaypointDialog,
  RelatedNotesDialog,
  TrackDialog
} from '.';
import { SKResourceSet } from '.';
import { processUrlTokens } from 'src/app/app.settings';

import {
  SKChart,
  SKRoute,
  SKWaypoint,
  SKRegion,
  SKNote,
  SKTrack
} from './resource-classes';
import {
  Routes,
  Waypoints,
  Notes,
  NoteResource,
  Tracks,
  Charts,
  LineString,
  SKPosition,
  RouteResource,
  WaypointResource,
  RegionResource,
  TrackResource,
  FBNotes,
  Position,
  Regions,
  FBResource,
  ChartResource
} from 'src/app/types';
import { PathValue } from '@signalk/server-api';

export type SKResourceType =
  | 'routes'
  | 'waypoints'
  | 'regions'
  | 'notes'
  | 'charts';

// ** Signal K resource operations
@Injectable({ providedIn: 'root' })
export class SKResources {
  private reOpen: { key?: string; value?: string; readOnly?: boolean };
  private updateSource: Subject<unknown> = new Subject<unknown>();

  constructor(
    public dialog: MatDialog,
    public signalk: SignalKClient,
    public app: AppFacade
  ) {}

  // ** Observables **
  public update$(): Observable<unknown> {
    return this.updateSource.asObservable();
  }

  // ******** Resource cache operations ********************

  /**
   * @description Return reference to cache for supplied resource type
   * @param collection
   * @returns Reference to resource cache
   */
  private getCacheRef(collection: SKResourceType) {
    switch (collection) {
      case 'regions':
        return this.regionCacheSignal;
      /*case 'routes':
        cache = [].concat(this.routeCacheSignal());
        remove(id);
        this.routeCacheSignal.set(cache);
      case 'waypoints':
        cache = [].concat(this.waypointCacheSignal());
        remove(id);
        this.waypointCacheSignal.set(cache);
      case 'notes':
        cache = [].concat(this.noteCacheSignal());
        remove(id);
        this.noteCacheSignal.set(cache);
      case 'charts':
        cache = [].concat(this.chartCacheSignal());
        remove(id);
        this.chartCacheSignal.set(cache);
        */
    }
  }

  /**
   * @description Refresh the cache for the supplied Resource type
   * @param collection Signal K resource collection type
   * @param query (optional) Filter parameters
   * @returns resolved promise true: successful, false: on error.
   */
  cacheRefresh(collection: SKResourceType, query?: string): Promise<boolean> {
    query = query ?? '';
    this.app.debug(`** cacheRefresh(${collection}, ${query})`);
    return new Promise((resolve) => {
      const resCache = this.getCacheRef(collection);
      if (!resCache) {
        resolve(false);
      }
      const skf = this.signalk.api.get(
        this.app.skApiVersion,
        `/resources/${collection}${query}`
      );

      skf?.subscribe(
        (res: Routes | Waypoints | Regions | Notes | Charts) => {
          switch (collection) {
            /*case 'routes':
              this.regionCacheRefresh(res as Regions);
              break;
              case 'waypoints':
                this.regionCacheRefresh(res as Regions);
                break;*/
            case 'regions':
              this.regionCacheRefresh(res as Regions);
              break;
            /*case 'notes':
              this.regionCacheRefresh(res as Regions);
              break;*/
          }
          resolve(true);
        },
        (error: HttpErrorResponse) => {
          resolve(false);
        }
      );
    });
  }

  /**
   * @description Remove item(s) from the resource cache.
   * @param collection Signal K resource collection type
   * @param id resource identifier(s)
   */
  cacheRemove(collection: SKResourceType, id: string | string[]) {
    this.app.debug(`** cacheRemove(${collection}, ${id})`);
    const removeItem = (id: string) => {
      let idx = cache.findIndex((item: FBResource) => item[0] === id);
      if (idx !== -1) {
        cache.splice(idx, 1);
      }
      if (this.app.config.selections[collection]) {
        idx = this.app.config.selections[collection].indexOf(id);
        if (idx !== -1) {
          this.app.config.selections[collection].splice(idx, 1);
        }
      }
    };
    const remove = (id: string | string[]) => {
      if (Array.isArray(id)) {
        id.forEach((tid: string) => {
          removeItem(tid);
        });
      } else {
        removeItem(id);
      }
    };
    const resCache = this.getCacheRef(collection);
    if (!resCache) {
      return;
    }
    const cache = [].concat(resCache());
    remove(id);
    resCache.set(cache);
    this.app.saveConfig();
  }

  /**
   * @description Fetch resource(s) from server and add to the cache
   * @param ids Array of track ids to from server into the cache
   */
  cacheAddFromServer(collection: SKResourceType, id: string | string[]) {
    this.app.debug(`** cacheAddFromServer(${collection}, ${id})`);
    if (id && this.app.config.selections[collection]) {
      id = !Array.isArray(id) ? [id] : id;
      id.forEach((resId: string) => {
        if (!this.app.config.selections[collection].includes(resId)) {
          this.app.config.selections[collection].push(resId);
        }
      });
      this.cacheRefresh(collection);
    }
  }

  /**
   * @description Retrieve cached resource entry (app.data)
   * @params cache Resource cache to use (e.g. routes, etc.)
   * @params id Resource identifier
   * @returns resource entry
   */
  public fromCache(cache: SKResourceType, id: string) {
    if (cache === 'regions') {
      return this.regionCacheSignal().find((r) => r[0] === id);
    } else {
      if (!this.app.data[cache] || !Array.isArray(this.app.data[cache])) {
        return;
      }
      const item = this.app.data[cache].find((i) => i[0] === id);
      return item ?? undefined;
    }
  }

  /**
   * @description Retrieve cached Resource Set | feature at index (app.data)
   * @params id Map feature id.
   * @params getFeature  true = return Feature entry, false = return whole RecordSet
   * @returns Feature OR Resource Set.
   * @deprecated
   */
  public resSetFromCache(mapFeatureId: string, getFeature?: boolean) {
    const t = mapFeatureId.split('.');
    if (t[0] !== 'rset') {
      return;
    }
    const collection = t[1];
    const rSetId = t[2];
    const index = Number(t[t.length - 1]);
    if (
      !this.app.data.resourceSets[collection] ||
      !Array.isArray(this.app.data.resourceSets[collection])
    ) {
      return;
    }
    const item = this.app.data.resourceSets[collection].filter(
      (i: SKResourceSet) => i.id === rSetId
    )[0];
    return getFeature ? item.values.features[index] : item;
  }

  // ******** SK Resource operations ********************

  /**
   * @description Fetch resource with specified identifier from Signal K server.
   * @param collection The resource collection to which the resource belongs e.g. routes, waypoints, etc.
   * @param id  Resource identifier
   * @returns resolved Promise on success, rejects with HTTPErrorResponse
   */
  public fromServer(collection: SKResourceType, id: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .get(this.app.skApiVersion, `/resources/${collection}/${id}`)
        .subscribe(
          (res) => resolve(this.transform(collection, res, id)),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  /**
   * @description Transform Resource response to instance of a Resource Class
   * @param collection
   * @param resource
   * @param id
   * @returns
   */
  private transform(
    collection: SKResourceType,
    resource:
      | RouteResource
      | WaypointResource
      | RegionResource
      | NoteResource
      | ChartResource,
    id: string
  ): SKRoute | SKWaypoint | SKRegion | SKNote | SKChart {
    switch (collection) {
      case 'regions':
        return this.transformRegion(resource as RegionResource, id);
      /*case 'routes':
        return this.transformRute((resource as RouteResource), id);
      case 'waypoints':
        return this.transformWaypoint((resource as WaypointResource), id);
      case 'notes':
        return this.transformNote((resource as NoteResource), id);
      case 'charts':
        return this.transformChart((resource as ChartResource), id);
        */
    }
  }

  /**
   * @description Delete resource from server
   * @param collection
   * @param id
   * @returns resolved Promise on success, rejects with HTTPErrorResponse
   */
  public deleteFromServer(
    collection: SKResourceType | 'tracks',
    id: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .delete(this.app.skApiVersion, `/resources/${collection}/${id}`)
        .subscribe(
          () => resolve(),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  /**
   * @description Put resource to server
   * @param collection
   * @param id Resource identifier
   * @param data Resource data
   * @returns resolved Promise containing response on success, rejects with HTTPErrorResponse
   */
  public putToServer(
    collection: SKResourceType,
    id: string,
    data: SKRoute | SKWaypoint | SKRegion | SKNote | SKChart
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .put(this.app.skApiVersion, `/resources/${collection}/${id}`, data)
        .subscribe(
          (res) => resolve(res),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  /**
   * @description Post resource to server
   * @param collection
   * @param data Resource data
   * @returns resolved Promise containing response on success, rejects with HTTPErrorResponse
   */
  public postToServer(
    collection: SKResourceType | 'tracks',
    data:
      | RouteResource
      | WaypointResource
      | RegionResource
      | NoteResource
      | ChartResource
      | any // track
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .post(this.app.skApiVersion, `/resources/${collection}`, data)
        .subscribe(
          (res) => resolve(res),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  /**
   * @description Fetch resource from Signal K server (used by getNotes).
   * @param collection The resource collection to which the resource belongs e.g. routes, waypoints, etc.
   * @param id  Resource identifier
   * @returns Observable<HttpResponse>
   * @deprecated Replaced by fromServer()
   */
  public fetchResource(collection: SKResourceType, id: string) {
    return this.signalk.api.get(
      this.app.skApiVersion,
      `/resources/${collection}/${id}`
    );
  }

  /** Submit new resource request to Signal K server.
   * @param collection The resource collection to which the resource belongs e.g. routes, waypoints, etc.
   * @param data  Signal K resource entry data.
   * @param select  determines if resource should be selected for display on map.
   * @returns Promise<boolean> Resolves true if successful, resolves false if error.
   * @deprecated Use postToServer
   */
  public postResource(collection: string, data: unknown, select?: boolean) {
    return new Promise((resolve) => {
      this.signalk.api
        .post(this.app.skApiVersion, `/resources/${collection}`, data)
        .subscribe(
          (res: { id: string }) => {
            if (select && this.app.config.selections[collection]) {
              this.app.config.selections[collection].push(res.id);
            }
            if (collection === 'routes') {
              this.app.data.buildRoute.show = false;
            }
            resolve(true);
          },
          (err: HttpErrorResponse) => {
            if (err.status && err.status === 401) {
              // unauthorised
              this.showAuth().subscribe((res) => {
                if (res.cancel) {
                  this.authResult();
                } else {
                  // ** authenticate
                  this.signalk.login(res.user, res.pwd).subscribe(
                    (r) => {
                      // ** authenticated
                      this.authResult(r['token']);
                      this.postResource(collection, data, select);
                    },
                    () => {
                      // ** auth failed
                      this.authResult();
                      this.showAuth();
                    }
                  );
                }
              });
            } else {
              this.app.showAlert(
                'ERROR:',
                `Could not add Resource!\n${err.error.message}`
              );
            }
            resolve(false);
          }
        );
    });
  }

  /** Submit update resource request to Signal K server.
   * @param collection The resource collection to which the resource belongs e.g. routes, waypoints, etc.
   * @param id Resource identifier
   * @param data  Signal K resource entry data.
   * @param select  determines if resource should be selected for display on map.
   * @returns Promise<boolean> Resolves true if successful, resolves false if error.
   * @deprecated Use putToServer
   */
  public putResource(
    collection: string,
    id: string,
    data: unknown,
    select?: boolean
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.signalk.api
        .put(this.app.skApiVersion, `/resources/${collection}/${id}`, data)
        .subscribe(
          () => {
            if (select && this.app.config.selections[collection]) {
              this.app.config.selections[collection].push(id);
            }
            if (collection === 'routes') {
              this.app.data.buildRoute.show = false;
            }
            resolve(true);
          },
          (err: HttpErrorResponse) => {
            if (err.status && err.status === 401) {
              // unauthorised
              this.showAuth().subscribe((res) => {
                if (res.cancel) {
                  this.authResult();
                } else {
                  // ** authenticate
                  this.signalk.login(res.user, res.pwd).subscribe(
                    (r) => {
                      // ** authenticated
                      this.authResult(r['token']);
                      this.putResource(collection, id, data, select);
                    },
                    () => {
                      // ** auth failed
                      this.authResult();
                      this.showAuth();
                    }
                  );
                }
              });
            } else {
              this.app.showAlert(
                'ERROR:',
                `Could not update Resource!\n${err.error.message}`
              );
            }
            resolve(false);
          }
        );
    });
  }

  /** Delete resource from server and update selections.
   * @param collection The resource collection to which the resource belongs e.g. routes, waypoints, etc.
   * @param id Resource identifier
   * @param refresh @optional If true refreshes charts collection
   * @returns Promise<boolean> Resolves true if successful, resolves false if error.
   * @deprecated Use deleteFromServer
   */
  public deleteResource(
    collection: string,
    id: string,
    refresh?: boolean
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.signalk.api
        .delete(this.app.skApiVersion, `/resources/${collection}/${id}`)
        .subscribe(
          () => {
            if (
              this.app.config.selections[collection] &&
              this.app.config.selections[collection].includes(id)
            ) {
              const idx = this.app.config.selections[collection].indexOf(id);
              this.app.config.selections[collection].splice(idx, 1);
            }
            if (refresh && collection === 'charts') {
              this.getCharts();
            }
            resolve(true);
          },
          (err: HttpErrorResponse) => {
            if (err.status && err.status === 401) {
              // unauthorised
              this.showAuth().subscribe((res) => {
                if (res.cancel) {
                  this.authResult();
                } else {
                  // ** authenticate
                  this.signalk.login(res.user, res.pwd).subscribe(
                    (r) => {
                      // ** authenticated
                      this.authResult(r['token']);
                      this.deleteResource(collection, id);
                    },
                    () => {
                      // ** auth failed
                      this.authResult();
                      this.showAuth();
                    }
                  );
                }
              });
            } else {
              this.app.showAlert(
                'ERROR:',
                `Could not delete Resource!\n${err.error.message}`
              );
            }
            resolve(false);
          }
        );
    });
  }

  /** Process Resource Delta message *
   * @param msg Array of PathValue objects
   */
  processDelta(msg: Array<PathValue>) {
    if (!Array.isArray(msg)) {
      return;
    }
    const action = {
      routes: false,
      waypoints: false,
      notes: false,
      regions: false
    };
    msg.forEach((item) => {
      const p = item.path.split('.');
      if (p.length === 3) {
        const collection = p[1];
        const id = p[2];
        const deleted = !item.value ? true : false;

        // in-scope resource types
        if (['waypoints', 'routes', 'notes', 'regions'].includes(collection)) {
          action[collection] = true;
          if (!deleted) {
            // check for existing entry
            if (!this.fromCache(collection as SKResourceType, id)) {
              // select to display new entry on map
              if (this.app.config.selections[collection]) {
                this.app.config.selections[collection].push(id);
                this.app.saveConfig();
              }
            }
          }
        }
      }
    });

    if (action['routes']) {
      this.getRoutes();
    }
    if (action['waypoints']) {
      this.getWaypoints();
    }
    if (action['regions']) {
      this.fetchRegions();
    }
    if (action['notes']) {
      this.getNotes();
    }
  }

  // ******** Course methods ****************************

  // ** course.activateRoute **
  activateRoute(
    id: string,
    activeId?: string,
    startPoint = 0,
    reverse = false
  ) {
    const context = activeId ? activeId : 'self';

    this.signalk.api
      .putWithContext(
        this.app.skApiVersion,
        context,
        'navigation/course/activeRoute',
        {
          href: `/resources/routes/${id}`,
          reverse: reverse,
          pointIndex: startPoint
        }
      )
      .subscribe(
        () => {
          this.app.debug('res.activateRoute()');
        },
        (err: HttpErrorResponse) => {
          if (err.status && err.status === 401) {
            this.showAuth().subscribe((res) => {
              if (res.cancel) {
                this.authResult();
              } else {
                // ** authenticate
                this.signalk.login(res.user, res.pwd).subscribe(
                  (r) => {
                    // ** authenticated
                    this.authResult(r['token']);
                    this.activateRoute(id, activeId, startPoint);
                  },
                  () => {
                    // ** auth failed
                    this.authResult();
                    this.showAuth();
                  }
                );
              }
            });
          } else {
            this.app.showAlert(
              'ERROR:',
              `Server could not activate route!\n${err.error.message}`
            );
          }
        }
      );
  }

  // ** clear course **
  clearCourse(activeId?: string) {
    const context = activeId ? activeId : 'self';

    this.signalk.api
      .delete(this.app.skApiVersion, `vessels/${context}/navigation/course`)
      .subscribe(
        () => {
          this.app.debug('res.clearDestination()');
        },
        (err: HttpErrorResponse) => {
          if (err.status && err.status === 401) {
            this.showAuth().subscribe((res) => {
              if (res.cancel) {
                this.authResult();
              } else {
                // ** authenticate
                this.signalk.login(res.user, res.pwd).subscribe(
                  (r) => {
                    // ** authenticated
                    this.authResult(r['token']);
                    this.clearCourse(activeId);
                  },
                  () => {
                    // ** auth failed
                    this.authResult();
                    this.showAuth();
                  }
                );
              }
            });
          } else {
            this.app.showAlert(
              'ERROR:',
              `Server could not clear destination / active route!\n${err.error.message}`
            );
          }
        }
      );
  }

  // ** course.destination **
  setDestination(href: string, activeId?: string);
  setDestination(pt: SKPosition, activeId?: string);
  setDestination(value, activeId?: string) {
    const context = activeId ? activeId : 'self';
    let v;
    if (typeof value === 'string') {
      //href
      v = { href: value };
    } else {
      // position
      v = { position: value };
    }
    this.signalk.api
      .putWithContext(
        this.app.skApiVersion,
        context,
        'navigation/course/destination',
        v
      )
      .subscribe(
        () => {
          this.app.debug(`res.setDestination()`);
        },
        (err: HttpErrorResponse) => {
          if (err.status && err.status === 401) {
            this.showAuth().subscribe((res) => {
              if (res.cancel) {
                this.authResult();
              } else {
                // ** authenticate
                this.signalk.login(res.user, res.pwd).subscribe(
                  (r) => {
                    // ** authenticated
                    this.authResult(r['token']);
                    this.setDestination(value, activeId);
                  },
                  () => {
                    // ** auth failed
                    this.authResult();
                    this.showAuth();
                  }
                );
              }
            });
          } else {
            this.app.showAlert(
              'ERROR:',
              `Server could not set destination!\n\n${err.error.message}\nEnsure vessel position is available.`
            );
          }
        }
      );
  }

  // ** course.restart **
  courseRestart(activeId?: string) {
    const context = activeId ? activeId : 'self';
    this.signalk.api
      .putWithContext(
        this.app.skApiVersion,
        context,
        'navigation/course/restart',
        null
      )
      .subscribe(
        () => {
          this.app.debug('res.courseRestart()');
        },
        (err: HttpErrorResponse) => {
          if (err.status && err.status === 401) {
            this.showAuth().subscribe((res) => {
              if (res.cancel) {
                this.authResult();
              } else {
                // ** authenticate
                this.signalk.login(res.user, res.pwd).subscribe(
                  (r) => {
                    // ** authenticated
                    this.authResult(r['token']);
                    this.courseRestart(activeId);
                  },
                  () => {
                    // ** auth failed
                    this.authResult();
                    this.showAuth();
                  }
                );
              }
            });
          }
        }
      );
  }

  // ** course.activeRoute.refresh **
  courseRefresh(activeId?: string) {
    const context = activeId ? activeId : 'self';
    this.signalk.api
      .putWithContext(
        this.app.skApiVersion,
        context,
        'navigation/course/activeRoute/refresh',
        null
      )
      .subscribe(
        () => {
          this.app.debug('res.courseRefresh()');
        },
        (err: HttpErrorResponse) => {
          if (err.status && err.status === 401) {
            this.showAuth().subscribe((res) => {
              if (res.cancel) {
                this.authResult();
              } else {
                // ** authenticate
                this.signalk.login(res.user, res.pwd).subscribe(
                  (r) => {
                    // ** authenticated
                    this.authResult(r['token']);
                    this.courseRefresh();
                  },
                  () => {
                    // ** auth failed
                    this.authResult();
                    this.showAuth();
                  }
                );
              }
            });
          } else {
            this.app.showAlert(
              'ERROR:',
              `Server could not restart course!\n${err.error.message}`
            );
          }
        }
      );
  }

  // ** course.activeRoute.reverse **
  courseReverse(activeId?: string) {
    const context = activeId ? activeId : 'self';
    this.signalk.api
      .putWithContext(
        this.app.skApiVersion,
        context,
        'navigation/course/activeRoute/reverse',
        null
      )
      .subscribe(
        () => {
          this.app.debug('res.courseReverse()');
        },
        (err: HttpErrorResponse) => {
          if (err.status && err.status === 401) {
            this.showAuth().subscribe((res) => {
              if (res.cancel) {
                this.authResult();
              } else {
                // ** authenticate
                this.signalk.login(res.user, res.pwd).subscribe(
                  (r) => {
                    // ** authenticated
                    this.authResult(r['token']);
                    this.courseRestart(activeId);
                  },
                  () => {
                    // ** auth failed
                    this.authResult();
                    this.showAuth();
                  }
                );
              }
            });
          } else {
            this.app.showAlert(
              'ERROR:',
              `Server could not reverse course!\n${err.error.message}`
            );
          }
        }
      );
  }

  // ** course.activeRoute.pointIndex **
  coursePointIndex(pointIndex: number, activeId?: string) {
    const context = activeId ? activeId : 'self';

    this.signalk.api
      .putWithContext(
        this.app.skApiVersion,
        context,
        `navigation/course/activeRoute/pointIndex`,
        {
          value: pointIndex
        }
      )
      .subscribe(
        () => undefined,
        (err: HttpErrorResponse) => {
          if (err.status && err.status === 401) {
            this.showAuth().subscribe((res) => {
              if (res.cancel) {
                this.authResult();
              } else {
                // ** authenticate
                this.signalk.login(res.user, res.pwd).subscribe(
                  (r) => {
                    // ** authenticated
                    this.authResult(r['token']);
                    this.coursePointIndex(pointIndex, activeId);
                  },
                  () => {
                    // ** auth failed
                    this.authResult();
                    this.showAuth();
                  }
                );
              }
            });
          } else {
            this.app.showAlert(
              'ERROR:',
              `Server could not set next point!\n${err.error.message}`
            );
          }
        }
      );
  }

  // ****************************************************

  // ** update resource selection data from config (used post server config load)
  alignResourceSelections(saveConfig = false) {
    // charts
    this.app.data.charts.forEach((i) => {
      i[2] = this.app.config.selections.charts.includes(i[0]) ? true : false;
    });
    // routes
    this.app.data.routes.forEach((i) => {
      i[2] = this.app.config.selections.routes.includes(i[0]) ? true : false;
    });
    // waypoints
    this.app.data.waypoints.forEach((i) => {
      i[2] = this.app.config.selections.waypoints.includes(i[0]) ? true : false;
    });

    if (saveConfig) {
      this.app.saveConfig();
    }
    this.updateSource.next({ action: 'selected', mode: 'chart' });
    this.updateSource.next({ action: 'selected', mode: 'route' });
    this.updateSource.next({ action: 'selected', mode: 'waypoint' });
  }

  // ** UI methods **
  routeSelected() {
    this.app.config.selections.routes = this.app.data.routes
      .filter((i) => i[2])
      .map((i) => i[0]);
    this.app.saveConfig();
    this.updateSource.next({ action: 'selected', mode: 'route' });
  }

  waypointSelected() {
    this.app.config.selections.waypoints = this.app.data.waypoints
      .filter((i) => i[2])
      .map((i) => i[0]);
    this.app.saveConfig();
    this.updateSource.next({ action: 'selected', mode: 'waypoint' });
  }

  noteSelected(e: { id: string; isGroup: boolean }) {
    if (e.isGroup) {
      this.showRelatedNotes(e.id, 'group');
    } else {
      this.showNoteInfo({ id: e.id });
    }
    this.updateSource.next({ action: 'selected', mode: 'note' });
  }

  aisSelected(e: string[] | null) {
    this.app.config.selections.aisTargets = e;
    this.app.saveConfig();
    this.updateSource.next({ action: 'selected', mode: 'ais' });
  }

  chartSelected() {
    this.app.config.selections.charts = this.app.data.charts
      .filter((i) => i[2])
      .map((i) => i[0]);
    // set map zoom extent
    this.setMapZoomRange();
    this.app.saveConfig();
    this.updateSource.next({ action: 'selected', mode: 'chart' });
  }

  chartOrder() {
    this.updateSource.next({ action: 'selected', mode: 'chart' });
  }

  // ** Set waypoint as nextPoint **
  navigateToWaypoint(e: { id: string }) {
    this.setDestination(`/resources/waypoints/${e.id}`);
  }

  // ** handle display resource properties **
  resourceProperties(r: { id: string; type: string }) {
    switch (r.type) {
      case 'waypoint':
        this.showWaypointEditor(r);
        break;
      case 'route':
        this.showRouteInfo(r);
        break;
      case 'note':
        this.showNoteInfo(r);
        break;
      case 'region':
        this.updateRegionInfo(r.id);
        break;
      case 'track':
        const track = this.trackCacheSignal().find(
          (trk: SKTrack) => trk.feature?.id === r.id
        );
        this.showTrackInfo(track);
        break;
    }
  }

  // **** TRACKS ****

  /** 
   @description Display Track properties dialog
   @param id Track
  */
  showTrackInfo(track: SKTrack) {
    if (!track) {
      this.app.showAlert('Error', 'Unable to retrieve Track details!');
      return;
    }
    this.dialog
      .open(TrackDialog, {
        disableClose: true,
        data: {
          // clone track for editing
          track: Object.assign(
            Object.create(Object.getPrototypeOf(track)),
            track
          )
        }
      })
      .afterClosed()
      .subscribe((r: { save: boolean; track: SKTrack }) => {
        if (r.save) {
          this.putResource('tracks', track.feature.id, track);
        }
      });
  }

  private trackCacheSignal = signal([]);
  readonly tracks = this.trackCacheSignal.asReadonly();

  /**
   * @description Sets selections list = null.
   * @param value true: set cache to unfiltered, false: set cache to filtered
   * @param  ids (optional) Array of track ids to add to selection list
   */
  trackCacheUnfilter(value: boolean, ids?: string[]) {
    const changed =
      (value && Array.isArray(this.app.config.selections.tracks)) ||
      (!value && !Array.isArray(this.app.config.selections.tracks));
    if (!changed) {
      return;
    }
    if (value) {
      this.app.config.selections.tracks = null;
    } else {
      this.app.config.selections.tracks = Array.isArray(ids) ? ids : [];
    }
    this.app.saveConfig();
    this.trackCacheRefresh();
  }

  /**
   * @description Returns if track cache is unfiltered.
   * @returns true: is filtered, false: not filtered.
   */
  trackCacheIsUnfiltered(): boolean {
    return !Array.isArray(this.app.config.selections.tracks);
  }

  /**
   * @description Loads the resource cache with only the tracks selected for display.
   * @returns Resolved Promise true: success, false: error.
   */
  trackCacheRefresh(): Promise<boolean> {
    return new Promise((resolve) => {
      this.signalk.api
        .get(this.app.skApiVersion, `/resources/tracks`)
        .subscribe(
          (tracks: Tracks) => {
            const tc = Object.entries(tracks)
              .map((trk: [string, TrackResource]) => {
                const track = new SKTrack(trk[1]);
                track.feature.id = trk[0].toString();
                return this.trackCacheIsUnfiltered() ||
                  this.app.config.selections.tracks?.includes(trk[0])
                  ? track
                  : null;
              })
              .filter((item: SKTrack) => {
                return item ? true : false;
              });
            this.trackCacheSignal.set(tc);
            resolve(true);
          },
          (error: HttpErrorResponse) => {
            resolve(false);
          }
        );
    });
  }

  /**
   * @param ids Array of track ids to from server into the cache
   */
  trackCacheFetchIds(ids: string[]) {
    if (!this.trackCacheIsUnfiltered()) {
      ids.forEach((id) => {
        if (!this.app.config.selections.tracks?.includes(id)) {
          this.app.config.selections.tracks.push(id);
        }
      });
    }
    this.trackCacheRefresh();
  }

  /**
   * @description Adds track to the resource cache and update selections list. Emits update$ event.
   * @param track Track(s)
   */
  trackCacheAdd(track: SKTrack | SKTrack[]) {
    const addItem = (track: SKTrack) => {
      if (!track.feature?.id) {
        return;
      }
      const etrk = tc.find(
        (item: SKTrack) => item.feature?.id === track.feature?.id
      );
      if (!etrk) {
        tc.push(track);
        if (
          !this.trackCacheIsUnfiltered() &&
          !this.app.config.selections.tracks?.includes(track.feature?.id)
        ) {
          this.app.config.selections.tracks.push(track.feature?.id);
        }
      }
    };

    const tc = [].concat(this.trackCacheSignal());
    if (Array.isArray(track)) {
      track.forEach((trk: SKTrack) => {
        addItem(trk);
      });
    } else {
      addItem(track);
    }
    this.app.saveConfig();
    this.trackCacheSignal.set(tc);
  }

  /**
   * @description Remove track from the resource cache and update selections list. Emits update$ event.
   * @param id Track identifier(s)
   */
  trackCacheRemove(id: string | string[]) {
    const removeItem = (id: string) => {
      let idx = tc.findIndex((item: SKTrack) => item.feature?.id === id);
      if (idx !== -1) {
        tc.splice(idx, 1);
      }
      if (!this.trackCacheIsUnfiltered()) {
        idx = this.app.config.selections.tracks.indexOf(id);
        if (idx !== -1) {
          this.app.config.selections.tracks.splice(idx, 1);
        }
      }
    };

    const tc = [].concat(this.trackCacheSignal());
    if (Array.isArray(id)) {
      id.forEach((tid: string) => {
        removeItem(tid);
      });
    } else {
      removeItem(id);
    }
    this.app.saveConfig();
    this.trackCacheSignal.set(tc);
  }

  /**
   * @description Clear track resource cache and update selections list. Emits update$ event.
   */
  trackCacheClear() {
    this.trackCacheSignal.set([]);
    if (!this.trackCacheIsUnfiltered()) {
      this.app.config.selections.tracks = [];
    }
    this.app.saveConfig();
  }

  /** get vessel trail from sk server */
  getVesselTrail() {
    this.app.fetchTrailFromServer();
  }

  // **** CHARTS ****

  /** calc aggregated min-max zoom from selected charts */
  setMapZoomRange(useDefault?: boolean) {
    const defaultExtent = {
      min: 2,
      max: 28
    };
    if (useDefault || !this.app.config.map.limitZoom) {
      this.app.MAP_ZOOM_EXTENT = defaultExtent;
    } else {
      const derivedExtent = {
        min: 1000,
        max: -1
      };
      this.app.data.charts.forEach((c) => {
        if (c[2]) {
          // selected
          if (c[1].minZoom < derivedExtent.min) {
            derivedExtent.min = c[1].minZoom;
          }
          if (c[1].maxZoom > derivedExtent.max) {
            derivedExtent.max = c[1].maxZoom;
          }
        }
        this.app.MAP_ZOOM_EXTENT.min =
          derivedExtent.min === 1000 ? defaultExtent.min : derivedExtent.min;
        this.app.MAP_ZOOM_EXTENT.max =
          derivedExtent.max === -1 ? defaultExtent.max : derivedExtent.max;
      });
      this.app.debug('*** MAP_ZOOM_EXTENT', this.app.MAP_ZOOM_EXTENT);
    }
  }

  // ** Confirm Chart Deletion **
  showChartDelete(e: { id: string }) {
    this.app
      .showConfirm(
        'Do you want to delete this Chart source?\n',
        'Delete Chart:',
        'YES',
        'NO'
      )
      .subscribe((result: { ok: boolean }) => {
        if (result && result.ok) {
          this.deleteResource('charts', e.id, true);
        }
      });
  }

  OSMCharts = [].concat(OSM);
  // ** get charts from sk server
  getCharts(apiVersion = this.app.config.chartApi ?? 1) {
    // fetch charts from server
    this.signalk.api.get(apiVersion, `/resources/charts`).subscribe(
      (res: Charts) => {
        this.app.data.charts = [];
        // add OpenSeaMap
        this.OSMCharts[1][2] = this.app.config.selections.charts.includes(
          'openseamap'
        )
          ? true
          : false;
        this.app.data.charts.push(this.OSMCharts[1]);

        const r = Object.entries(res);
        if (r.length > 0) {
          // ** process attributes
          r.forEach((i) => {
            // v1->2 alignment
            if (i[1].tilemapUrl) {
              i[1].url = i[1].tilemapUrl;
            }
            if (i[1].chartLayers) {
              i[1].layers = i[1].chartLayers;
            }
            if (i[1].serverType && !i[1].type) {
              i[1].type = i[1].serverType;
            }

            // test for SK chart record
            if (i[1].type) {
              // ** ensure host is in url
              if (
                i[1]['url'][0] === '/' ||
                i[1]['url'].slice(0, 4) !== 'http'
              ) {
                i[1]['url'] = this.app.host + i[1]['url'];
              }
              this.app.data.charts.push([
                i[0],
                new SKChart(i[1]),
                this.app.config.selections.charts.includes(i[0]) ? true : false
              ]);
            }
          });
          // ** sort by scale
          this.sortByScaleDesc();
        }
        // insert OStreetM at start of list
        this.OSMCharts[0][2] = this.app.config.selections.charts.includes(
          'openstreetmap'
        )
          ? true
          : false;
        this.app.data.charts.unshift(this.OSMCharts[0]);

        // ** clean up selections
        this.app.config.selections.charts = this.app.data.charts
          .map((i: [string, SKChart, boolean]) => {
            return i[2] ? i[0] : null;
          })
          .filter((i: string) => {
            return i;
          });

        // arrange the chart layers
        this.arrangeChartLayers();

        // set map zoom extent
        this.setMapZoomRange();

        // emit update
        this.updateSource.next({ action: 'get', mode: 'chart' });
      },
      () => {
        const dc = [];
        // insert OStreetM at start of list
        this.OSMCharts[0][2] = this.app.config.selections.charts.includes(
          'openstreetmap'
        )
          ? true
          : false;
        dc.push(this.OSMCharts[0]);
        // add OpenSeaMap
        this.OSMCharts[1][2] = this.app.config.selections.charts.includes(
          'openseamap'
        )
          ? true
          : false;
        dc.push(this.OSMCharts[1]);
        this.app.data.charts = dc;
        // set map zoom extent
        this.setMapZoomRange();
      }
    );
  }

  // ** sort charts by scale descending .
  private sortByScaleDesc() {
    this.app.data.charts.sort((a: [string, SKChart], b: [string, SKChart]) => {
      return b[1].scale - a[1].scale;
    });
  }

  // ** arrange charts by layer order.
  public arrangeChartLayers() {
    const chartOrder = this.app.config.selections.chartOrder;
    if (chartOrder && Array.isArray(chartOrder) && chartOrder.length !== 0) {
      for (let destidx = 0; destidx < chartOrder.length; destidx++) {
        let srcidx = -1;
        let idx = 0;
        this.app.data.charts.forEach((c: [string, SKChart]) => {
          if (c[0] === chartOrder[destidx]) {
            srcidx = idx;
          }
          idx++;
        });
        if (srcidx !== -1) {
          moveItemInArray(this.app.data.charts, srcidx, destidx + 1);
        }
      }
    }
  }

  // **** ROUTES ****

  // v2 transformation
  transformRoute(r: RouteResource, id: string): RouteResource {
    // parse as v2
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (r as any).start !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (r as any).start;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (r as any).end !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (r as any).end;
    }
    if (typeof r.name === 'undefined') {
      r.name = 'Rte-' + id.slice(-6);
    }
    if (typeof r.feature?.properties?.points !== 'undefined') {
      // check for v2 array
      if (!Array.isArray(r.feature.properties.points)) {
        // legacy format
        if (
          r.feature.properties.points.names &&
          Array.isArray(r.feature.properties.points.names)
        ) {
          const pts = [];
          r.feature.properties.points.names.forEach((pt: string) => {
            if (pt) {
              pts.push({ name: pt });
            } else {
              pts.push({ name: '' });
            }
          });
          r.feature.properties.coordinatesMeta = pts;
          delete r.feature.properties.points;
        }
      }
    }
    // ensure coords & coordsMeta array lengths are aligned
    if (
      r.feature.properties.coordinatesMeta &&
      r.feature.properties.coordinatesMeta.length !==
        r.feature.geometry.coordinates.length
    ) {
      delete r.feature.properties.coordinatesMeta;
    }
    return r;
  }

  // ** get routes from sk server
  getRoutes() {
    this.signalk.api
      .get(this.app.skApiVersion, '/resources/routes')
      .subscribe((res: Routes) => {
        this.app.data.routes = [];
        if (!res) {
          return;
        }

        Object.entries(res).forEach((i: [string, RouteResource]) => {
          i[1] = this.transformRoute(i[1], i[0]);
          this.app.data.routes.push([
            i[0],
            new SKRoute(i[1]),
            i[0] === this.app.data.activeRoute
              ? true
              : this.app.config.selections.routes.includes(i[0])
          ]);
          if (i[0] === this.app.data.activeRoute) {
            this.app.data.navData.activeRoutePoints =
              i[1].feature.geometry.coordinates;
            this.app.data.navData.pointTotal =
              i[1].feature.geometry.coordinates.length;
            this.app.data.navData.pointNames =
              i[1].feature.properties.points &&
              i[1].feature.properties.points['names'] &&
              Array.isArray(i[1].feature.properties['points']['names'])
                ? i[1].feature.properties.points['names']
                : [];
            if (!this.app.config.selections.routes.includes(i[0])) {
              this.app.config.selections.routes.push(i[0]);
            }
          }
        });
        // ** clean up selections
        const k = Object.keys(res);
        this.app.config.selections.routes = this.app.config.selections.routes
          .map((i: string) => {
            return k.indexOf(i) !== -1 ? i : null;
          })
          .filter((i: string) => {
            return i;
          });
        this.updateSource.next({ action: 'get', mode: 'route' });
      });
  }

  // ** build and return object containing: SKRoute
  buildRoute(coordinates: LineString): [string, SKRoute] {
    const rte = new SKRoute();
    const rteUuid = this.signalk.uuid;
    rte.feature.geometry.coordinates = GeoUtils.normaliseCoords(coordinates);
    rte.distance = GeoUtils.routeLength(rte.feature.geometry.coordinates);
    return [rteUuid, rte];
  }

  // Modify Route point coordinates & refrsh course
  updateRouteCoords(
    id: string,
    coords: Array<Position>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    coordsMeta?: Array<any>
  ) {
    const t = this.fromCache('routes', id);
    if (!t) {
      return;
    }
    const rte = t[1];
    rte['feature']['geometry']['coordinates'] =
      GeoUtils.normaliseCoords(coords);
    rte.distance = GeoUtils.routeLength(rte.feature.geometry.coordinates);

    if (coordsMeta) {
      rte['feature']['properties']['coordinatesMeta'] = coordsMeta;
    }
    this.putResource('routes', id, rte);
  }

  // Return array of route coordinates
  getActiveRouteCoords(routeId?: string) {
    if (!routeId) {
      routeId = this.app.data.activeRoute;
    }
    const rte = this.fromCache('routes', routeId);
    if (!rte) {
      return [];
    } else {
      return rte[1].feature.geometry.coordinates;
    }
  }

  // ** Display Edit Route properties Dialog **
  showRouteInfo(e: { id: string }) {
    const t = this.fromCache('routes', e.id);
    if (!t) {
      return;
    }

    this.dialog
      .open(RouteDialog, {
        disableClose: true,
        data: {
          // clone route for editing
          route: Object.assign(Object.create(Object.getPrototypeOf(t[1])), t[1])
        }
      })
      .afterClosed()
      .subscribe((r: { save: boolean; route: SKRoute }) => {
        if (r.save) {
          this.putResource('routes', e.id, r.route);
        }
      });
  }

  // ** Display New Route properties Dialog **
  showRouteNew(e: {
    coordinates: LineString;
    meta?: Array<{ href?: string; name?: string }>;
  }) {
    if (!e.coordinates) {
      return;
    }
    const rte = this.buildRoute(e.coordinates);
    if (e.meta && Array.isArray(e.meta)) {
      rte[1].feature.properties.coordinatesMeta = e.meta;
    }

    this.dialog
      .open(RouteDialog, {
        disableClose: true,
        data: {
          route: rte[1]
        }
      })
      .afterClosed()
      .subscribe((r: { save: boolean; route: SKRoute }) => {
        if (r.save) {
          this.putResource('routes', rte[0], r.route);
        }
      });
  }

  // ** Confirm Route Deletion **
  showRouteDelete(e: { id: string }) {
    // are there notes attached?
    this.signalk.api
      .get(
        this.app.skApiVersion,
        `/resources/notes?href=/resources/routes/${e.id}`
      )
      .subscribe((notes: Notes) => {
        let checkText: string;
        const na = Object.keys(notes);
        if (na.length !== 0) {
          checkText = 'Check to also delete attached Notes.';
        }
        this.app
          .showConfirm(
            'Do you want to delete this Route from the server?\n',
            'Delete Route:',
            'YES',
            'NO',
            checkText
          )
          .subscribe((result: { ok: boolean; checked: boolean }) => {
            if (result && result.ok) {
              this.deleteResource('routes', e.id);
              if (result.checked) {
                na.forEach((id) => {
                  this.deleteNote(id);
                });
              }
            }
          });
      });
  }

  // **** WAYPOINTS ****

  // ** build and return SKWaypoint object with supplied coordinates
  buildWaypoint(coordinates: Position): [string, SKWaypoint] {
    const wpt = new SKWaypoint();
    const wptUuid = this.signalk.uuid;

    wpt.feature.geometry.coordinates = GeoUtils.normaliseCoords(coordinates);
    return [wptUuid, wpt];
  }

  // v2 transformation
  transformWaypoint(w: WaypointResource, id: string): WaypointResource {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (w as any).position !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (w as any).position;
    }
    if (!w.name) {
      if (w.feature.properties.name) {
        w.name = w.feature.properties.name;
        delete w.feature.properties.name;
      } else {
        const name = 'Wpt-' + id.slice(-6);
        w.name = name;
      }
    }
    if (!w.description) {
      if (w.feature.properties.description) {
        w.description = w.feature.properties.description;
        delete w.feature.properties.description;
      } else if (w.feature.properties.cmt) {
        w.description = w.feature.properties.cmt;
      }
    }
    if (w.feature.properties.skType) {
      w.type = w.feature.properties.skType;
      delete w.feature.properties.skType;
    }
    if (w.type) {
      w.type = w.type.toLowerCase();
    }
    return w;
  }

  // ** get waypoints from sk server
  getWaypoints() {
    this.signalk.api
      .get(this.app.skApiVersion, '/resources/waypoints')
      .subscribe((res: Waypoints) => {
        this.app.data.waypoints = [];
        if (!res) {
          return;
        }
        Object.entries(res).forEach((i: [string, WaypointResource]) => {
          i[1] = this.transformWaypoint(i[1], i[0]);
          this.app.data.waypoints.push([
            i[0],
            new SKWaypoint(i[1]),
            i[0] === this.app.data.activeWaypoint
              ? true
              : this.app.config.selections.waypoints.includes(i[0])
          ]);
          if (i[0] === this.app.data.activeWaypoint) {
            this.app.config.selections.waypoints.push(i[0]);
          }
        });
        // ** clean up selections
        const k = Object.keys(res);
        this.app.config.selections.waypoints =
          this.app.config.selections.waypoints
            .map((i) => {
              return k.indexOf(i) !== -1 ? i : null;
            })
            .filter((i) => {
              return i;
            });
        this.updateSource.next({ action: 'get', mode: 'waypoint' });
      });
  }

  // ** delete waypoint on server **
  private deleteWaypoint(id: string) {
    this.deleteResource('waypoints', id);
  }

  // ** modify waypoint point coordinates **
  updateWaypointPosition(id: string, position: Position) {
    const t = this.fromCache('waypoints', id);
    if (!t) {
      return;
    }
    const wpt = t[1];
    wpt['feature']['geometry']['coordinates'] =
      GeoUtils.normaliseCoords(position);
    wpt['position'] = {
      latitude: wpt['feature']['geometry']['coordinates'][1],
      longitude: wpt['feature']['geometry']['coordinates'][0]
    };
    this.putResource('waypoints', id, wpt);
  }

  // ** Display waypoint properties Dialog **
  showWaypointEditor(
    e: { id?: string; position?: Position } = null,
    position: Position = null
  ) {
    let resId = this.signalk.uuid;
    let title: string;
    let wpt: SKWaypoint;
    let addMode = true;

    if (!e) {
      // ** add at vessel location
      if (!position) {
        return;
      }
      wpt = new SKWaypoint();
      wpt.feature.geometry.coordinates = GeoUtils.normaliseCoords(position);
      title = 'New waypoint:';
      wpt.name = `Wpt-${Date.now().toString().slice(-5)}`;
      wpt.description = '';
    } else if (!e.id && e.position) {
      // add at provided position
      wpt = new SKWaypoint();
      wpt.feature.geometry.coordinates = GeoUtils.normaliseCoords(e.position);
      title = 'Drop waypoint:';
      wpt.name = ``;
      wpt.description = '';
    } else {
      // Edit waypoint details
      resId = e.id;
      title = 'Waypoint Details:';
      const w = this.fromCache('waypoints', resId);
      if (!w) {
        return;
      }
      // clone of chached resource
      wpt = Object.assign(Object.create(Object.getPrototypeOf(w[1])), w[1]);
      addMode = false;
    }

    this.dialog
      .open(WaypointDialog, {
        disableClose: true,
        data: {
          title: title,
          addMode: addMode,
          waypoint: wpt
        }
      })
      .afterClosed()
      .subscribe((r: { save: boolean; waypoint: SKWaypoint }) => {
        if (r.save) {
          // ** save / update waypoint **
          this.putResource('waypoints', resId, r.waypoint, addMode);
        }
      });
  }

  // ** Confirm Waypoint Deletion **
  showWaypointDelete(e: { id: string }) {
    // are there notes attached?
    this.signalk.api
      .get(
        this.app.skApiVersion,
        `/resources/notes?href=/resources/waypoints/${e.id}`
      )
      .subscribe(
        (notes: Notes) => {
          let checkText: string;
          const na = Object.keys(notes);
          if (na.length !== 0) {
            checkText = 'Check to also delete attached Notes.';
          }
          this.app
            .showConfirm(
              'Do you want to delete this Waypoint from the server?\n',
              'Delete Waypoint:',
              'YES',
              'NO',
              checkText
            )
            .subscribe((result: { ok: boolean; checked: boolean }) => {
              if (result && result.ok) {
                this.deleteWaypoint(e.id);
                if (result.checked) {
                  na.forEach((id) => {
                    this.deleteNote(id);
                  });
                }
              }
            });
        },
        () => {
          this.app.showAlert('Server returned an error!', 'Error:');
        }
      );
  }

  // **** REGIONS ****

  private regionCacheSignal = signal([]);
  readonly regions = this.regionCacheSignal.asReadonly();

  /**
   * @description Refresh Regions cache. Called after fetch from server.
   * @param regions Response object from Signal K server
   */
  private regionCacheRefresh(regions: Regions) {
    const rc = Object.entries(regions).map((item: [string, RegionResource]) => {
      return [item[0], this.transformRegion(item[1], item[0]), true];
    });
    this.regionCacheSignal.set(rc);
  }

  /**
   * @description Fill cache with regions fetched from sk server
   * @param query Filter criteris for regions in placed in the cache
   */
  fetchRegions(query?: string) {
    query =
      query ??
      processUrlTokens(
        this.app.config.resources.notes.rootFilter,
        this.app.config
      );
    if (query && query[0] !== '?') {
      query = '?' + query;
    }
    this.app.debug(`**query: ${query}`);
    this.cacheRefresh('regions', query);
  }

  /**
   * @description Signal K v2 API transformation
   * @param region Region entry from server
   * @param id Resource id
   * @returns SKRegion object
   */
  private transformRegion(region: RegionResource, id: string): SKRegion {
    if (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (region as any).geohash !== 'undefined' &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (region as any).geohash === 'string'
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gh = ngeohash.decode_bbox((region as any).geohash);
      const reg = new SKRegion();
      reg.name = 'Region-' + id.slice(-6);
      reg.feature.geometry.coordinates = [
        [
          [gh[1], gh[0]],
          [gh[3], gh[0]],
          [gh[3], gh[2]],
          [gh[1], gh[2]],
          [gh[1], gh[0]]
        ]
      ];
      return reg;
    } else {
      return new SKRegion(region);
    }
  }

  /**
   * @description Create new Region entry on server
   * @param region
   */
  createRegion(region: SKRegion) {
    if (!region) {
      return;
    }
    this.dialog
      .open(RegionDialog, {
        disableClose: true,
        data: {
          region: region
        }
      })
      .afterClosed()
      .subscribe(async (r: { save: boolean; region: RegionResource }) => {
        if (r.save) {
          this.postToServer('regions', r.region).catch((err) =>
            this.app.parseHttpErrorResponse(err)
          );
        }
      });
  }

  /**
   * @description Update Region coordinates and push to server
   * @param id Region identifier
   * @param coords Coordinates to assign to region
   */
  updateRegionCoords(id: string, coords: Array<Array<Position>>) {
    const region = this.fromCache('regions', id)[1];
    region['feature']['geometry']['coordinates'] =
      GeoUtils.normaliseCoords(coords);
    this.putToServer('regions', id, region).catch((err) => {
      this.fetchRegions();
      this.app.parseHttpErrorResponse(err);
    });
  }

  /**
   * @description Display dialog to edit Region properties
   * @param id region identifier
   */
  async updateRegionInfo(id: string) {
    if (!id) {
      return;
    }
    let region: SKRegion;
    try {
      this.app.sIsFetching.set(true);
      region = await this.fromServer('regions', id);
      this.app.sIsFetching.set(false);
    } catch (err) {
      this.app.sIsFetching.set(false);
      this.app.parseHttpErrorResponse(err as HttpErrorResponse);
      return;
    }
    this.dialog
      .open(RegionDialog, {
        disableClose: true,
        data: {
          region: region
        }
      })
      .afterClosed()
      .subscribe((r: { save: boolean; region: SKRegion }) => {
        if (r.save) {
          this.putToServer('regions', id, r.region).catch((err) =>
            this.app.parseHttpErrorResponse(err)
          );
        }
      });
  }

  /**
   * @description Confirm Region Deletion
   * @param id Object containgin region identifier
   */
  confirmRegionDelete(id: string) {
    // are there notes attached?
    this.signalk.api
      .get(
        this.app.skApiVersion,
        `/resources/notes?href=/resources/regions/${id}`
      )
      .subscribe((notes: Notes) => {
        let checkText: string;
        const na = Object.keys(notes);
        if (na.length !== 0) {
          checkText = 'Check to also delete attached Notes.';
        }
        this.app
          .showConfirm(
            'Do you want to delete this Region from the server?\n',
            'Delete Region:',
            'YES',
            'NO',
            checkText
          )
          .subscribe((result: { ok: boolean; checked: boolean }) => {
            if (result && result.ok) {
              this.deleteFromServer('regions', id)
                .then(() => {
                  // refresh cache
                  this.cacheRemove('regions', id);
                  if (result.checked) {
                    // remove linked notes
                    na.forEach((noteId: string) => {
                      this.deleteResource('notes', noteId);
                    });
                  }
                })
                .catch((err: HttpErrorResponse) =>
                  this.app.parseHttpErrorResponse(err)
                );
            }
          });
      });
  }

  // **** NOTES ****

  // ** get notes / regions from sk server
  getNotes(params?: string) {
    let query = params ? params : this.app.config.resources.notes.rootFilter;
    query = processUrlTokens(query, this.app.config);
    if (query && query[0] !== '?') {
      query = '?' + query;
    }
    this.app.debug(`**query: ${query}`);
    query = query ?? '';
    // fetch notes
    const skf = this.signalk.api.get(
      this.app.skApiVersion,
      `/resources/notes${query}`
    );

    skf?.subscribe((res: Notes) => {
      this.app.data.notes = this.processNotes(res, true, 300);
      this.updateSource.next({ action: 'get', mode: 'note' });
    });

    // fetch regions
    this.fetchRegions(query);
  }

  // v2 transformation
  transformNote(n: NoteResource, id: string): NoteResource {
    // replace title with name
    if (!n.name) {
      n.name = n['title'] ?? 'Note-' + id.slice(-6);
      if (n['title']) {
        delete n['title'];
      }
    }
    if (!n.href) {
      n.href = n['region'] ?? null;
      if (n['region']) {
        delete n['region'];
      }
      if (n.href && n.href.indexOf('resources/') !== -1) {
        const a = n.href.split('/');
        const h = a[a.length - 1].split(':').slice(-1)[0];
        a[a.length - 1] = h;
        n.href = a.join('/');
      }
    }
    if (typeof n['properties'] === 'undefined') {
      n['properties'] = {};
    }
    if (typeof n.position === 'undefined') {
      if (typeof n['geohash'] !== 'undefined') {
        // replace geohash with position
        const gh = ngeohash.decode(n['geohash']);
        n.position = { latitude: gh.latitude, longitude: gh.longitude };
        delete n['geohash'];
      }
    }
    // only one of href || position (href has priority)
    /*if (typeof n.position !== 'undefined' && typeof n.href !== 'undefined') {
      if (n.href) {
        delete n.position;
      } else {
        delete n.href;
      }
    }*/
    return n;
  }

  /** Process SKNotes objects returned from server.
    @param noDesc: true = remove description value
    @param maxCount: max number of entries to return
    @returns Array of SKNotes 
  */
  private processNotes(n: Notes, noDesc = false, maxCount?: number): FBNotes {
    let r = Object.entries(n);
    const notes: FBNotes = [];
    // ** set an upper limit of records to process **
    if (maxCount && r.length > maxCount) {
      r = r.slice(0, maxCount - 1);
    }
    r.forEach((i: [string, NoteResource]) => {
      if (noDesc) {
        i[1]['description'] = null;
      }
      i[1] = this.transformNote(i[1], i[0]);
      if (typeof i[1]['position'] !== 'undefined') {
        notes.push([i[0], new SKNote(i[1] as NoteResource), true]);
      }
    });
    return notes;
  }

  // ** create note on server **
  private createNote(note: SKNote) {
    this.signalk.api
      .post(this.app.skApiVersion, `/resources/notes`, note)
      .subscribe(
        () => {
          this.reopenRelatedDialog();
        },
        (err: HttpErrorResponse) => {
          if (err.status && err.status === 401) {
            this.showAuth().subscribe((res) => {
              if (res.cancel) {
                this.authResult();
              } else {
                // ** authenticate
                this.signalk.login(res.user, res.pwd).subscribe(
                  (r) => {
                    // ** authenticated
                    this.authResult(r['token']);
                    this.createNote(note);
                  },
                  () => {
                    // ** auth failed
                    this.authResult();
                    this.showAuth();
                  }
                );
              }
            });
          } else {
            this.app.showAlert(
              `ERROR:`,
              `Server could not add Note!\n${err.error.message}`
            );
          }
        }
      );
  }
  // ** update note on server **
  private updateNote(id: string, note: SKNote) {
    this.signalk.api
      .put(this.app.skApiVersion, `/resources/notes/${id}`, note)
      .subscribe(
        () => {
          this.reopenRelatedDialog();
        },
        (err: HttpErrorResponse) => {
          if (err.status && err.status === 401) {
            this.showAuth().subscribe((res) => {
              if (res.cancel) {
                this.authResult();
              } else {
                // ** authenticate
                this.signalk.login(res.user, res.pwd).subscribe(
                  (r) => {
                    // ** authenticated
                    this.authResult(r['token']);
                    this.updateNote(id, note);
                  },
                  () => {
                    // ** auth failed
                    this.authResult();
                    this.showAuth();
                  }
                );
              }
            });
          } else {
            this.app.showAlert(
              `ERROR:`,
              `Server could not update Note!\n${err.error.message}`
            );
          }
        }
      );
  }

  // ** delete note on server **
  private deleteNote(id: string) {
    this.signalk.api
      .delete(this.app.skApiVersion, `/resources/notes/${id}`)
      .subscribe(
        () => {
          this.reopenRelatedDialog();
        },
        (err: HttpErrorResponse) => {
          if (err.status && err.status === 401) {
            this.showAuth().subscribe((res) => {
              if (res.cancel) {
                this.authResult();
              } else {
                // ** authenticate
                this.signalk.login(res.user, res.pwd).subscribe(
                  (r) => {
                    // ** authenticated
                    this.authResult(r['token']);
                    this.deleteNote(id);
                  },
                  () => {
                    // ** auth failed
                    this.authResult();
                    this.showAuth();
                  }
                );
              }
            });
          } else {
            this.app.showAlert(
              `ERROR:`,
              `Server could not delete Note!\n${err.error.message}`
            );
          }
        }
      );
  }

  // ** Open Note for editing **
  private openNoteForEdit(e) {
    this.dialog
      .open(NoteDialog, {
        disableClose: true,
        data: {
          note: e.note,
          editable: e.editable,
          addNote: e.addNote,
          title: e.title
        }
      })
      .afterClosed()
      .subscribe((r) => {
        if (r.result) {
          // ** save / update **
          const note = r.data;
          if (!e.noteId) {
            // add note
            this.createNote(note);
          } else {
            // update note
            this.updateNote(e.noteId, note);
          }
        } else {
          // cancel
          this.reopenRelatedDialog();
        }
      });
  }

  // ** reopen last related dialog **
  private reopenRelatedDialog(noReset = false) {
    if (this.reOpen && this.reOpen.key) {
      this.showRelatedNotes(
        this.reOpen.value,
        this.reOpen.key,
        this.reOpen.readOnly
      );
      if (noReset) {
        return;
      } else {
        this.reOpen = { key: null, value: null, readOnly: undefined };
      }
    }
  }

  // ** Show Related Notes dialog **
  showRelatedNotes(
    id: string,
    relatedBy = 'region',
    readOnly: boolean = false
  ) {
    let paramName: string;
    if (relatedBy !== 'group') {
      id = id.indexOf(relatedBy) === -1 ? `/resources/${relatedBy}s/${id}` : id;
      paramName = 'href';
    } else {
      paramName = relatedBy;
    }
    this.app.sIsFetching.set(true);
    this.signalk.api
      .get(this.app.skApiVersion, `/resources/notes?${paramName}=${id}`)
      .subscribe(
        (res: Notes) => {
          this.app.sIsFetching.set(false);
          const notes = [];
          Object.entries(res).forEach((i) => {
            i[1] = this.transformNote(i[1], i[0]);
            notes.push([i[0], new SKNote(i[1]), true]);
          });
          this.dialog
            .open(RelatedNotesDialog, {
              disableClose: true,
              data: { notes: notes, relatedBy: relatedBy, readOnly: readOnly }
            })
            .afterClosed()
            .subscribe((r) => {
              if (r.result) {
                if (relatedBy) {
                  this.reOpen = {
                    key: relatedBy,
                    value: id,
                    readOnly: readOnly
                  };
                } else {
                  this.reOpen = { key: null, value: null, readOnly: undefined };
                }
                switch (r.data) {
                  case 'edit':
                    this.showNoteEditor({ id: r.id });
                    break;
                  case 'add':
                    if (relatedBy === 'group') {
                      this.updateSource.next({
                        action: 'new',
                        mode: 'note',
                        group: id
                      });
                    } else {
                      this.showNoteEditor({
                        type: relatedBy,
                        href: { id: id, exists: true }
                      });
                    }
                    break;
                  case 'delete':
                    this.showNoteDelete({ id: r.id });
                    break;
                }
              }
            });
        },
        () => {
          this.app.sIsFetching.set(false);
          this.app.showAlert(
            'ERROR',
            'Unable to retrieve Notes for specified Region!'
          );
        }
      );
  }

  // ** Add / Update Note Dialog
  showNoteEditor(e = null) {
    let note: SKNote;
    const data = {
      noteId: null,
      note: null,
      editable: true,
      addNote: true,
      title: null,
      region: null,
      createRegion: null
    };

    if (!e) {
      return;
    }
    if (!e.id && e.position) {
      // add note at provided position
      data.title = 'Add Note';
      note = new SKNote();
      if (e.group) {
        note.group = e.group;
      }
      e.position = GeoUtils.normaliseCoords(e.position);
      note.position = { latitude: e.position[1], longitude: e.position[0] };
      note.name = '';
      note.description = '';
      data.note = note;
      this.openNoteForEdit(data);
    } else if (!e.id && !e.position && e.group) {
      // add note in provided group with no position
      data.title = 'Add Note to Group';
      note = new SKNote();
      if (e.group) {
        note.group = e.group;
      }
      note.position = null;
      note.name = '';
      note.description = '';
      data.note = note;
      this.openNoteForEdit(data);
    } else if (!e.id && e.href) {
      // add note to exisitng resource or new/existing region
      note = new SKNote();
      note.href =
        e.href.id.indexOf(e.type) === -1
          ? `/resources/${e.type}s/${e.href.id}`
          : e.href.id;
      note.name = '';
      note.description = '';

      data.title = `Add Note to ${e.type}`;
      data.region = e.href;
      data.note = note;
      data.createRegion = e.href.exists
        ? false
        : e.type === 'region'
        ? true
        : false;
      this.openNoteForEdit(data);
    } else {
      // edit selected note details
      this.app.sIsFetching.set(true);
      this.fetchResource('notes', e.id).subscribe(
        (res) => {
          this.app.sIsFetching.set(false);
          // ** note data
          res = this.transformNote(res as NoteResource, e.id);
          data.noteId = e.id;
          data.title = 'Edit Note';
          data.note = res;
          data.addNote = false;
          this.openNoteForEdit(data);
        },
        () => {
          this.app.sIsFetching.set(false);
          this.app.showAlert('ERROR', 'Unable to retrieve Note!');
        }
      );
    }
  }

  // ** Note info Dialog **
  showNoteInfo(e: { id: string }) {
    this.app.sIsFetching.set(true);
    this.fetchResource('notes', e.id).subscribe(
      (res: NoteResource) => {
        this.app.sIsFetching.set(false);
        res = this.transformNote(res as NoteResource, e.id);
        this.dialog
          .open(NoteDialog, {
            disableClose: true,
            data: { note: res, editable: false }
          })
          .afterClosed()
          .subscribe((r) => {
            if (r.result) {
              // ** open in tab **
              if (r.data === 'url') {
                window.open(res['url'], 'note');
              }
              if (r.data === 'edit') {
                this.showNoteEditor({ id: e.id });
              }
              if (r.data === 'delete') {
                this.showNoteDelete({ id: e.id });
              }
              if (r.data === 'group') {
                this.showRelatedNotes(r.value, r.data);
              }
            }
          });
      },
      () => {
        this.app.sIsFetching.set(false);
        this.app.showAlert('ERROR', 'Unable to retrieve Note!');
      }
    );
  }

  // ** confirm Note Deletion **
  showNoteDelete(e: { id: string }) {
    this.app
      .showConfirm(
        'Do you want to delete this Note from the server?\n',
        'Delete Note:',
        'YES',
        'NO'
      )
      .subscribe((ok) => {
        if (ok) {
          this.deleteNote(e.id);
        } else {
          this.reopenRelatedDialog();
        }
      });
  }

  // ** modify Note position **
  updateNotePosition(id: string, position: Position) {
    const t = this.fromCache('notes', id);
    if (!t) {
      return;
    }
    const note = t[1];
    position = GeoUtils.normaliseCoords(position);
    note['position'] = { latitude: position[1], longitude: position[0] };
    this.updateNote(id, note);
  }

  // *******************************

  // ** show login dialog **
  private showAuth(message?: string) {
    return this.dialog
      .open(LoginDialog, {
        disableClose: true,
        data: { message: message || 'Login to Signal K server.' }
      })
      .afterClosed();
  }

  // ** record authentication token **
  private authResult(token: string = null) {
    this.app.persistToken(token);
  }
}
