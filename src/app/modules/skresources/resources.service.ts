import { Injectable } from '@angular/core';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { Subject, Observable } from 'rxjs';
import ngeohash from 'ngeohash';

import { SignalKClient } from 'signalk-client-angular';
import { AppInfo, OSM } from 'src/app/app.info';
import { GeoUtils } from 'src/app/lib/geoutils';
import { Convert } from 'src/app/lib/convert';

import { LoginDialog } from 'src/app/lib/components/dialogs';
import { NoteDialog, RelatedNotesDialog } from '.';
import { ResourceDialog } from './components/resource-dialog';
import { SKResourceSet } from '.';

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
  Regions
} from 'src/app/types';
import { PathValue } from '@signalk/server-api';

// ** Signal K resource operations
@Injectable({ providedIn: 'root' })
export class SKResources {
  private reOpen: { key?: string; value?: string };
  private updateSource: Subject<unknown> = new Subject<unknown>();

  constructor(
    public dialog: MatDialog,
    public signalk: SignalKClient,
    public app: AppInfo
  ) {}

  // ** Observables **
  public update$(): Observable<unknown> {
    return this.updateSource.asObservable();
  }

  // ******** Resource cache operations ********************

  /** Retrieve cached resource entry (app.data)
   * @params collection Resource collection to use (e.g. routes, etc.)
   * @params id Resource identifier
   * @returns resource entry
   */
  public fromCache(collection: string, id: string) {
    if (
      !this.app.data[collection] ||
      !Array.isArray(this.app.data[collection])
    ) {
      return;
    }
    const item = this.app.data[collection].filter(
      (i: [string, SKRegion]) => i[0] === id
    );
    return item.length === 0 ? undefined : item[0];
  }

