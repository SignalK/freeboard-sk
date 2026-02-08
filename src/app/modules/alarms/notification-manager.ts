import { inject, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import {
  ALARM_METHOD,
  ALARM_STATE,
  NotificationMessage,
  PathValue,
  SKNotification
} from '../../types/stream';
import { AppFacade } from 'src/app/app.facade';
import { SKWorkerService } from '../skstream/skstream.service';
import { AlertData } from './components/alert.component';
import { getAlertIcon } from '../icons';
import { SignalKClient } from 'signalk-client-angular';
import { AlertPropertiesModal } from './components/alert-properties-modal';

type AlertItems = Array<[string, AlertData]>;

@Injectable({ providedIn: 'root' })
export class NotificationManager {
  private alertMap: Map<string, AlertData>;

  // signals
  private alertsSignal = signal<AlertItems>([]);
  readonly alerts = this.alertsSignal.asReadonly();

  private mobSignal = signal<AlertItems>([]);
  readonly mobAlerts = this.mobSignal.asReadonly();

  private app = inject(AppFacade);
  private worker = inject(SKWorkerService);
  private signalk = inject(SignalKClient);
  private bottomSheet = inject(MatBottomSheet);

  constructor() {
    this.alertMap = new Map();

    // ** SIGNAL K STREAM Message**
    this.worker.notification$().subscribe((msg: NotificationMessage) => {
      this.processMessage(msg);
    });
  }

  /**
   * @description Emit signals
   */
  private emitSignals() {
    const rankings = {
      emergency: 1,
      alarm: 2,
      warn: 3,
      alert: 4,
      normal: 5,
      nominal: 6
    };
    // sort based on priority and time raised
    const alerts = Array.from(this.alertMap).sort((a, b) => {
      const ra = rankings[a[1].priority];
      const rb = rankings[b[1].priority];
      if (ra === rb) {
        return b[1].createdAt - a[1].createdAt;
      } else {
        return ra - rb;
      }
    });

    this.alertsSignal.update(() => {
      return alerts;
    });

    this.mobSignal.update(() => {
      return alerts.filter((i) => i[1].type === 'mob');
    });

    // update closest vessel ids
    this.app.data.vessels.closest = alerts
      .filter((i) => i[1].type === 'cpa')
      .map((i) => i[1].properties?.vesselId);
  }

  /**
   * @description Processes in-scope notification message
   * @param msg notification message
   */
  private processMessage(msg: NotificationMessage) {
    if (!msg.result) {
      return;
    }
    this.parse(msg.result);
  }

  /**
   * @description Parse the notification delta path & value
   * @param msg Signal K path / value pair
   */
  private parse(msg: PathValue) {
    const alertType = this.getAlertType(msg.path);

    // check enabled in config
    if (alertType === 'depth' && !this.app.config.display.depthAlarm.enabled) {
      return;
    }

    // test for return to normal state
    if (!msg.value || (msg.value as SKNotification)?.state === 'normal') {
      if (this.alertMap.has(msg.path)) {
        this.alertMap.delete(msg.path);
        this.emitSignals();
      }
      return;
    }

    let alert: AlertData;

    // Test for Notifications API
    if (this.app.featureFlags().notificationApi) {
      const v: SKNotification = msg.value as SKNotification;
      alert = {
        id: v.id,
        path: msg.path,
        priority: v.state,
        message: v.message,
        sound: v.method.includes(ALARM_METHOD.sound),
        visual: v.method.includes(ALARM_METHOD.visual),
        properties: {},
        acknowledged: v.status.acknowledged,
        silenced: v.status.silenced,
        icon: {},
        type: undefined,
        canAcknowledge: v.status.canAcknowledge,
        canSilence: v.status.canSilence,
        canCancel: v.status.canClear,
        createdAt: v.createdAt ? new Date(v.createdAt).valueOf() : Date.now()
      };
    } else {
      if (alertType === 'notification') {
        return;
      }
      alert = this.alertMap.has(msg.path)
        ? this.alertMap.get(msg.path)
        : {
            path: msg.path,
            priority: ALARM_STATE.nominal,
            message: '',
            sound: false,
            visual: true,
            properties: {},
            acknowledged: false,
            silenced: false,
            icon: {},
            type: undefined,
            canAcknowledge: true,
            canCancel: false,
            canSilence: true,
            createdAt: Date.now()
          };

      alert.priority = (msg.value as SKNotification).state;
      alert.message = (msg.value as SKNotification).message;
      alert.sound = (msg.value as SKNotification).method.includes(
        ALARM_METHOD.sound
      );
      alert.visual =
        (msg.value as SKNotification).method.includes(ALARM_METHOD.visual) ||
        ['perpendicularPassed', 'arrivalCircleEntered'].includes(alertType);
      alert.canAcknowledge = ['emergency', 'alarm', 'warn'].includes(
        alert.priority
      );
      alert.canCancel = this.isStandardAlarm(alert.type);
    }

    alert.type = alertType;
    alert.icon = getAlertIcon(alert);
    if ((msg.value as any).position) {
      alert.properties.position = (msg.value as any).position;
    }

    if (['buddy'].includes(alertType)) {
      // show toast message
      this.app.showMessage(
        alert.message,
        !this.app.config.display.muteSound && alert.sound
      );
      return;
    } else {
      // alert
      if (alert.type === 'cpa') {
        alert.properties = this.parseCpa(msg.value);
      }
      this.alertMap.set(alert.path, alert);
      this.emitSignals();
    }
  }

  /**
   * @description Returns the alert type
   * @param path Alert path
   */
  private getAlertType(path: string): string {
    const seg = path.split('.');
    if (
      this.isStandardAlarm(seg[1]) ||
      path.includes('notifications.area') ||
      path.includes('notifications.buddy') ||
      path.includes('notifications.meteo.warning')
    ) {
      return seg[1];
    } else if (path.includes('notifications.navigation.closestApproach')) {
      return 'cpa';
    } else if (
      path.includes('notifications.environment.depth.') ||
      path.includes('notifications.navigation.anchor')
    ) {
      return seg[2];
    } else if (
      path.includes('notifications.navigation.course.perpendicularPassed') ||
      path.includes('notifications.navigation.course.arrivalCircleEntered')
    ) {
      return seg[3];
    } else {
      return 'notification';
    }
  }

  /**
   * @description Test if value is a Signal K standard alarm type
   * @param value String representing the alarm type
   * @returns true if value is a standard alarm
   */
  private isStandardAlarm(value: string): boolean {
    return [
      'mob',
      'sinking',
      'fire',
      'piracy',
      'flooding',
      'collision',
      'grounding',
      'listing',
      'adrift',
      'abandon',
      'aground'
    ].includes(value);
  }

  /**
   * @description Returns Alert data for supplied path
   * @param path Path of Alert
   * @returns AlertData object
   */
  public getAlert(path: string): AlertData {
    const al = this.alerts().find((i) => i[0] === path);
    return al ? al[1] : undefined;
  }

  public showAlertInfo(path: string) {
    if (!this.alertMap.has(path)) {
      this.app.showAlert('Alert', 'Alert not found!');
      return;
    }
    this.bottomSheet
      .open(AlertPropertiesModal, {
        data: { alert: this.getAlert(path) }
      })
      .afterDismissed()
      .subscribe((action) => {
        // some action
      });
  }

  /**
   * @description Acknowledge alert
   * @param path Path of the the alert to acknowledge
   */
  public acknowledge(path: string) {
    if (this.alertMap.has(path)) {
      if (this.app.featureFlags().notificationApi) {
        const alert = this.alertMap.get(path);
        this.signalk.api
          .post(
            this.app.skApiVersion,
            `notifications/${alert.id}/acknowledge`,
            {}
          )
          .subscribe(
            () => {
              this.app.debug(`Acknowledged ${alert.id}, ${path}`);
            },
            (err: HttpErrorResponse) => {
              this.app.parseHttpErrorResponse(err);
            }
          );
      } else {
        this.alertMap.get(path).acknowledged = true;
        this.emitSignals();
      }
    }
  }

  /**
   * @description Silence alert
   * @param path Path of the the alert to silence
   */
  public silence(path: string) {
    if (this.alertMap.has(path)) {
      const alert = this.alertMap.get(path);
      if (this.app.featureFlags().notificationApi) {
        this.signalk.api
          .post(this.app.skApiVersion, `notifications/${alert.id}/silence`, {})
          .subscribe(
            () => {
              this.app.debug(`Silenced ${alert.id}, ${path}`);
            },
            (err: HttpErrorResponse) => {
              this.app.parseHttpErrorResponse(err);
            }
          );
      } else {
        if (this.isStandardAlarm(alert.type)) {
          // if is standard alarm silence via server
          const id = alert.path.split('.').slice(-1)[0];
          this.signalk.api
            .post(
              this.app.skApiVersion,
              `alarms/${alert.type}/${id}/silence`,
              {}
            )
            .subscribe(
              () => {
                alert.silenced = true;
                this.emitSignals();
              },
              (err: HttpErrorResponse) => {
                this.app.showAlert(
                  `Error`,
                  `Unable to silence alarm (${path})!`,
                  err.message
                );
              }
            );
        } else {
          alert.silenced = true;
          this.emitSignals();
        }
      }
    }
  }

  /**
   * @description Clear / Cancel alert
   * @param path Path of the the alert to cancel
   */
  public clear(path: string) {
    if (this.alertMap.has(path)) {
      const alert = this.alertMap.get(path);
      if (this.app.featureFlags().notificationApi) {
        this.signalk.api
          .delete(this.app.skApiVersion, `notifications/${alert.id}`)
          .subscribe(
            () => {
              this.app.debug(`Cleared ${alert.id}, ${path}`);
            },
            (err: HttpErrorResponse) => {
              this.app.parseHttpErrorResponse(err);
            }
          );
      } else {
        if (alert.canCancel) {
          if (this.isStandardAlarm(alert.type)) {
            // if is standard alarm remove via server
            this.cancelServerAlarm(alert).subscribe(
              () => {
                this.alertMap.delete(path);
                this.emitSignals();
              },
              (err: HttpErrorResponse) => {
                this.app.showAlert(
                  `Error`,
                  `Unable to clear alarm (${path})!`,
                  err.message
                );
              }
            );
          } else {
            this.alertMap.delete(path);
            this.emitSignals();
          }
        }
      }
    }
  }

  /**
   * @description Raise Alarm on server
   * @param path Alarm type to raise
   */
  public raiseServerAlarm(alarmType: string, message?: string) {
    if (this.app.featureFlags().notificationApi) {
      this.signalk.api
        .post(this.app.skApiVersion, `notifications/mob`, { message: message })
        .subscribe(
          (r) => {
            this.app.debug(`MOB Alarm raised (${r.id})`);
          },
          (err: HttpErrorResponse) => {
            this.app.parseHttpErrorResponse(err);
          }
        );
    } else {
      this.signalk.api
        .post(this.app.skApiVersion, `alarms/${alarmType}`, {
          message: message ?? ''
        })
        .subscribe(
          () => undefined,
          (err: HttpErrorResponse) => {
            this.app.showAlert(
              'Error',
              `Unable to raise alarm: ${alarmType} \n ${err.message}`
            );
          }
        );
    }
  }

  /**
   * @description Cancel Alarm on server
   * @param alert Alarm to cancel
   * @returns Observable
   */
  public cancelServerAlarm(alert: AlertData) {
    if (this.app.featureFlags().notificationApi) {
      this.signalk.api
        .delete(this.app.skApiVersion, `notifications/${alert.id}`)
        .subscribe(
          () => {
            this.app.debug(`Cleared ${alert.id}`);
          },
          (err: HttpErrorResponse) => {
            this.app.parseHttpErrorResponse(err);
          }
        );
    } else {
      const id = alert.path.split('.').slice(-1)[0];
      return this.signalk.api.delete(
        this.app.skApiVersion,
        `alarms/${alert.type}/${id}`
      );
    }
  }

  // parse ClosestApproach message data
  private parseCpa(msg: any) {
    return {
      vesselId: msg.other ?? undefined
    };
  }
}
