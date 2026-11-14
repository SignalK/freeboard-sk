import { inject, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import {
  ALARM_METHOD,
  ALARM_STATE,
  NotificationMessage,
  PathValue,
  SKNotification
} from '../../types/stream';
import { CpaPositions, Position, SKPosition } from 'src/app/types';
import { AppFacade } from 'src/app/app.facade';
import { SKWorkerService } from '../skstream/skstream.service';
import { AlertData, AlertProperties } from './components/alert.component';
import { getAlertIcon } from '../icons';
import { SignalKClient } from 'signalk-client-angular';
import { AlertPropertiesModal } from './components/alert-properties-modal';

/**
 * MOBs kept on this display only (addLocalMob()). Stored so that they outlive
 * a reload, which a tablet browser does to a tab in the background.
 */
const LOCAL_MOB_STORAGE_KEY = 'fb-local-mobs';

interface StoredLocalMob {
  createdAt: number;
  position: SKPosition | null;
}

/** The stored local MOBs that are well formed; storage may hold anything. */
function parseLocalMobs(raw: string | null): StoredLocalMob[] {
  let value: unknown;
  try {
    value = JSON.parse(raw ?? '[]');
  } catch {
    return [];
  }
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((v: Partial<StoredLocalMob> | null) => {
    if (!v || !Number.isFinite(v.createdAt)) {
      return [];
    }
    const p = v.position;
    const position =
      p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
        ? { latitude: p.latitude, longitude: p.longitude }
        : null;
    return [{ createdAt: v.createdAt as number, position }];
  });
}

/**
 * How long a raised alarm may wait for the server. A MOB that waits longer,
 * on a dropped network or a rebooting server, is kept on this display instead.
 */
const RAISE_TIMEOUT_MS = 3000;

/** How long a buddy's message stays up: long enough to press LOCATE. */
const BUDDY_MESSAGE_MS = 10000;

type AlertItems = Array<[string, AlertData]>;

/**
 * What became of a raised alarm: the id the server gave it, or null when the
 * server did not take it. That is the case on a display nobody is logged in
 * to, on a server without the Notifications API (or before Freeboard has
 * found it), and when the request fails or gets no answer in time; only a
 * failed request is reported as an error.
 */
export type RaiseResult = { id: string } | null;

type AlertFlag = 'acknowledged' | 'silenced';

/** An acknowledge / silence request and the alarm state it was sent for */
interface PendingAction {
  state: AlertData['priority'];
  /** The request has not been answered yet */
  inFlight: boolean;
  /** A delta confirmed the action while the request was in flight */
  confirmed?: boolean;
  /** A silence the server refused, kept in this browser only (isRefused()) */
  local?: boolean;
}

/** The Notifications API gives every notification an id and a status. */
type ApiNotification = SKNotification &
  Required<Pick<SKNotification, 'id' | 'status'>>;

/**
 * `navigation.closestApproach` notification. The other vessel is named by
 * `data.targetRef` (the shared collision alarm shape); `other` is the older,
 * non-standard field some producers still send.
 */
interface CpaNotification extends SKNotification {
  data?: {
    targetRef?: string;
    cpaPositions?: { self?: unknown; target?: unknown };
  };
  other?: string;
}

/**
 * Whether the server refused an action because the user may not change
 * notifications, as on a display nobody is logged in to. Freeboard then keeps
 * a silence in this browser only, so a sounding alarm can still be quietened.
 * It lasts until the alarm changes state, as one the server silenced would.
 */
function isRefused(err: HttpErrorResponse): boolean {
  return err?.status === 401 || err?.status === 403;
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
    const localMobs = this.readLocalMobs();
    if (localMobs.length) {
      localMobs.forEach((mob) => this.showLocalMob(mob));
      this.emitSignals();
    }

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
    const cpaAlerts = alerts.filter((i) => i[1].type === 'cpa');
    this.app.data.vessels.closest = cpaAlerts
      .map((i) => i[1].properties.vesselId)
      .filter((id): id is string => id !== undefined);
    // alerts are sorted most urgent first, so that one's positions are drawn
    // when several alarms name the same vessel
    const cpaPositions = new Map<string, CpaPositions>();
    cpaAlerts.forEach(([, alert]) => {
      const { vesselId, cpaPositions: positions } = alert.properties ?? {};
      if (vesselId && positions && !cpaPositions.has(vesselId)) {
        cpaPositions.set(vesselId, positions);
      }
    });
    this.app.data.vessels.cpaPositions = cpaPositions;
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

    // normal and nominal both mean nothing is wrong: a value back in range,
    // or a switch or level in its expected state
    const state = (msg.value as SKNotification | undefined)?.state;
    if (
      !msg.value ||
      state === ALARM_STATE.normal ||
      state === ALARM_STATE.nominal
    ) {
      const cleared = this.alertMap.get(msg.path);
      if (cleared) {
        this.dropPendingActions(cleared.id);
        this.alertMap.delete(msg.path);
        this.emitSignals();
      }
      return;
    }

    let alert: AlertData | undefined;

    // Test for Notifications API
    if (this.app.featureFlags().notificationApi) {
      const v = msg.value as ApiNotification;
      const replaced = this.alertMap.get(msg.path);
      if (replaced && replaced.id !== v.id) {
        this.dropPendingActions(replaced.id);
      }
      this.settlePendingActions(v);
      // A missing method (which breaks the spec) is not `[]`, which the server
      // sends for "acknowledged, keep quiet": still show it, without sound.
      const method = v.method ?? [ALARM_METHOD.visual];
      alert = {
        id: v.id,
        path: msg.path,
        priority: v.state,
        message: v.message,
        sound: method.includes(ALARM_METHOD.sound),
        visual: method.includes(ALARM_METHOD.visual),
        properties: {},
        acknowledged: v.status.acknowledged,
        silenced: v.status.silenced,
        icon: {},
        type: undefined,
        canAcknowledge: v.status.canAcknowledge,
        canSilence: v.status.canSilence,
        canCancel: v.status.canClear,
        createdAt: v.createdAt
          ? new Date(v.createdAt).valueOf()
          : replaced && replaced.id === v.id
            ? replaced.createdAt
            : Date.now()
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
    if (!alert) {
      return;
    }

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
          this.app.mapMoveRequest.set({ center: at, activePane: true });
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
  public getAlert(path: string): AlertData | undefined {
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
   * dropped, and the alert shows the server's latest status again, except for a
   * silence the server refuses to this user, which stays (isRefused()).
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
    const entry: PendingAction = { state: alert.priority, inFlight: true };
    pending.set(id, entry);
    this.emitSignals();
    this.signalk.api
      .post(this.app.skApiVersion, `notifications/${id}/${action}`, {})
      .subscribe(
        () => {
          this.app.debug(`${action} ${id}, ${path}`);
          this.answerPendingAction(pending, id, entry, 'done');
        },
        (err: HttpErrorResponse) => {
          if (action === 'silence' && isRefused(err)) {
            this.answerPendingAction(pending, id, entry, 'refused');
            return;
          }
          this.answerPendingAction(pending, id, entry, 'failed');
          this.app.parseHttpErrorResponse(err);
        }
      );
  }

  /**
   * Apply the answer to an action's request to its pending entry, unless a
   * delta has already dropped the entry because the alert cleared, was
   * replaced or changed state; the answer then concerns an alarm that is gone.
   * A refused silence stays in this browser (isRefused()), and a successful
   * request whose delta already confirmed it is settled.
   */
  private answerPendingAction(
    pending: Map<string, PendingAction>,
    id: string,
    entry: PendingAction,
    answer: 'done' | 'refused' | 'failed'
  ) {
    entry.inFlight = false;
    if (pending.get(id) !== entry) {
      return;
    }
    if (answer === 'refused') {
      entry.local = true;
    } else if (answer === 'failed' || entry.confirmed) {
      pending.delete(id);
      this.emitSignals();
    }
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
   * not hide the escalated alarm. A confirmation that arrives while the
   * request is in flight is noted, and the answer settles it, since a refusal
   * keeps the silence in this browser after all.
   * @param v Notification value
   */
  private settlePendingActions(v: ApiNotification) {
    for (const flag of ['acknowledged', 'silenced'] as const) {
      const entry = this.pendingActions[flag].get(v.id);
      if (!entry) {
        continue;
      }
      if (v.state !== entry.state) {
        this.pendingActions[flag].delete(v.id);
      } else if (v.status[flag] && !entry.local) {
        if (entry.inFlight) {
          entry.confirmed = true;
        } else {
          this.pendingActions[flag].delete(v.id);
        }
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
   * @description Silence All alerts. Each alert it covers shows silenced
   * straight away, as for MUTE (see applyAlertAction()). Only the alerts there
   * when it is pressed are covered, so an alarm raised or escalated while the
   * request is under way still sounds.
   */
  public silenceAll() {
    if (!this.app.featureFlags().notificationApi) {
      return;
    }
    const pending = this.pendingActions.silenced;
    const entries = new Map<string, PendingAction>();
    for (const alert of this.alertMap.values()) {
      if (alert.canSilence && !alert.silenced && !pending.has(alert.id)) {
        const entry: PendingAction = { state: alert.priority, inFlight: true };
        pending.set(alert.id, entry);
        entries.set(alert.id, entry);
      }
    }
    this.emitSignals();
    this.signalk.api
      .post(this.app.skApiVersion, `notifications/silenceAll`, {})
      .subscribe(
        () => {
          this.app.debug(`Silenced All alerts`);
          for (const [id, entry] of entries) {
            this.answerPendingAction(pending, id, entry, 'done');
          }
        },
        (err: HttpErrorResponse) => {
          const answer = isRefused(err) ? 'refused' : 'failed';
          for (const [id, entry] of entries) {
            this.answerPendingAction(pending, id, entry, answer);
          }
          if (answer === 'failed') {
            this.app.parseHttpErrorResponse(err);
          }
        }
      );
  }

  /**
   * @description Clear / Cancel alert
   * @param path Path of the the alert to cancel
   */
  public clear(path: string) {
    const alert = this.alertMap.get(path);
    if (alert) {
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
  public async raiseServerAlarm(
    alarmType: string,
    message?: string
  ): Promise<RaiseResult> {
    if (!this.app.featureFlags().notificationApi) {
      return null;
    }
    try {
      const r = await firstValueFrom(
        this.signalk.api
          .post(this.app.skApiVersion, `notifications/mob`, {
            message: message
          })
          .pipe(timeout(RAISE_TIMEOUT_MS))
      );
      const id = (r as { id?: string }).id;
      this.app.debug(`MOB Alarm raised (${id})`);
      return id ? { id } : null;
    } catch (err) {
      if (err instanceof TimeoutError) {
        this.app.debug('MOB request timed out');
      } else if (!isRefused(err as HttpErrorResponse)) {
        this.app.parseHttpErrorResponse(err as HttpErrorResponse);
      }
      return null;
    }
  }

  /**
   * Show a MOB the server did not take on this display alone, so the crew still
   * get its card and marker. It lasts, across reloads, until it is ended here.
   * @returns The local alert's id
   */
  public addLocalMob(position: SKPosition | null, createdAt: number): string {
    const id = this.showLocalMob({ createdAt, position });
    this.emitSignals();
    this.writeLocalMobs();
    return id;
  }

  /** End a MOB shown on this display alone. */
  public removeLocalMob(alert: AlertData) {
    if (alert.local && this.alertMap.delete(alert.path)) {
      this.emitSignals();
      this.writeLocalMobs();
    }
  }

  private showLocalMob({ createdAt, position }: StoredLocalMob): string {
    const id = `local-${createdAt}`;
    const alert: AlertData = {
      id,
      path: `notifications.mob.${id}`,
      priority: ALARM_STATE.emergency,
      message: 'Person Overboard!',
      sound: false,
      visual: true,
      properties: position ? { position } : {},
      icon: {},
      type: 'mob',
      acknowledged: false,
      silenced: false,
      canAcknowledge: false,
      canSilence: false,
      canCancel: true,
      createdAt,
      local: true
    };
    alert.icon = getAlertIcon(alert);
    this.alertMap.set(alert.path, alert);
    return id;
  }

  private readLocalMobs(): StoredLocalMob[] {
    try {
      return parseLocalMobs(localStorage.getItem(LOCAL_MOB_STORAGE_KEY));
    } catch {
      return [];
    }
  }

  private writeLocalMobs() {
    const mobs: StoredLocalMob[] = [...this.alertMap.values()]
      .filter((a) => a.local)
      .map((a) => ({
        createdAt: a.createdAt,
        position: a.properties.position ?? null
      }));
    try {
      if (mobs.length) {
        localStorage.setItem(LOCAL_MOB_STORAGE_KEY, JSON.stringify(mobs));
      } else {
        localStorage.removeItem(LOCAL_MOB_STORAGE_KEY);
      }
    } catch {
      // storage unavailable: the MOB stays until this page is reloaded
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
    const self = toPosition(msg.data?.cpaPositions?.self);
    const target = toPosition(msg.data?.cpaPositions?.target);
    return {
      vesselId: msg.data?.targetRef ?? msg.other ?? undefined,
      cpaPositions: self && target ? { self, target } : undefined
    };
  }
}

/** A Signal K `{ latitude, longitude }` as a [lon, lat] map position. */
function toPosition(value: unknown): Position | undefined {
  const p = value as { latitude?: unknown; longitude?: unknown } | null;
  const latitude = p?.latitude;
  const longitude = p?.longitude;
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return undefined;
  }
  return [longitude, latitude];
}
