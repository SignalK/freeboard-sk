/** Signal K Stream Provider abstraction Facade
 * ************************************/
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { AppInfo } from 'src/app/app.info';
import { SettingsMessage } from 'src/app/lib/services';
import { SignalKClient } from 'signalk-client-angular';
import { SKStreamProvider } from './skstream.service';
import { SKRoute, SKVessel } from '../skresources/resource-classes';
import { AlarmsFacade } from '../alarms/alarms.facade';
import { Convert } from 'src/app/lib/convert';
import { SKResources } from '../skresources';
import {
  NotificationMessage,
  UpdateMessage,
  TrailMessage,
  MultiLineString
} from 'src/app/types';
import { GeoUtils } from 'src/app/lib/geoutils';

export enum SKSTREAM_MODE {
  REALTIME = 0,
  PLAYBACK
}

export interface StreamOptions {
  playbackRate: number;
  startTime: string;
  subscribe: string;
}

@Injectable({ providedIn: 'root' })
export class SKStreamFacade {
  // **************** ATTRIBUTES ***************************
  private onConnect: Subject<NotificationMessage | UpdateMessage> =
    new Subject();
  private onClose: Subject<NotificationMessage | UpdateMessage> = new Subject();
  private onError: Subject<NotificationMessage | UpdateMessage> = new Subject();
  private onMessage: Subject<NotificationMessage | UpdateMessage> =
    new Subject();
  private onSelfTrail: Subject<{
    action: 'get';
    mode: 'trail';
    data: MultiLineString;
  }> = new Subject();
  private vesselsUpdate: Subject<void> = new Subject();
  private navDataUpdate: Subject<void> = new Subject();
  // *******************************************************

  constructor(
    private app: AppInfo,
    private signalk: SignalKClient,
    private alarmsFacade: AlarmsFacade,
    private skres: SKResources,
    private stream: SKStreamProvider
  ) {
    // ** SIGNAL K STREAM **
    this.stream
      .message$()
      .subscribe((msg: NotificationMessage | UpdateMessage) => {
        if (msg.action === 'open') {
          this.post({
            cmd: 'auth',
            options: {
              token: this.app.getToken()
            }
          });
          this.onConnect.next(msg);
        } else if (msg.action === 'close') {
          this.onClose.next(msg);
        } else if (msg.action === 'error') {
          this.onError.next(msg);
        } else if (msg.action === 'trail') {
          this.parseSelfTrail(msg);
        } else {
          this.parseUpdate(msg);
          this.onMessage.next(msg);
        }
      });

    // ** SETTINGS - handle settings load / save events
    this.app.settings$.subscribe((r: SettingsMessage) =>
      this.handleSettingsEvent(r)
    );
  }
  // ** SKStream WebSocket messages **
  connect$(): Observable<NotificationMessage | UpdateMessage> {
    return this.onConnect.asObservable();
  }
  close$(): Observable<NotificationMessage | UpdateMessage> {
    return this.onClose.asObservable();
  }
  error$(): Observable<NotificationMessage | UpdateMessage> {
    return this.onError.asObservable();
  }
  delta$(): Observable<NotificationMessage | UpdateMessage> {
    return this.onMessage.asObservable();
  }
  trail$(): Observable<{
    action: 'get';
    mode: 'trail';
    data: MultiLineString;
  }> {
    return this.onSelfTrail.asObservable();
  }

  // ** Data centric messages
  vessels$(): Observable<void> {
    return this.vesselsUpdate.asObservable();
  }
  navdata$(): Observable<void> {
    return this.navDataUpdate.asObservable();
  }

  terminate() {
    this.stream.terminate();
  }

  close() {
    this.stream.close();
  }

  post(msg) {
    this.stream.postMessage(msg);
  }

  // ** open Signal K Stream
  open(options?: StreamOptions) {
    if (options && options.startTime) {
      const url = this.signalk.server.endpoints['v1']['signalk-ws'].replace(
        'stream',
        'playback'
      );
      this.stream.postMessage({
        cmd: 'open',
        options: {
          url: url,
          subscribe: 'none',
          token: null,
          playback: true,
          playbackOptions: options
        }
      });
    } else {
      this.stream.postMessage({
        cmd: 'open',
        options: {
          url: this.signalk.server.endpoints['v1']['signalk-ws'],
          subscribe: 'none',
          token: null
        }
      });
    }
  }

