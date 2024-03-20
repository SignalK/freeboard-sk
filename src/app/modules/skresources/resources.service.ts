import { Injectable } from '@angular/core';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, of, Subject, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import ngeohash from 'ngeohash';

import { SignalKClient } from 'signalk-client-angular';
import { AppInfo, OSM } from 'src/app/app.info';
import { GeoUtils } from 'src/app/lib/geoutils';
import { Convert } from 'src/app/lib/convert';

import { LoginDialog } from 'src/app/lib/components/dialogs';
import { NoteDialog, RelatedNotesDialog } from './notes';
import { ResourceDialog } from './resource-dialogs';
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
  SKApiResponse,
  RouteResource,
  WaypointResource,
  RegionResource,
  TrackResource,
  FBNotes,
  Position
} from 'src/app/types';

// ** Signal K resource operations
@Injectable({ providedIn: 'root' })
export class SKResources {
  private reOpen: { key; value };
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

  // ** process Resource Delta message **
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  processDelta(e: Array<any>) {
    if (!Array.isArray(e)) {
      return;
    }
    const actions = {
      routes: false,
      waypoints: false,
      notes: false,
      regions: false
    };
    e.forEach((item) => {
      const p = item.path.split('.');
      if (p.length === 3) {
        const type = p[1];
        const id = p[2];
        const deleted = !item.value ? true : false;

        // in-scope
        if (['waypoints', 'routes', 'notes', 'regions'].includes(type)) {
          actions[type] = true;
          if (!deleted) {
            // check for existing entry
            const fr = this.app.data[type].filter((r) => {
              return r[0] === id;
            });
            if (fr.length === 0) {
              // select to display new entry on map
              this.app.config.selections[type].push(id);
              this.app.saveConfig();
            }
          }
        }
      }
    });

    if (actions['routes']) {
      this.getRoutes();
    }
    if (actions['waypoints']) {
      this.getWaypoints();
    }
    if (actions['notes'] || actions['regions']) {
      this.getNotes();
    }
  }

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
    const t = this.app.data.routes.map((i) => {
      if (i[2]) {
        return i[0];
      }
    });
    this.app.config.selections.routes = t.filter((i) => {
      return i ? true : false;
    });
    this.app.saveConfig();
    this.updateSource.next({ action: 'selected', mode: 'route' });
  }

  waypointSelected() {
    const t = this.app.data.waypoints.map((i) => {
      if (i[2]) {
        return i[0];
      }
    });
    this.app.config.selections.waypoints = t.filter((i) => {
      return i ? true : false;
    });
    this.app.saveConfig();
    this.updateSource.next({ action: 'selected', mode: 'waypoint' });
  }

  noteSelected(e) {
    if (e.isGroup) {
      this.showRelatedNotes(e.id, 'group');
    } else {
      this.showNoteInfo({ id: e.id });
    }
    this.updateSource.next({ action: 'selected', mode: 'note' });
  }

  aisSelected(e) {
    this.app.config.selections.aisTargets = e;
    this.app.saveConfig();
    this.updateSource.next({ action: 'selected', mode: 'ais' });
  }

  chartSelected() {
    const t = this.app.data.charts.map((i) => {
      if (i[2]) {
        return i[0];
      }
    });
    this.app.config.selections.charts = t.filter((i) => {
      return i ? true : false;
    });
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

  // ** GENERIC RESOURCES **

  // ** Generic Resource on server **
  createResource(path: string, data: unknown) {
    this.signalk.api
      .post(this.app.skApiVersion, `/resources/${path}`, data)
      .subscribe(
        (res) => {
          if (res['statusCode'] === 202) {
            // pending
            this.pendingStatus(res).then((r) => {
              if (r['statusCode'] >= 400) {
                // response status is error
                this.app.showAlert(
                  `ERROR: (${r['statusCode']})`,
                  r['message'] ? r['message'] : 'Server could not add Resource!'
                );
              } else {
                this.app.showAlert('SUCCESS:', 'Resource loaded successfully.');
              }
            });
          } else if (res['statusCode'] === 200) {
            // complete
            this.app.showAlert('SUCCESS:', 'Resource loaded successfully.');
          }
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
                    this.createResource(path, data);
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
              `Server could not add Resource!\n${err.error.message}`
            );
          }
        }
      );
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

  // ** delete track on server **
  private deleteTrack(id: string) {
    this.signalk.api
      .delete(this.app.skApiVersion, `/resources/tracks/${id}`)
      .subscribe(
        (res) => {
          if (res['statusCode'] === 202) {
            // pending
            this.pendingStatus(res).then((r) => {
              if (r['statusCode'] >= 400) {
                // response status is error
                this.app.showAlert(
                  `ERROR: (${r['statusCode']})`,
                  r['message'] ? r['message'] : 'Server could not delete Track!'
                );
              } else {
                this.getTracks(true);
              }
            });
          } else if (res['statusCode'] === 200) {
            this.getTracks(true);
          }
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
                    this.deleteTrack(id);
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
              `Server could not delete Track!\n${err.error.message}`
            );
          }
        }
      );
  }

  // ** Confirm Track Deletion **
  showTrackDelete() {
    return this.app.showConfirm(
      'Do you want to delete this Track?\n \nTrack will be removed from the server (if configured to permit this operation).',
      'Delete Track:',
      'YES',
      'NO'
    );
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

  // ** create route on server **
  private createRoute(rte: [string, SKRoute]) {
    this.signalk.api
      .put(this.app.skApiVersion, `/resources/routes/${rte[0]}`, rte[1])
      .subscribe(
        (res: SKApiResponse) => {
          if (res['statusCode'] === 202) {
            // pending
            this.pendingStatus(res).then((r) => {
              if (r['statusCode'] >= 400) {
                // response status is error
                this.app.showAlert(
                  `ERROR: (${r['statusCode']})`,
                  r['message'] ? r['message'] : 'Server could not add Route!'
                );
              } else {
                this.app.config.selections.routes.push(rte[0]);
                this.app.saveConfig();
              }
            });
          } else if (res['statusCode'] === 200) {
            // complete
            this.app.data.buildRoute.show = false;
            this.app.config.selections.routes.push(rte[0]);
            this.app.saveConfig();
          }
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
                    this.createRoute(rte);
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
              `Server could not add Route!\n${err.error.message}`
            );
          }
        }
      );
  }

  // ** update route on server **
  private updateRoute(id: string, rte: SKRoute) {
    this.signalk.api
      .put(this.app.skApiVersion, `/resources/routes/${id}`, rte)
      .subscribe(
        (res: SKApiResponse) => {
          if (res['statusCode'] === 202) {
            // pending
            this.pendingStatus(res).then((r) => {
              if (r['statusCode'] >= 400) {
                // response status is error
                this.app.showAlert(
                  `ERROR: (${r['statusCode']})`,
                  r['message'] ? r['message'] : 'Server could not update Route!'
                );
              }
            });
          } else {
            if (this.app.data.activeRoute === id) {
              this.courseRefresh();
            }
          }
        },
        (err: HttpErrorResponse) => {
          this.getRoutes();
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
                    this.updateRoute(id, rte);
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
              `Server could not update Route details!\n${err.error.message}`
            );
          }
        }
      );
  }

  // ** delete route on server **
  private deleteRoute(id: string) {
    this.signalk.api
      .delete(this.app.skApiVersion, `/resources/routes/${id}`)
      .subscribe(
        (res) => {
          if (res['statusCode'] === 202) {
            // pending
            this.pendingStatus(res).then((r) => {
              if (r['statusCode'] >= 400) {
                // response status is error
                this.app.showAlert(
                  `ERROR: (${r['statusCode']})`,
                  r['message'] ? r['message'] : 'Server could not delete Route!'
                );
              }
            });
          }
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
                    this.deleteRoute(id);
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
              `Server could not delete Route!\n${err.error.message}`
            );
          }
        }
      );
  }

  // Modify Route point coordinates & refrsh course
  updateRouteCoords(
    id: string,
    coords: Array<Position>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    coordsMeta?: Array<any>
  ) {
    const t = this.app.data.routes.filter((i: [string, SKRoute]) => {
      if (i[0] === id) return true;
    });
    if (t.length === 0) {
      return;
    }
    const rte = t[0][1];
    rte['feature']['geometry']['coordinates'] =
      GeoUtils.normaliseCoords(coords);
    rte.distance = GeoUtils.routeLength(rte.feature.geometry.coordinates);

    if (coordsMeta) {
      rte['feature']['properties']['coordinatesMeta'] = coordsMeta;
    }
    this.updateRoute(id, rte);
  }

  // Return array of route coordinates
  getActiveRouteCoords(routeId?: string) {
    if (!routeId) {
      routeId = this.app.data.activeRoute;
    }
    const rte = this.app.data.routes.filter((r: [string, SKRoute]) => {
      if (r[0] === routeId) {
        return r;
      }
    });
    if (rte.length === 0) {
      return [];
    } else {
      return rte[0][1].feature.geometry.coordinates;
    }
  }

  // ** Display Edit Route properties Dialog **
  showRouteInfo(e: { id: string }) {
    const t = this.app.data.routes.filter((i: [string, SKRoute]) => {
      if (i[0] === e.id) return true;
    });
    if (t.length === 0) {
      return;
    }
    const rte = t[0][1];
    const resId = t[0][0];

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
          this.updateRoute(resId, rte);
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
            this.createRoute(res);
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
              this.deleteRoute(e.id);
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

  // ** create / update waypoint on server **
  private submitWaypoint(id: string, wpt: SKWaypoint, isNew = false) {
    this.signalk.api
      .put(this.app.skApiVersion, `/resources/waypoints/${id}`, wpt)
      .subscribe(
        (res: SKApiResponse) => {
          if (res['statusCode'] === 202) {
            // pending
            if (isNew) {
              this.app.config.selections.waypoints.push(id);
              this.app.saveConfig();
            }
            this.pendingStatus(res).then((r) => {
              if (r['statusCode'] >= 400) {
                // response status is error
                this.app.showAlert(
                  `ERROR: (${r['statusCode']})`,
                  r['message']
                    ? r['message']
                    : 'Server could not update Waypoint!'
                );
              }
            });
          } else if (res['statusCode'] === 200) {
            if (isNew) {
              this.app.config.selections.waypoints.push(id);
              this.app.saveConfig();
            }
          }
        },
        (err: HttpErrorResponse) => {
          this.getWaypoints();
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
                    this.submitWaypoint(id, wpt, isNew);
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
              `Server could not update Waypoint details!\n${err.error.message}`
            );
          }
        }
      );
  }

  // ** delete waypoint on server **
  private deleteWaypoint(id: string) {
    this.signalk.api
      .delete(this.app.skApiVersion, `/resources/waypoints/${id}`)
      .subscribe(
        (res) => {
          if (res['statusCode'] === 202) {
            // pending
            this.pendingStatus(res).then((r) => {
              if (r['statusCode'] >= 400) {
                // response status is error
                this.app.showAlert(
                  `ERROR: (${r['statusCode']})`,
                  r['message']
                    ? r['message']
                    : 'Server could not delete Waypoint!'
                );
              }
            });
          }
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
                    this.deleteWaypoint(id);
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
              `Server could not delete Waypoint!\n${err.error.message}`
            );
          }
        }
      );
  }

  // ** modify waypoint point coordinates **
  updateWaypointPosition(id: string, position: Position) {
    const t = this.app.data.waypoints.filter((i: [string, SKWaypoint]) => {
      if (i[0] === id) return true;
    });
    if (t.length === 0) {
      return;
    }
    const wpt = t[0][1];
    wpt['feature']['geometry']['coordinates'] =
      GeoUtils.normaliseCoords(position);
    wpt['position'] = {
      latitude: wpt['feature']['geometry']['coordinates'][1],
      longitude: wpt['feature']['geometry']['coordinates'][0]
    };
    this.submitWaypoint(id, wpt);
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
      wpt.name = '';
      wpt.description = '';
    } else if (!e.id && e.position) {
      // add at provided position
      wpt = new SKWaypoint();
      wpt.feature.geometry.coordinates = GeoUtils.normaliseCoords(e.position);
      title = 'Drop waypoint:';
      wpt.name = '';
      wpt.description = '';
    } else {
      // Edit waypoint details
      resId = e.id;
      title = 'Waypoint Details:';
      const w = this.app.data.waypoints.filter((i) => {
        if (i[0] === resId) return true;
      });
      if (w.length === 0) {
        return;
      }
      wpt = w[0][1];
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
          skType:
            typeof wpt.feature.properties['skType'] !== 'undefined'
              ? wpt.feature.properties['skType']
              : null
        }
      })
      .afterClosed()
      .subscribe((r) => {
        wpt.description = r.data.comment || '';
        wpt.name = r.data.name || '';
        if (r.data.skType) {
          wpt.feature.properties['skType'] = r.data.skType;
        } else {
          delete wpt.feature.properties['skType'];
        }
        if (r.result) {
          // ** save / update waypoint **
          let isNew = false;
          if (!resId) {
            // add
            resId = this.signalk.uuid;
            isNew = true;
          }
          this.submitWaypoint(resId, wpt, isNew);
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

  // get regions from server
  getRegions(params: string = null) {
    params = params && params[0] !== '?' ? `?${params}` : params;
    return this.signalk.api.get(
      this.app.skApiVersion,
      `/resources/regions${params}`
    );
  }

  // ** create Region and optionally add note **
  private createRegion(region: { id: string; data: SKRegion }, note?: SKNote) {
    this.signalk.api
      .put(
        this.app.skApiVersion,
        `/resources/regions/${region.id}`,
        region.data
      )
      .subscribe(
        (res: SKApiResponse) => {
          if (res['statusCode'] === 202) {
            // pending
            this.pendingStatus(res).then((r) => {
              if (r['statusCode'] >= 400) {
                // response status is error
                this.app.showAlert(
                  `ERROR: (${r['statusCode']})`,
                  r['message'] ? r['message'] : 'Server could not add Region!'
                );
              } else {
                if (note) {
                  this.createNote(note);
                }
              }
            });
          } else if (res['statusCode'] === 200 && note) {
            this.createNote(note);
          }
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
                    this.createRegion(region, note);
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
              `Server could not add Region!\n${err.error.message}`
            );
          }
        }
      );
  }

  // ** delete Region on server **
  private deleteRegion(id: string) {
    this.signalk.api
      .delete(this.app.skApiVersion, `/resources/regions/${id}`)
      .subscribe(
        (res) => {
          if (res['statusCode'] === 202) {
            // pending
            this.pendingStatus(res).then((r) => {
              if (r['statusCode'] >= 400) {
                // response status is error
                this.app.showAlert(
                  `ERROR: (${r['statusCode']})`,
                  r['message']
                    ? r['message']
                    : 'Server could not delete Region!'
                );
              }
            });
          }
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
              'ERROR:',
              `Server could not delete Region!\n${err.error.message}`
            );
          }
        }
      );
  }

  // ** update region on server **
  private updateRegion(id: string, reg: SKRegion) {
    this.signalk.api
      .put(this.app.skApiVersion, `/resources/regions/${id}`, reg)
      .subscribe(
        (res: SKApiResponse) => {
          if (res['statusCode'] === 202) {
            // pending
            this.pendingStatus(res).then((r) => {
              if (r['statusCode'] >= 400) {
                // response status is error
                this.app.showAlert(
                  `ERROR: (${r['statusCode']})`,
                  r['message']
                    ? r['message']
                    : 'Server could not update Region!'
                );
              }
            });
          }
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
                    this.updateRegion(id, reg);
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
              `Server could not update Region details!\n${err.error.message}`
            );
          }
        }
      );
  }

  // ** modify Region point coordinates **
  updateRegionCoords(id: string, coords: Array<Array<Position>>) {
    const t = this.app.data.regions.filter((i: [string, SKRegion]) => {
      if (i[0] === id) return true;
    });
    if (t.length === 0) {
      return;
    }
    const region = t[0][1];
    region['feature']['geometry']['coordinates'] =
      GeoUtils.normaliseCoords(coords);
    this.createRegion({ id: id, data: region });
  }

  // ** Display Edit Region properties Dialog **
  showRegionInfo(e: { id: string }) {
    const t = this.app.data.regions.filter((i: [string, SKRegion]) => {
      if (i[0] === e.id) return true;
    });
    if (t.length === 0) {
      return;
    }
    const reg = t[0][1];
    const resId = t[0][0];

    this.dialog
      .open(ResourceDialog, {
        disableClose: true,
        data: {
          title: 'Region Details:',
          name: reg['name'] ? reg['name'] : null,
          comment: reg['description'] ? reg['description'] : null,
          type: 'region'
        }
      })
      .afterClosed()
      .subscribe((r) => {
        if (r.result) {
          // ** save / update region **
          reg['description'] = r.data.comment;
          reg['name'] = r.data.name;
          this.updateRegion(resId, reg);
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
              this.deleteRegion(e.id);
              if (result.checked) {
                na.forEach((id) => {
                  this.deleteNote(id);
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

    const req = [];
    const resRegions = this.getRegions(rf);
    if (resRegions) {
      resRegions.pipe(catchError((error) => of(error)));
      req.push(resRegions);
    }
    const resNotes = this.signalk.api.get(
      this.app.skApiVersion,
      `/resources/notes${rf}`
    );
    if (resNotes) {
      req.push(resNotes);
    }
    if (req.length === 0) {
      return;
    }
    const res = forkJoin(req);
    res.subscribe((res) => {
      if (typeof res[0]['error'] === 'undefined') {
        const r = Object.entries(res[0]);
        this.app.data.regions = [];
        r.forEach((i: [string, RegionResource]) => {
          i[1] = this.transformRegion(i[1], i[0]);
          if (typeof i[1].feature !== 'undefined') {
            this.app.data.regions.push([i[0], new SKRegion(i[1]), false]);
          }
        });
      }
      this.app.data.notes = this.processNotes(res[1] as Notes, true, 300);
      this.updateSource.next({ action: 'get', mode: 'note' });
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
  /* returns array of SKNotes 
      noDesc: true= remove description value
      maxCount: max number of entries to return
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
        (res) => {
          if (res['statusCode'] === 202) {
            // pending
            this.pendingStatus(res).then((r) => {
              if (r['statusCode'] >= 400) {
                // response status is error
                this.app.showAlert(
                  `ERROR: (${r['statusCode']})`,
                  r['message'] ? r['message'] : 'Server could not add Note!'
                );
              } else {
                this.reopenRelatedDialog();
              }
            });
          } else if (res['statusCode'] === 200) {
            this.reopenRelatedDialog();
          }
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
        (res: SKApiResponse) => {
          if (res['statusCode'] === 202) {
            // pending
            this.pendingStatus(res).then((r) => {
              if (r['statusCode'] >= 400) {
                // response status is error
                this.app.showAlert(
                  `ERROR: (${r['statusCode']})`,
                  r['message'] ? r['message'] : 'Server could not update Note!'
                );
              } else {
                this.reopenRelatedDialog();
              }
            });
          } else if (res['statusCode'] === 200) {
            this.reopenRelatedDialog();
          }
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
        (res) => {
          if (res['statusCode'] === 202) {
            // pending
            this.pendingStatus(res).then((r) => {
              if (r['statusCode'] >= 400) {
                // response status is error
                this.app.showAlert(
                  `ERROR: (${r['statusCode']})`,
                  r['message'] ? r['message'] : 'Server could not delete Note!'
                );
              } else {
                this.reopenRelatedDialog();
              }
            });
          } else if (res['statusCode'] === 200) {
            this.reopenRelatedDialog();
          }
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
          if (e.region && e.createRegion) {
            // add region + note
            this.createRegion(e.region, note);
          } else if (!e.noteId) {
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
  showNoteInfo(e) {
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
    const t = this.app.data.notes.filter((i: [string, SKNote]) => {
      if (i[0] === id) return true;
    });
    if (t.length === 0) {
      return;
    }
    const note = t[0][1];
    position = GeoUtils.normaliseCoords(position);
    note['position'] = { latitude: position[1], longitude: position[0] };
    this.updateNote(id, note);
  }

  // *******************************

  // ** check pending request
  private async pendingStatus(status, max = 10, waitTime = 1000) {
    if (!status.href) {
      return { state: 'COMPLETED', statusCode: 200 };
    }
    let pending = true;
    let pollCount = 0;
    let result: SKApiResponse;

    while (pending) {
      pollCount++;
      const r = await this.poll(status.href, waitTime);
      if (r['state'] && r['state'] !== 'PENDING') {
        pending = false;
        result = r;
      } else {
        if (pollCount >= max) {
          pending = false;
          result = {
            state: 'COMPLETED',
            statusCode: 410,
            message: `Max. number of ${max} status requests reached.`
          };
        }
      }
    }
    return result;
  }
  // ** poll pending operation **
  private poll(href: string, waitTime = 1000): Promise<SKApiResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.signalk.get(href).subscribe(
          (res: SKApiResponse) => {
            resolve(res);
          },
          () => {
            resolve({
              state: 'FAILED',
              statusCode: 404,
              message: 'Server returned error when polling request status!'
            });
          }
        );
      }, waitTime);
    });
  }

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
