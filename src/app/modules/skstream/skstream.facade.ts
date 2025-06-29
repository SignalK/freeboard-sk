/** Signal K Stream Provider abstraction Facade
 * ************************************/
import { Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { AppFacade } from 'src/app/app.facade';
import { SettingsMessage } from 'src/app/lib/services';
import { SignalKClient } from 'signalk-client-angular';
import { SKWorkerService } from './skstream.service';
import { CourseService, SKVessel } from 'src/app/modules';
import {
  UpdateMessage,
  TrailMessage,
  MultiLineString,
  Position
} from 'src/app/types';

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
  private onConnect: Subject<UpdateMessage> = new Subject();
  private onClose: Subject<UpdateMessage> = new Subject();
  private onError: Subject<UpdateMessage> = new Subject();
  private onMessage: Subject<UpdateMessage> = new Subject();
  private onSelfTrail: Subject<{
    action: 'get';
    mode: 'trail';
    data: MultiLineString;
  }> = new Subject();
  private vesselsUpdate: Subject<void> = new Subject();
  private navDataUpdate: Subject<void> = new Subject();
  // **************** SIGNALS ***********************************
  private anchorSignal = signal<{
    maxRadius?: number;
    radius?: number;
    position?: Position;
  }>({});
  readonly selfAnchor = this.anchorSignal.asReadonly();

  private nightModeSignal = signal<boolean>(false);
  readonly selfNightMode = this.nightModeSignal.asReadonly();

  constructor(
    private app: AppFacade,
    private signalk: SignalKClient,
    private worker: SKWorkerService,
    private course: CourseService
  ) {
    // ** SIGNAL K STREAM **
    this.worker.message$().subscribe((msg: UpdateMessage | TrailMessage) => {
      if (msg.action === 'open') {
        this.post({
          cmd: 'auth',
          options: {
            token: this.app.getFBToken()
          }
        });
        this.onConnect.next(msg);
      } else if (msg.action === 'close') {
        this.onClose.next(msg);
      } else if (msg.action === 'error') {
        this.onError.next(msg);
      } else if (msg.action === 'trail') {
        this.parseSelfTrail(msg as TrailMessage);
      } else {
        this.parseUpdateMessage(msg);
        this.onMessage.next(msg as UpdateMessage);
      }
    });

    // ** SETTINGS - handle settings load / save events
    this.app.settings$.subscribe((r: SettingsMessage) =>
      this.handleSettingsEvent(r)
    );
  }
  // ** SKStream WebSocket messages **
  connect$(): Observable<UpdateMessage> {
    return this.onConnect.asObservable();
  }
  close$(): Observable<UpdateMessage> {
    return this.onClose.asObservable();
  }
  error$(): Observable<UpdateMessage> {
    return this.onError.asObservable();
  }
  delta$(): Observable<UpdateMessage> {
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
    this.worker.terminate();
  }

  close() {
    this.worker.close();
  }

  post(msg) {
    this.worker.postMessage(msg);
  }

  // ** open Signal K Stream
  open(options?: StreamOptions) {
    if (options && options.startTime) {
      const url = this.signalk.server.endpoints['v1']['signalk-ws'].replace(
        'stream',
        'playback'
      );
      this.worker.postMessage({
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
      this.worker.postMessage({
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
    this.worker.postMessage({
      cmd: 'subscribe',
      options: {
        context: 'vessels.*',
        path: [
          { path: '', period: 1000, policy: 'fixed' },
          { path: 'buddy', period: 1000, policy: 'fixed' },
          { path: 'uuid', period: 1000, policy: 'fixed' },
          { path: 'name', period: 1000, policy: 'fixed' },
          { path: 'mmsi', period: 1000, policy: 'fixed' },
          { path: 'port', period: 1000, policy: 'fixed' },
          { path: 'flag', period: 1000, policy: 'fixed' },
          { path: 'navigation.*', period: 1000, policy: 'fixed' },
          { path: 'environment.wind.*', period: 1000, policy: 'fixed' },
          { path: 'environment.mode', period: 1000, policy: 'fixed' },
          { path: 'environment.sun', period: 1000, policy: 'fixed' },
          { path: 'resources.*', period: 1000, policy: 'fixed' },
          { path: 'steering.autopilot.*', period: 1000, policy: 'fixed' },
          { path: 'performance.*', period: 1000, policy: 'fixed' }
        ]
      }
    });
    this.worker.postMessage({
      cmd: 'subscribe',
      options: {
        context: 'vessels.self',
        path: [{ path: 'notifications.*', period: 1000 }]
      }
    });
    this.worker.postMessage({
      cmd: 'subscribe',
      options: {
        context: 'atons.*',
        path: [{ path: '*', period: 60000 }]
      }
    });
    this.worker.postMessage({
      cmd: 'subscribe',
      options: {
        context: 'shore.basestations.*',
        path: [{ path: '*', period: 60000 }]
      }
    });
    this.worker.postMessage({
      cmd: 'subscribe',
      options: {
        context: 'sar.*',
        path: [{ path: '*', period: 1000 }]
      }
    });
    this.worker.postMessage({
      cmd: 'subscribe',
      options: {
        context: 'aircraft.*',
        path: [{ path: '*', period: 1000 }]
      }
    });
    this.worker.postMessage({
      cmd: 'subscribe',
      options: {
        context: 'meteo.*',
        path: [{ path: '*', period: 1000 }]
      }
    });
    this.worker.postMessage({
      cmd: 'subscribe',
      options: {
        context: 'meteo.*',
        path: [{ path: 'notifications.*', period: 1000 }]
      }
    });
  }

  // ** process selfTrail message from worker and emit trail$ **
  private parseSelfTrail(msg: TrailMessage) {
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
  private parseUpdateMessage(msg: UpdateMessage) {
    if (msg.action === 'update') {
      // delta message

      this.parseVesselSelf(msg.result.self);

      this.parseVesselOther(msg.result.aisTargets);

      this.app.data.vessels.prefAvailablePaths = msg.result.paths;

      // ** update active vessel map display **
      this.app.data.vessels.active = this.app.data.vessels.activeId
        ? this.app.data.vessels.aisTargets.get(this.app.data.vessels.activeId)
        : this.app.data.vessels.self;

      // process AtoNs
      this.app.data.atons = msg.result.atons;

      // process SaR
      this.app.data.sar = msg.result.sar;

      // process Meteo
      this.app.data.meteo = msg.result.meteo;

      // process Aircraft
      this.app.data.aircraft = msg.result.aircraft;

      // processAIS
      this.app.data.aisMgr.updateList = msg.result.aisStatus.updated;
      this.app.data.aisMgr.staleList = msg.result.aisStatus.stale;
      this.app.data.aisMgr.removeList = msg.result.aisStatus.expired;

      // process AIS tracks
      this.app.data.aisMgr.updateList.forEach((id) => {
        const v =
          id.indexOf('aircraft') !== -1
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
    this.parseSelfRacing(v);
    this.processVessel(v);

    this.course.parseSelf(v);
    this.navDataUpdate.next();

    this.anchorSignal.update(() => {
      return {
        position: v.anchor.position
          ? [v.anchor.position.longitude, v.anchor.position.latitude]
          : null,
        maxRadius: v.anchor.maxRadius ?? -1,
        radius: v.anchor.radius?.value ?? null
      };
    });

    this.nightModeSignal.update(() => {
      return (
        v.environment.mode === 'night' && (this.app.config.nightMode ?? false)
      );
    });
  }

  private parseSelfRacing(v: SKVessel) {
    if (
      v.properties['navigation.racing.startLineStb'] &&
      v.properties['navigation.racing.startLinePort']
    ) {
      const sls = v.properties['navigation.racing.startLineStb'];
      const slp = v.properties['navigation.racing.startLinePort'];
      this.app.data.racing.startLine = [
        [slp.longitude, slp.latitude],
        [sls.longitude, sls.latitude]
      ];
    } else {
      this.app.data.racing.startLine = [];
    }
  }

  private parseVesselOther(otherVessels: Map<string, SKVessel>) {
    this.app.data.vessels.aisTargets = otherVessels;
    this.app.data.vessels.aisTargets.forEach((value, key) => {
      this.processVessel(value);

      value.wind.direction = this.app.useMagnetic
        ? value.wind.mwd
        : value.wind.twd;

      value.orientation =
        value.cogTrue ??
        value.headingTrue ??
        value.cogMagnetic ??
        value.headingMagnetic ??
        0;
    });
  }

  // ** process vessel data and true / magnetic preference **
  private processVessel(d: SKVessel) {
    d.cog = this.app.useMagnetic ? d.cogMagnetic : d.cogTrue;
    d.heading = this.app.useMagnetic ? d.headingMagnetic : d.headingTrue;
    d.wind.direction = this.app.useMagnetic ? d.wind.mwd : d.wind.twd;
  }

  // handle settings (config.selections)
  private handleSettingsEvent(value) {
    if (value.setting === 'config') {
      //console.log('streamFacade.settingsEvent');
      this.worker.postMessage({
        cmd: 'settings',
        options: { selections: this.app.config.selections }
      });
    }
  }
}
