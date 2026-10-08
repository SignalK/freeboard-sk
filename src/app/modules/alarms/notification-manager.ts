import { inject, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import {
  ALARM_METHOD,
  NotificationMessage,
  PathValue,
  SKNotification
} from '../../types/stream';
import { AppFacade } from 'src/app/app.facade';
import { SKWorkerService } from '../skstream/skstream.service';
import { AlertData, AlertProperties } from './components/alert.component';
import { getAlertIcon } from '../icons';
import { SignalKClient } from 'signalk-client-angular';
import { AlertPropertiesModal } from './components/alert-properties-modal';

/** How long a buddy's message stays up: long enough to press LOCATE. */
const BUDDY_MESSAGE_MS = 10000;

type AlertItems = Array<[string, AlertData]>;

type AlertFlag = 'acknowledged' | 'silenced';

/** An acknowledge / silence request and the alarm state it was sent for */
interface PendingAction {
  state: AlertData['priority'];
}

/**
 * `navigation.closestApproach` notification. The other vessel is named by
 * `data.targetRef` (the shared collision alarm shape); `other` is the older,
 * non-standard field some producers still send.
 */
interface CpaNotification extends SKNotification {
  data?: { targetRef?: string };
  other?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationManager {
  /** Alerts as last reported by the server */
  private alertMap: Map<string, AlertData>;
  /**
   * Acknowledge / silence actions the server has not yet confirmed, keyed by
   * alert id. emitSignals() shows them over the server's status; see
   * applyAlertAction().
   */
  private pendingActions: Record<AlertFlag, Map<string, PendingAction>> = {
    acknowledged: new Map(),
    silenced: new Map()
  };

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
    const alerts = Array.from(
      this.alertMap,
      ([path, alert]): [string, AlertData] => [
        path,
        this.withPendingActions(alert)
      ]
    ).sort((a, b) => {
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
        this.dropPendingActions(this.alertMap.get(msg.path).id);
        this.alertMap.delete(msg.path);
        this.emitSignals();
      }
      return;
    }

    let alert: AlertData;

    // Test for Notifications API
    if (this.app.featureFlags().notificationApi) {
      const v: SKNotification = msg.value as SKNotification;
      const replaced = this.alertMap.get(msg.path);
      if (replaced && replaced.id !== v.id) {
        this.dropPendingActions(replaced.id);
      }
      this.settlePendingActions(v);
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
    } /* else {
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
    } */

    alert.type = alertType;
    alert.icon = getAlertIcon(alert);
    if ((msg.value as SKNotification).position) {
      alert.properties.position = (msg.value as SKNotification).position;
    }

    if (['buddy'].includes(alertType)) {
      this.showBuddyMessage(msg.path, alert);
      return;
    } else {
      // alert
      if (alert.type === 'cpa') {
        alert.properties = this.parseCpa(msg.value as CpaNotification);
      }
      this.alertMap.set(alert.path, alert);
      this.emitSignals();
    }
  }

  /**
   * A buddy's notification is shown as a passing message, not an alert. Where
   * Freeboard has the buddy's position, it offers LOCATE, which centres the
   * map on the buddy.
   */
  private showBuddyMessage(path: string, alert: AlertData) {
    // the buddy list plugin notifies on notifications.buddy.<vessel urn>
    const id = `vessels.${path.split('.').slice(2).join('.')}`;
    const position = () => {
      const buddy = this.app.data.vessels.aisTargets.get(id);
      return buddy?.positionReceived ? buddy.position : undefined;
    };
    this.app
      .showMessage(
        alert.message,
        !this.app.config.display.muteSound && alert.sound,
        BUDDY_MESSAGE_MS,
        position() ? 'LOCATE' : undefined
      )
      .onAction()
      .subscribe(() => {
        const at = position();
        if (at) {
          this.app.mapMoveRequest.set({ center: at });
        }
      });
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
      .subscribe(() => {
        // some action
      });
  }

  /**
   * @description Acknowledge alert
   * @param path Path of the the alert to acknowledge
   */
  public acknowledge(path: string) {
    this.applyAlertAction(path, 'acknowledge', 'acknowledged');
  }

  /**
   * @description Silence alert
   * @param path Path of the the alert to silence
   */
  public silence(path: string) {
    this.applyAlertAction(path, 'silence', 'silenced');
  }

  /**
   * @description Send an acknowledge / silence request for an alert and show
   * its result straight away. The server confirms it in a notification delta,
   * which the `notifications.*` subscription period can hold back for up to a
   * second, and deltas it sent before applying the action can still arrive
   * after the request succeeds. Showing the server's status meanwhile would
   * bring the alert's buttons back, and the server rejects a second press with
   * a 400 because the action is already applied.
   *
   * The action is therefore kept pending, shown over the server's status, until
   * a delta confirms it (settlePendingActions()). If the request fails it is
   * dropped, and the alert shows the server's latest status again.
   * @param path Path of the alert
   * @param action Notifications API action
   * @param flag Alert status flag the action sets
   */
  private applyAlertAction(
    path: string,
    action: 'acknowledge' | 'silence',
    flag: AlertFlag
  ) {
    const alert = this.alertMap.get(path);
    const pending = this.pendingActions[flag];
    if (
      !alert ||
      alert[flag] ||
      pending.has(alert.id) ||
      !this.app.featureFlags().notificationApi
    ) {
      return;
    }
    const { id } = alert;
    const entry: PendingAction = { state: alert.priority };
    pending.set(id, entry);
    this.emitSignals();
    this.signalk.api
      .post(this.app.skApiVersion, `notifications/${id}/${action}`, {})
      .subscribe(
        () => {
          this.app.debug(`${action} ${id}, ${path}`);
        },
        (err: HttpErrorResponse) => {
          if (pending.get(id) === entry) {
            pending.delete(id);
            this.emitSignals();
          }
          this.app.parseHttpErrorResponse(err);
        }
      );
  }

  /**
   * @description Returns the alert with its pending actions applied
   * @param alert Alert as reported by the server
   */
  private withPendingActions(alert: AlertData): AlertData {
    const acknowledged =
      alert.acknowledged || this.pendingActions.acknowledged.has(alert.id);
    const silenced =
      alert.silenced || this.pendingActions.silenced.has(alert.id);
    return acknowledged === alert.acknowledged && silenced === alert.silenced
      ? alert
      : { ...alert, acknowledged, silenced };
  }

  /**
   * @description Drop the pending actions a notification delta settles: those
   * it confirms, and those sent for a different alarm state. The server clears
   * acknowledged / silenced when an alarm escalates, so a pending action must
   * not hide the escalated alarm.
   * @param v Notification value
   */
  private settlePendingActions(v: SKNotification) {
    for (const flag of ['acknowledged', 'silenced'] as const) {
      const entry = this.pendingActions[flag].get(v.id);
      if (entry && (v.status[flag] || v.state !== entry.state)) {
        this.pendingActions[flag].delete(v.id);
      }
    }
  }

  /**
   * @description Drop the pending actions of an alert that has cleared
   * @param id Alert id
   */
  private dropPendingActions(id: string) {
    this.pendingActions.acknowledged.delete(id);
    this.pendingActions.silenced.delete(id);
  }

  /**
   * @description Silence All alerts
   */
  public silenceAll() {
    if (this.app.featureFlags().notificationApi) {
      this.signalk.api
        .post(this.app.skApiVersion, `notifications/silenceAll`, {})
        .subscribe(
          () => {
            this.app.debug(`Silenced All alerts`);
          },
          (err: HttpErrorResponse) => {
            this.app.parseHttpErrorResponse(err);
          }
        );
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
    }
  }

  // parse ClosestApproach message data
  private parseCpa(msg: CpaNotification): AlertProperties {
    return {
      vesselId: msg.data?.targetRef ?? msg.other ?? undefined
    };
  }
}
