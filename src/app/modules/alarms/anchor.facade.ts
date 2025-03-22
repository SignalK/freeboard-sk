/** Settings abstraction Facade
 * ************************************/
import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, Observable } from 'rxjs';

import { AppFacade } from 'src/app/app.facade';
import { SKResources } from 'src/app/modules';
import { SignalKClient } from 'signalk-client-angular';
import { SKStreamProvider } from '../skstream/skstream.service';
import { NotificationMessage } from 'src/app/types';
import { Position } from 'src/app/types';

interface IStatus {
  action: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any;
  result: unknown;
}

export interface AnchorEvent {
  radius?: number | null;
  action: 'drop' | 'raise' | 'setRadius' | 'position' | undefined;
  mode?: 'setManualAnchor' | 'dropAnchor' | undefined;
  rodeLength?: number | null;
}

@Injectable({ providedIn: 'root' })
export class AnchorFacade {
  // **************** ATTRIBUTES ***************************

  private anchorSource = new Subject<IStatus>();
  private alarmSource = new Subject<boolean>();
  private closestApproachSource = new Subject<NotificationMessage>();

  // *******************************************************

  constructor(
    private app: AppFacade,
    private signalk: SignalKClient,
    private stream: SKStreamProvider,
    private skres: SKResources
  ) {}

  anchorStatus$(): Observable<IStatus> {
    return this.anchorSource.asObservable();
  }
  closestApproach$(): Observable<NotificationMessage> {
    return this.closestApproachSource.asObservable();
  }
  update$(): Observable<boolean> {
    return this.alarmSource.asObservable();
  }

  // ******** ANCHOR WATCH EVENTS ************
  anchorEvent(e: AnchorEvent, context?: string, position?: Position) {
    return new Promise((resolve, reject) => {
      context = context ? context : 'self';
      if (e.action === 'setRadius') {
        //send radius value only
        const val = typeof e.radius === 'number' ? { radius: e.radius } : {};
        this.app.config.anchorRadius = e.radius;
        this.signalk.post('/plugins/anchoralarm/setRadius', val).subscribe(
          () => {
            this.app.saveConfig();
            resolve(true);
          },
          (err: HttpErrorResponse) => {
            this.parseAnchorError(err, 'radius');
            this.queryAnchorStatus(context, position);
            reject();
          }
        );
      } else if (e.action === 'drop') {
        if (e.mode === 'setManualAnchor') {
          if (typeof e.rodeLength !== 'number') {
            reject();
            return;
          }
          // rode is already out
          this.signalk
            .post('/plugins/anchoralarm/setManualAnchor', {
              rodeLength: e.rodeLength
            })
            .subscribe(
              () => {
                this.app.saveConfig();
              },
              (err: HttpErrorResponse) => {
                this.parseAnchorError(err, 'drop');
                this.queryAnchorStatus(context, position);
                reject();
              }
            );
        } else {
          // ** drop anchor
          this.app.config.anchorRadius = e.radius;
          const params =
            typeof e.radius === 'number' ? { radius: e.radius } : {};
          this.signalk
            .post('/plugins/anchoralarm/dropAnchor', params)
            .subscribe(
              () => {
                this.app.saveConfig();
              },
              (err: HttpErrorResponse) => {
                this.parseAnchorError(err, 'drop');
                this.queryAnchorStatus(context, position);
                reject();
              }
            );
        }
      } else if (e.action === 'raise') {
        // ** raise anchor
        this.signalk.post('/plugins/anchoralarm/raiseAnchor', {}).subscribe(
          () => resolve(true),
          (err: HttpErrorResponse) => {
            this.parseAnchorError(err, 'raise');
            this.queryAnchorStatus(context, position);
            reject();
          }
        );
      } else if (e.action === 'position') {
        this.signalk
          .post('/plugins/anchoralarm/setAnchorPosition', {
            position: {
              latitude: position[1],
              longitude: position[0]
            }
          })
          .subscribe(
            () => resolve(true),
            (err: HttpErrorResponse) => {
              this.parseAnchorError(err, 'position');
              this.queryAnchorStatus(context, position);
              reject();
            }
          );
      }
    });
  }

  // ** update anchor status from received vessel data**
  updateAnchorStatus() {
    this.parseAnchorStatus(this.app.data.vessels.self.anchor);
  }

  // ** query anchor status
  queryAnchorStatus(context: string, position?: Position) {
    this.app.debug('Retrieving anchor status...');
    context = !context || context === 'self' ? 'vessels/self' : context;
    this.signalk.api.get(`/${context}/navigation/anchor`).subscribe(
      (r) => {
        const aData = { position: null, maxRadius: null };
        if (r['position']) {
          aData.position =
            typeof r['position']['value'] !== 'undefined'
              ? r['position']['value']
              : null;
        }
        if (r['maxRadius']) {
          aData.maxRadius =
            typeof r['maxRadius']['value'] === 'number'
              ? r['maxRadius']['value']
              : null;
        }
        this.parseAnchorStatus(aData, position);
      },
      () => {
        this.app.data.anchor.position = [0, 0];
        this.app.data.anchor.raised = true;
      }
    );
  }

  // ** process anchor watch errors
  parseAnchorError(e, action: string) {
    this.app.debug(e);
    if (e.status && e.status === 401) {
      // ** emit anchorStatus$ **
      this.anchorSource.next({
        action: action,
        error: true,
        result: e
      });
      return;
    }

    if (e.status && e.status !== 200) {
      this.anchorSource.next({
        action: action,
        error: true,
        result: e
      });
    }
  }

  // ** process anchor status
  parseAnchorStatus(
    r: { maxRadius: number; position: { latitude: number; longitude: number } },
    position?: Position
  ) {
    if (
      r.position &&
      typeof r.position.latitude === 'number' &&
      typeof r.position.longitude === 'number'
    ) {
      this.app.data.anchor.position = [
        r.position.longitude,
        r.position.latitude
      ];
      this.app.data.anchor.raised = false;
    } else {
      if (position) {
        this.app.data.anchor.position = position;
      }
      this.app.data.anchor.raised = true;
    }

    this.app.data.anchor.radius = r.maxRadius ?? -1;

    // ** emit anchorStatus$ **
    this.anchorSource.next({
      action: 'query',
      error: false,
      result: this.app.data.anchor
    });
  }
}