  // ** subscribe to signal k paths
  subscribe() {
    this.stream.postMessage({
      cmd: 'subscribe',
      options: {
        context: 'vessels.*',
        path: [
          { path: '', period: 1000, policy: 'fixed' },
          { path: 'buddy', period: 1000, policy: 'fixed' },
          { path: 'uuid', period: 1000, policy: 'fixed' },
          { path: 'name', period: 1000, policy: 'fixed' },
          { path: 'communication.callsignVhf', period: 1000, policy: 'fixed' },
          { path: 'mmsi', period: 1000, policy: 'fixed' },
          { path: 'port', period: 1000, policy: 'fixed' },
          { path: 'flag', period: 1000, policy: 'fixed' },
          { path: 'navigation.*', period: 1000, policy: 'fixed' },
          { path: 'environment.wind.*', period: 1000, policy: 'fixed' },
          { path: 'environment.mode', period: 1000, policy: 'fixed' },
          { path: 'resources.*', period: 1000, policy: 'fixed' },
          { path: 'steering.autopilot.*', period: 1000, policy: 'fixed' }
        ]
      }
    });
    this.stream.postMessage({
      cmd: 'subscribe',
      options: {
        context: 'vessels.self',
        path: [{ path: 'notifications.*', period: 1000 }]
      }
    });
    this.stream.postMessage({
      cmd: 'subscribe',
      options: {
        context: 'atons.*',
        path: [{ path: '*', period: 60000 }]
      }
    });
    this.stream.postMessage({
      cmd: 'subscribe',
      options: {
        context: 'shore.basestations.*',
        path: [{ path: '*', period: 60000 }]
      }
    });
    this.stream.postMessage({
      cmd: 'subscribe',
      options: {
        context: 'sar.*',
        path: [{ path: '*', period: 60000 }]
      }
    });
    this.stream.postMessage({
      cmd: 'subscribe',
      options: {
        context: 'aircraft.*',
        path: [{ path: '*', period: 30000 }]
      }
    });
  }

  // ** process selfTrail message from worker and emit trail$ **
  parseSelfTrail(msg: TrailMessage) {
    if (msg.result) {
      if (!this.app.data.serverTrail) {
        this.app.data.serverTrail = true;
      }
      this.onSelfTrail.next({ action: 'get', mode: 'trail', data: msg.result });
    } else {
      console.warn('Unable to fetch vessel trail from server.');
      this.app.data.serverTrail = false;
    }
  }

  // ** parse delta message and update Vessel Data -> vesselsUpdate.next()
  private parseUpdate(msg: NotificationMessage | UpdateMessage) {
    if (msg.action === 'update') {
      // delta message

      this.parseVesselSelf(msg.result.self);

      this.parseVesselOther(msg.result.aisTargets);

      this.app.data.vessels.prefAvailablePaths = msg.result.paths;

      // ** update active vessel map display **
      this.app.data.vessels.active = this.app.data.vessels.activeId
        ? this.app.data.vessels.aisTargets.get(this.app.data.vessels.activeId)
        : this.app.data.vessels.self;

      this.processCourse(this.app.data.vessels.active);

      // process AtoNs
      this.app.data.atons = msg.result.atons;

      // process SaR
      this.app.data.sar = msg.result.sar;

      // process Aircraft
      this.app.data.aircraft = msg.result.aircraft;

      // processAIS
      this.app.data.aisMgr.updateList = msg.result.aisStatus.updated;
      this.app.data.aisMgr.staleList = msg.result.aisStatus.stale;
      this.app.data.aisMgr.removeList = msg.result.aisStatus.expired;

      // process AIS tracks
      this.app.data.aisMgr.updateList.forEach((id) => {
        const v =
          id.indexOf('aircraft') != -1
            ? this.app.data.aircraft.get(id)
            : this.app.data.vessels.aisTargets.get(id);
        if (v) {
          this.app.data.vessels.aisTracks.set(id, v.track);
        }
      });
      this.app.data.aisMgr.removeList.forEach((id) => {
        this.app.data.vessels.aisTracks.delete(id);
      });

      this.vesselsUpdate.next();
    }
  }

  private parseVesselSelf(v: SKVessel) {
    this.app.data.vessels.self = v;
    if (this.app.config.fixedLocationMode) {
      this.app.data.vessels.self.position = [...this.app.config.fixedPosition];
    }
    this.processVessel(this.app.data.vessels.self);
    this.alarmsFacade.updateAnchorStatus();
  }