  /** Retrieve cached Resource Set | feature at index (app.data)
   * @params id Map feature id.
   * @params getFeature  true = return Feature entry, false = return whole RecordSet
   * @returns Feature OR Resource Set.
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

  /** Submit new resource request to Signal K server.
   * @param collection The resource collection to which the resource belongs e.g. routes, waypoints, etc.
   * @param data  Signal K resource entry data.
   * @param select  determines if resource should be selected for display on map.
   */
  public postResource(collection: string, data: unknown, select?: boolean) {
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
        }
      );
  }

  /** Submit update resource request to Signal K server.
   * @param collection The resource collection to which the resource belongs e.g. routes, waypoints, etc.
   * @param id Resource identifier
   * @param data  Signal K resource entry data.
   * @param select  determines if resource should be selected for display on map.
   */
  public putResource(
    collection: string,
    id: string,
    data: unknown,
    select?: boolean
  ) {
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
        }
      );
  }

  /** Submit delete resource request to Signal K server.
   * @param collection The resource collection to which the resource belongs e.g. routes, waypoints, etc.
   * @param id Resource identifier
   */
  public deleteResource(collection: string, id: string, refresh?: boolean) {
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
        }
      );
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
            if (!this.fromCache(collection, id)) {
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
      this.getRegions();
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

  trackSelected() {
    this.updateSource.next({ action: 'selected', mode: 'track' });
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
        this.showRegionInfo(r);
        break;
    }
  }

  // **** TRACKS ****

  /** get track(s) from sk server
   * selected: true= only include selected tracks
   * noUpdate: true= suppress updateSource event
   */
  getTracks(selected = false, noUpdate = false) {
    const path = `/resources/tracks`;
    this.signalk.api
      .get(this.app.skApiVersion, path)
      .subscribe((res: Tracks) => {
        this.app.data.tracks = [];
        Object.entries(res).forEach((r: [string, TrackResource]) => {
          const t = new SKTrack(r[1]);
          t.feature.id = r[0].toString();
          if (selected) {
            if (this.app.config.selections.tracks.includes(r[0])) {
              this.app.data.tracks.push(t);
            }
          } else {
            this.app.data.tracks.push(t);
          }
        });
        // ** clean up selections
        const k = Object.keys(res);
        this.app.config.selections.tracks = this.app.config.selections.tracks
          .map((i) => {
            return k.indexOf(i) !== -1 ? i : null;
          })
          .filter((i) => {
            return i;
          });

        if (!noUpdate) {
          this.updateSource.next({ action: 'get', mode: 'track' });
        }
      });
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
    const rte = t[1];

    this.dialog
      .open(ResourceDialog, {
        disableClose: true,
        data: {
          title: 'Route Details:',
          name: rte['name'] ? rte['name'] : null,
          comment: rte['description'] ? rte['description'] : null,
          type: 'route'
        }
      })
      .afterClosed()
      .subscribe((r) => {
        if (r.result) {
          // ** save / update route **
          rte['description'] = r.data.comment;
          rte['name'] = r.data.name;
          this.putResource('routes', e.id, rte);
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
    const res = this.buildRoute(e.coordinates);
    if (e.meta && Array.isArray(e.meta)) {
      res[1].feature.properties.coordinatesMeta = e.meta;
    }

    this.dialog
      .open(ResourceDialog, {
        disableClose: true,
        data: {
          title: 'New Route:',
          name: null,
          comment: null,
          type: 'route',
          addMode: true
        }
      })
      .afterClosed()
      .subscribe(
        (r: { result: boolean; data: { name: string; comment: string } }) => {
          if (r.result) {
            // ** create route **
            res[1]['description'] = r.data.comment || '';
            res[1]['name'] = r.data.name;
            this.putResource('routes', res[0], res[1], true);
          }
        }
      );
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
    let resId = null;
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
      wpt = w[1];
      addMode = false;
    }

    this.dialog
      .open(ResourceDialog, {
        disableClose: true,
        data: {
          title: title,
          name: wpt.name ?? '',
          comment: wpt.description ?? '',
          position: wpt.feature.geometry['coordinates'],
          addMode: addMode,
          skType: wpt.type ?? ''
        }
      })
      .afterClosed()
      .subscribe((r) => {
        wpt.description = r.data.comment || '';
        wpt.name = r.data.name || '';
        wpt.type = r.data.skType;
        if (r.result) {
          // ** save / update waypoint **
          let isNew = false;
          if (!resId) {
            // add
            resId = this.signalk.uuid;
            isNew = true;
          }
          this.putResource('waypoints', resId, wpt, isNew);
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

  // get regions from sk server
  getRegions() {
    this.signalk.api
      .get(this.app.skApiVersion, `/resources/regions`)
      .subscribe((res: Regions) => {
        this.app.data.regions = [];
        Object.entries(res).forEach((i: [string, RegionResource]) => {
          i[1] = this.transformRegion(i[1], i[0]);
          if (typeof i[1].feature !== 'undefined') {
            this.app.data.regions.push([i[0], new SKRegion(i[1]), true]);
          }
        });
        this.updateSource.next({ action: 'get', mode: 'region' });
      });
  }

  // v2 transformation
  transformRegion(r: RegionResource, id: string): RegionResource {
    if (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (r as any).geohash !== 'undefined' &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (r as any).geohash === 'string'
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gh = ngeohash.decode_bbox((r as any).geohash);
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
      return r;
    }
  }

  // ** modify Region point coordinates **
  updateRegionCoords(id: string, coords: Array<Array<Position>>) {
    const region = this.fromCache('regions', id)[1];
    region['feature']['geometry']['coordinates'] =
      GeoUtils.normaliseCoords(coords);
    this.putResource('regions', id, region);
  }

  // ** Display Edit Region properties Dialog **
  showRegionInfo(e: { id: string; region?: SKRegion }) {
    if (!e.region) {
      const t = this.fromCache('regions', e.id);
      if (!t) {
        return;
      }
      e.region = t[1];
    }

    this.dialog
      .open(ResourceDialog, {
        disableClose: true,
        data: {
          title: 'Region Details:',
          name: e.region['name'] ? e.region['name'] : null,
          comment: e.region['description'] ? e.region['description'] : null,
          type: 'region'
        }
      })
      .afterClosed()
      .subscribe((r) => {
        if (r.result) {
          // ** save / update region **
          e.region['description'] = r.data.comment;
          e.region['name'] = r.data.name;
          this.putResource('regions', e.id, e.region);
        }
      });
  }

  // ** confirm Region Deletion **
  showRegionDelete(e: { id: string }) {
    // are there notes attached?
    this.signalk.api
      .get(
        this.app.skApiVersion,
        `/resources/notes?href=/resources/regions/${e.id}`
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
              this.deleteResource('regions', e.id);
              if (result.checked) {
                na.forEach((id) => {
                  this.deleteResource('notes', id);
                });
              }
            }
          });
      });
  }

  // **** NOTES ****

  // ** get notes / regions from sk server
  getNotes(params: string = null) {
    let rf = params ? params : this.app.config.resources.notes.rootFilter;
    rf = this.processTokens(rf);
    if (rf && rf[0] !== '?') {
      rf = '?' + rf;
    }
    this.app.debug(`${rf}`);

    this.signalk.api
      .get(this.app.skApiVersion, `/resources/notes${rf}`)
      .subscribe((res: Notes) => {
        this.app.data.notes = this.processNotes(res, true, 300);
        this.updateSource.next({ action: 'get', mode: 'note' });
      });
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
    if (typeof n.position !== 'undefined' && typeof n.href !== 'undefined') {
      if (n.href) {
        delete n.position;
      } else {
        delete n.href;
      }
    }
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
      this.showRelatedNotes(this.reOpen.value, this.reOpen.key);
      if (noReset) {
        return;
      } else {
        this.reOpen = { key: null, value: null };
      }
    }
  }

  // ** Show Related Notes dialog **
  showRelatedNotes(id: string, relatedBy = 'region') {
    let paramName: string;
    if (relatedBy !== 'group') {
      id = id.indexOf(relatedBy) === -1 ? `/resources/${relatedBy}s/${id}` : id;
      paramName = 'href';
    } else {
      paramName = relatedBy;
    }
    this.signalk.api
      .get(this.app.skApiVersion, `/resources/notes?${paramName}=${id}`)
      .subscribe(
        (res: Notes) => {
          const notes = [];
          Object.entries(res).forEach((i) => {
            i[1] = this.transformNote(i[1], i[0]);
            notes.push([i[0], new SKNote(i[1]), true]);
          });
          this.dialog
            .open(RelatedNotesDialog, {
              disableClose: true,
              data: { notes: notes, relatedBy: relatedBy }
            })
            .afterClosed()
            .subscribe((r) => {
              if (r.result) {
                if (relatedBy) {
                  this.reOpen = { key: relatedBy, value: id };
                } else {
                  this.reOpen = { key: null, value: null };
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
      this.signalk.api
        .get(this.app.skApiVersion, `/resources/notes/${e.id}`)
        .subscribe(
          (res) => {
            // ** note data
            res = this.transformNote(res as NoteResource, e.id);
            data.noteId = e.id;
            data.title = 'Edit Note';
            data.note = res;
            data.addNote = false;
            this.openNoteForEdit(data);
          },
          () => {
            this.app.showAlert('ERROR', 'Unable to retrieve Note!');
          }
        );
    }
  }

  // ** Note info Dialog **
  showNoteInfo(e: { id: string }) {
    this.signalk.api
      .get(this.app.skApiVersion, `/resources/notes/${e.id}`)
      .subscribe(
        (res: NoteResource) => {
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

  // ** process url tokens
  private processTokens(s: string): string {
    if (!s) {
      return s;
    }
    const ts = s.split('%');
    if (ts.length > 1) {
      const uts = ts.map((i) => {
        if (i === 'map:latitude') {
          return this.app.config.map.center[1];
        } else if (i === 'map:longitude') {
          return this.app.config.map.center[0];
        } else if (i === 'note:radius') {
          const dist =
            this.app.config.units.distance === 'm'
              ? this.app.config.resources.notes.getRadius
              : Convert.nauticalMilesToKm(
                  this.app.config.resources.notes.getRadius
                );
          return dist * 1000;
        } else {
          return i;
        }
      });
      s = uts.join('');
    }
    return s;
  }
}