  private parseVesselOther(otherVessels: Map<string, SKVessel>) {
    this.app.data.vessels.aisTargets = otherVessels;
    this.app.data.vessels.aisTargets.forEach((value, key) => {
      this.processVessel(value);
      value.wind.direction = this.app.useMagnetic
        ? value.wind.mwd
        : value.wind.twd;
      value.orientation =
        value.heading != null
          ? value.heading
          : value.cog != null
          ? value.cog
          : 0;
      if (`vessels.${this.app.data.vessels.closest.id}` === key) {
        if (!value.closestApproach) {
          this.alarmsFacade.updateAlarm('cpa', null);
          this.app.data.vessels.closest = {
            id: null,
            distance: null,
            timeTo: null,
            position: [0, 0]
          };
        } else {
          this.app.data.vessels.closest.position = value.position;
        }
      }
    });
  }

  // ** process vessel data and true / magnetic preference **
  private processVessel(d: SKVessel) {
    d.cog = this.app.useMagnetic ? d.cogMagnetic : d.cogTrue;
    d.heading = this.app.useMagnetic ? d.headingMagnetic : d.headingTrue;
  }

  // ** process course data
  private processCourse(v: SKVessel) {
    // ** process courseApi data
    if (typeof v['courseApi'] !== 'undefined') {
      this.processCourseApi(v['courseApi']);
    }

    // ** process preferred course data **
    if (typeof v['course.crossTrackError'] !== 'undefined') {
      this.app.data.navData.xte =
        this.app.config.units.distance === 'm'
          ? v['course.crossTrackError'] / 1000
          : Convert.kmToNauticalMiles(v['course.crossTrackError'] / 1000);
    }

    if (typeof v['course.distance'] !== 'undefined') {
      this.app.data.navData.dtg =
        this.app.config.units.distance === 'm'
          ? v['course.distance'] / 1000
          : Convert.kmToNauticalMiles(v['course.distance'] / 1000);
    }
    if (typeof v['course.bearingTrue'] !== 'undefined') {
      this.app.data.navData.bearingTrue = Convert.radiansToDegrees(
        v['course.bearingTrue']
      );
      if (!this.app.useMagnetic) {
        this.app.data.navData.bearing.value = this.app.data.navData.bearingTrue;
        this.app.data.navData.bearing.type = 'T';
      }
    }
    if (typeof v['course.bearingMagnetic'] !== 'undefined') {
      this.app.data.navData.bearingMagnetic = Convert.radiansToDegrees(
        v['course.bearingMagnetic']
      );
      if (this.app.useMagnetic) {
        this.app.data.navData.bearing.value =
          this.app.data.navData.bearingMagnetic;
        this.app.data.navData.bearing.type = 'M';
      }
    }
    if (typeof v['course.velocityMadeGood'] !== 'undefined') {
      this.app.data.navData.vmg = v['course.nextPoint.velocityMadeGood'];
    }
    if (typeof v['course.timeToGo'] !== 'undefined') {
      this.app.data.navData.ttg = v['course.timeToGo'] / 60;
    }

    if (typeof v['course.estimatedTimeOfArrival'] !== 'undefined') {
      let d: Date | null;
      if (v['course.estimatedTimeOfArrival'] !== null) {
        d = new Date(v['course.estimatedTimeOfArrival']);
        this.app.data.navData.eta =
          d instanceof Date && !isNaN(d as any) ? d : null;
      } else {
        this.app.data.navData.eta = null;
      }
    }
    this.navDataUpdate.next();
  }

  clearCourseData() {
    this.app.data.navData.startPosition = null;
    this.app.data.navData.position = null;
    this.app.data.activeWaypoint = null;
    this.clearRouteData();
  }

  clearRouteData() {
    this.app.data.activeRoute = null;
    this.app.data.navData.pointIndex = -1;
    this.app.data.navData.pointTotal = 0;
    this.app.data.navData.pointNames = [];
    this.app.data.navData.destPointName = '';
    this.app.data.activeRouteReversed = false;
  }

  // ** process courseApi values into navData
  processCourseApi(value) {
    if (!value) {
      this.clearCourseData();
      return;
    }

    // navData.arrivalCircle
    if (typeof value.arrivalCircle !== 'undefined') {
      this.app.data.navData.arrivalCircle = value.arrivalCircle;
    }

    if (!value.nextPoint || !value.previousPoint) {
      this.clearCourseData();
    }

    if (value.nextPoint && value.previousPoint) {
      // navData.startPosition
      this.app.data.navData.startPosition = value?.previousPoint?.position
        ? [
            value.previousPoint.position.longitude,
            value.previousPoint.position.latitude
          ]
        : null;

      // navData.position
      this.app.data.navData.position = value?.nextPoint?.position
        ? [
            value.nextPoint.position.longitude,
            value.nextPoint.position.latitude
          ]
        : null;

      // wpt / route hrefs
      if (value?.nextPoint.href) {
        const wptHref = value.nextPoint.href.split('/');
        this.app.data.activeWaypoint = wptHref[wptHref.length - 1];
        if (
          !this.app.config.selections.waypoints.includes(
            this.app.data.activeWaypoint
          )
        ) {
          this.app.config.selections.waypoints.push(
            this.app.data.activeWaypoint
          );
          const idx = this.app.data.waypoints.findIndex((i) => {
            return i[0] === this.app.data.activeWaypoint;
          });
          if (idx !== -1) {
            this.app.data.waypoints[idx][2] = true;
          }
        }
      } else {
        this.app.data.activeWaypoint = null;
      }
    }

    // navData.activeRoute
    if (!value.activeRoute) {
      this.clearRouteData();
    } else {
      if (value.activeRoute.href) {
        this.app.data.navData.destPointName = '';
        const rteHref = value.activeRoute.href.split('/');
        this.app.data.activeRoute = rteHref[rteHref.length - 1];
        if (
          !this.app.config.selections.routes.includes(this.app.data.activeRoute)
        ) {
          this.app.config.selections.routes.push(this.app.data.activeRoute);
          const idx = this.app.data.routes.findIndex((i) => {
            return i[0] === this.app.data.activeRoute;
          });
          if (idx !== -1) {
            this.app.data.routes[idx][2] = true;
          }
        }
        this.app.data.activeWaypoint = null;
        this.app.data.navData.pointIndex =
          value?.activeRoute.pointIndex === null
            ? -1
            : value?.activeRoute.pointIndex;
        this.app.data.navData.pointTotal =
          value?.activeRoute.pointTotal === null
            ? 0
            : value?.activeRoute.pointTotal;

        const rte = this.app.data.routes.filter((i) => {
          if (i[0] === this.app.data.activeRoute) {
            return i;
          }
        });
        if (rte.length === 1 && rte[0][1]) {
          this.app.data.navData.activeRoutePoints =
            rte[0][1].feature.geometry.coordinates;

          if (
            rte[0][1].feature.properties.coordinatesMeta &&
            Array.isArray(rte[0][1].feature.properties.coordinatesMeta)
          ) {
            this.app.data.navData.pointNames =
              rte[0][1].feature.properties.coordinatesMeta.map((pt) => {
                return pt.name ?? '';
              });
            if (
              this.app.data.navData.pointIndex !== -1 &&
              this.app.data.navData.pointIndex <
                this.app.data.navData.pointNames.length
            ) {
              this.app.data.navData.destPointName =
                this.app.data.navData.pointNames[
                  this.app.data.navData.pointIndex
                ];
            }
          }

          this.app.data.activeRouteReversed = !value?.activeRoute.reverse
            ? false
            : value?.activeRoute.reverse;

          const coords = rte[0][1].feature.geometry.coordinates;
          if (
            coords[0][0] === coords[coords.length - 1][0] &&
            coords[0][1] === coords[coords.length - 1][1]
          ) {
            this.app.data.activeRouteCircular = true;
          } else {
            this.app.data.activeRouteCircular = false;
          }
        }
      } else {
        this.app.data.activeRoute = null;
        // Non-signal k source (n2k) route points.
        if (value.activeRoute.waypoints) {
          const n2kRoute = new SKRoute();
          n2kRoute.name = value.activeRoute?.name ?? 'From NMEA2000';
          n2kRoute.description = 'Route from NMEA2000 source';
          n2kRoute.feature.geometry.coordinates =
            value.activeRoute?.waypoints.map((pt) => {
              return [pt.position.longitude, pt.position.latitude];
            });
          const c = n2kRoute.feature.geometry.coordinates;
          n2kRoute.feature.geometry.coordinates = c;
          n2kRoute.distance = GeoUtils.routeLength(
            n2kRoute.feature.geometry.coordinates
          );
          this.app.data.n2kRoute = ['n2k', n2kRoute, true];
        } else {
          this.app.data.n2kRoute = null;
        }
      }
    }
  }

  // handle settings (config.selections)
  private handleSettingsEvent(value) {
    if (value.setting === 'config') {
      //console.log('streamFacade.settingsEvent');
      this.stream.postMessage({
        cmd: 'settings',
        options: { selections: this.app.config.selections }
      });
    }
  }
}
