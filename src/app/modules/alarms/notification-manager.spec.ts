import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationManager } from './notification-manager';
import { AppFacade } from 'src/app/app.facade';
import { SKWorkerService } from '../skstream/skstream.service';
import { SignalKClient } from 'signalk-client-angular';
import {
  ALARM_METHOD,
  ALARM_STATE,
  NotificationMessage,
  SKNotification
} from 'src/app/types/stream';
import { CpaPositions } from 'src/app/types';

/**
 * Drives NotificationManager through the worker's notification stream and
 * checks what it lifts out of a Notifications API payload into
 * `AlertData.properties` (typed as AlertProperties — #755): the notification's
 * own `position`, and the other vessel named by a closest-approach alert.
 */
describe('NotificationManager alert properties (#755)', () => {
  let notifications: Subject<NotificationMessage>;
  let app: {
    featureFlags: ReturnType<typeof signal>;
    config: {
      display: { depthAlarm: { enabled: boolean }; muteSound: boolean };
    };
    data: {
      vessels: { closest: string[]; cpaPositions: Map<string, CpaPositions> };
    };
    debug: () => void;
    showMessage: () => void;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    notifications = new Subject<NotificationMessage>();
    app = {
      featureFlags: signal({ notificationApi: true }),
      config: { display: { depthAlarm: { enabled: true }, muteSound: true } },
      data: { vessels: { closest: [], cpaPositions: new Map() } },
      debug: (): void => undefined,
      showMessage: (): void => undefined
    };
    TestBed.configureTestingModule({
      providers: [
        NotificationManager,
        { provide: AppFacade, useValue: app },
        {
          provide: SKWorkerService,
          useValue: { notification$: () => notifications.asObservable() }
        },
        { provide: SignalKClient, useValue: {} },
        { provide: MatBottomSheet, useValue: {} }
      ]
    });
  });

  const notification = (
    extra: Partial<SKNotification> & { other?: string; data?: unknown } = {}
  ): SKNotification => ({
    state: ALARM_STATE.alarm,
    method: [ALARM_METHOD.visual],
    message: 'test',
    status: {
      silenced: false,
      acknowledged: false,
      canSilence: true,
      canAcknowledge: true,
      canClear: true
    },
    ...extra
  });

  const emit = (path: string, value: SKNotification) => {
    const msg = new NotificationMessage();
    msg.result = { path, value };
    notifications.next(msg);
  };

  it('does not raise a MOB on a server without the Notifications API', async () => {
    app.featureFlags.set({ notificationApi: false });
    const mgr = TestBed.inject(NotificationManager);
    expect(await mgr.raiseServerAlarm('mob', 'Person Overboard!')).toBeNull();
  });

  it('carries the notification position into the alert properties', () => {
    const mgr = TestBed.inject(NotificationManager);
    emit(
      'notifications.mob',
      notification({ position: { latitude: 25.1, longitude: -80.1 } })
    );

    const [[, alert]] = mgr.alerts();
    expect(alert.type).toBe('mob');
    expect(alert.properties.position).toEqual({
      latitude: 25.1,
      longitude: -80.1
    });
  });

  it('records the other vessel of a closest-approach alert', () => {
    const mgr = TestBed.inject(NotificationManager);
    emit(
      'notifications.navigation.closestApproach.urn:mrn:imo:mmsi:123456789',
      notification({ other: 'vessels.urn:mrn:imo:mmsi:123456789' })
    );

    const [[, alert]] = mgr.alerts();
    expect(alert.type).toBe('cpa');
    expect(alert.properties.vesselId).toBe(
      'vessels.urn:mrn:imo:mmsi:123456789'
    );
    expect(app.data.vessels.closest).toEqual([
      'vessels.urn:mrn:imo:mmsi:123456789'
    ]);
  });

  it('records the target named by data.targetRef', () => {
    const mgr = TestBed.inject(NotificationManager);
    emit(
      'notifications.navigation.closestApproach.urn:mrn:imo:mmsi:123456789',
      notification({
        data: { targetRef: 'vessels.urn:mrn:imo:mmsi:123456789' }
      })
    );

    const [[, alert]] = mgr.alerts();
    expect(alert.properties.vesselId).toBe(
      'vessels.urn:mrn:imo:mmsi:123456789'
    );
    expect(app.data.vessels.closest).toEqual([
      'vessels.urn:mrn:imo:mmsi:123456789'
    ]);
  });

  it('prefers data.targetRef over other', () => {
    const mgr = TestBed.inject(NotificationManager);
    emit(
      'notifications.navigation.closestApproach.urn:mrn:imo:mmsi:123456789',
      notification({
        data: { targetRef: 'vessels.urn:mrn:imo:mmsi:123456789' },
        other: 'vessels.urn:mrn:imo:mmsi:987654321'
      })
    );

    const [[, alert]] = mgr.alerts();
    expect(alert.properties.vesselId).toBe(
      'vessels.urn:mrn:imo:mmsi:123456789'
    );
  });

  it('takes the other vessel and the CPA positions from the alarm data', () => {
    const mgr = TestBed.inject(NotificationManager);
    emit(
      'notifications.navigation.closestApproach.urn:mrn:imo:mmsi:123456789',
      notification({
        data: {
          targetRef: 'vessels.urn:mrn:imo:mmsi:123456789',
          cpaPositions: {
            self: { latitude: 52.1, longitude: 4.2 },
            target: { latitude: 52.11, longitude: 4.21 }
          }
        }
      })
    );

    const [[, alert]] = mgr.alerts();
    expect(alert.properties.vesselId).toBe(
      'vessels.urn:mrn:imo:mmsi:123456789'
    );
    expect(app.data.vessels.closest).toEqual([
      'vessels.urn:mrn:imo:mmsi:123456789'
    ]);
    expect(
      app.data.vessels.cpaPositions.get('vessels.urn:mrn:imo:mmsi:123456789')
    ).toEqual({
      self: [4.2, 52.1],
      target: [4.21, 52.11]
    });
  });

  it('draws the most urgent CPA positions when two alarms name one vessel', () => {
    const vessel = 'vessels.urn:mrn:imo:mmsi:123456789';
    const alarm = (latitude: number, state: ALARM_STATE): SKNotification =>
      notification({
        state,
        data: {
          targetRef: vessel,
          cpaPositions: {
            self: { latitude, longitude: 4.2 },
            target: { latitude, longitude: 4.21 }
          }
        }
      });
    TestBed.inject(NotificationManager);
    emit(
      'notifications.navigation.closestApproach.radar:nav1-17',
      alarm(52.2, ALARM_STATE.alarm)
    );
    emit(
      'notifications.navigation.closestApproach.urn:mrn:imo:mmsi:123456789',
      alarm(52.1, ALARM_STATE.warn)
    );

    expect(app.data.vessels.cpaPositions.get(vessel)?.self).toEqual([
      4.2, 52.2
    ]);
  });

  it('ignores CPA positions when one of the two is missing', () => {
    const mgr = TestBed.inject(NotificationManager);
    emit(
      'notifications.navigation.closestApproach.urn:mrn:imo:mmsi:123456789',
      notification({
        data: {
          targetRef: 'vessels.urn:mrn:imo:mmsi:123456789',
          cpaPositions: { self: { latitude: 52.1, longitude: 4.2 } }
        }
      })
    );

    const [[, alert]] = mgr.alerts();
    expect(alert.properties.cpaPositions).toBeUndefined();
    expect(app.data.vessels.cpaPositions.size).toBe(0);
  });

  it('ignores CPA positions out of range or not finite', () => {
    const mgr = TestBed.inject(NotificationManager);
    for (const target of [
      { latitude: 95, longitude: 4.21 },
      { latitude: 52.11, longitude: 181 },
      { latitude: 52.11, longitude: Infinity },
      { latitude: NaN, longitude: 4.21 }
    ]) {
      emit(
        'notifications.navigation.closestApproach.urn:mrn:imo:mmsi:123456789',
        notification({
          data: {
            targetRef: 'vessels.urn:mrn:imo:mmsi:123456789',
            cpaPositions: { self: { latitude: 52.1, longitude: 4.2 }, target }
          }
        })
      );
      const [[, alert]] = mgr.alerts();
      expect(alert.properties.cpaPositions).toBeUndefined();
    }
  });

  it('leaves properties empty when the notification carries neither', () => {
    const mgr = TestBed.inject(NotificationManager);
    emit('notifications.fire', notification());

    const [[, alert]] = mgr.alerts();
    expect(alert.properties).toEqual({});
  });

  it('raises a notification sent without a method visually, without sound', () => {
    const mgr = TestBed.inject(NotificationManager);
    emit(
      'notifications.electrical.chargers.261.l1.InverterImbalance',
      notification({ state: ALARM_STATE.warn, method: undefined })
    );

    const [[path, alert]] = mgr.alerts();
    expect(path).toBe(
      'notifications.electrical.chargers.261.l1.InverterImbalance'
    );
    expect(alert.sound).toBe(false);
    expect(alert.visual).toBe(true);
  });

  it('shows no alert for a value in its nominal range', () => {
    const mgr = TestBed.inject(NotificationManager);
    emit(
      'notifications.tanks.freshWater.4.currentLevel',
      notification({ state: ALARM_STATE.nominal, message: '0.21 < value < 1' })
    );

    expect(mgr.alerts()).toEqual([]);
  });

  it('takes an alert down when its value returns to the nominal range', () => {
    const mgr = TestBed.inject(NotificationManager);
    const path = 'notifications.tanks.freshWater.4.currentLevel';
    emit(path, notification({ state: ALARM_STATE.alert }));
    expect(mgr.alerts()).toHaveLength(1);

    emit(path, notification({ state: ALARM_STATE.nominal }));

    expect(mgr.alerts()).toEqual([]);
  });

  it('keeps a notification sent with an empty method quiet', () => {
    const mgr = TestBed.inject(NotificationManager);
    emit('notifications.fire', notification({ method: [] }));

    const [[, alert]] = mgr.alerts();
    expect(alert.sound).toBe(false);
    expect(alert.visual).toBe(false);
  });
});

/**
 * The server confirms an acknowledge / silence in a notification delta that the
 * `notifications.*` subscription period can hold back for a second, and deltas
 * it sent before applying the action can arrive after the request succeeded. A
 * second press until the confirmation must not reach the server, which rejects
 * it with a 400 because the alarm is already acknowledged / silenced.
 */
describe('NotificationManager alert actions', () => {
  const PATH = 'notifications.navigation.course.arrivalCircleEntered';
  const ID = '6efdf5cc-bcb2-4b6e-9c8b-dbcd0539822b';
  let notifications: Subject<NotificationMessage>;
  let posts: Array<{ path: string; response: Subject<unknown> }>;
  let errors: unknown[];

  const configure = () =>
    TestBed.configureTestingModule({
      providers: [
        NotificationManager,
        {
          provide: AppFacade,
          useValue: {
            featureFlags: signal({ notificationApi: true }),
            config: {
              display: { depthAlarm: { enabled: true }, muteSound: true }
            },
            data: { vessels: { closest: [] } },
            skApiVersion: 2,
            debug: (): void => undefined,
            showMessage: (): void => undefined,
            parseHttpErrorResponse: (err: unknown) => errors.push(err)
          }
        },
        {
          provide: SKWorkerService,
          useValue: { notification$: () => notifications.asObservable() }
        },
        {
          provide: SignalKClient,
          useValue: {
            api: {
              post: (_version: number, path: string) => {
                const response = new Subject<unknown>();
                posts.push({ path, response });
                return response.asObservable();
              }
            }
          }
        },
        { provide: MatBottomSheet, useValue: {} }
      ]
    });

  beforeEach(() => {
    TestBed.resetTestingModule();
    notifications = new Subject<NotificationMessage>();
    posts = [];
    errors = [];
    configure();
  });

  const arrive = ({
    path = PATH,
    id = ID,
    state = ALARM_STATE.alert,
    acknowledged = false,
    silenced = false
  } = {}) => {
    const msg = new NotificationMessage();
    msg.result = {
      path,
      value: {
        id,
        state,
        method: [ALARM_METHOD.visual, ALARM_METHOD.sound],
        message: 'Entered arrival zone: 22m < 100',
        status: {
          silenced,
          acknowledged,
          canSilence: true,
          canAcknowledge: true,
          canClear: false
        }
      } as SKNotification
    };
    notifications.next(msg);
  };

  const clear = () => {
    const msg = new NotificationMessage();
    msg.result = { path: PATH, value: null };
    notifications.next(msg);
  };

  const succeed = (i = 0) => {
    posts[i].response.next({ state: 'COMPLETED', statusCode: 200 });
    posts[i].response.complete();
  };

  const shown = (mgr: NotificationManager, path = PATH) => {
    const alert = mgr.getAlert(path);
    if (!alert) {
      throw new Error(`no alert at ${path}`);
    }
    return alert;
  };

  it('shows the alert acknowledged as soon as ACK is pressed', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.acknowledge(PATH);

    expect(posts.map((p) => p.path)).toEqual([
      `notifications/${ID}/acknowledge`
    ]);
    expect(shown(mgr).acknowledged).toBe(true);
  });

  it('sends one request when ACK is pressed twice before the delta confirms it', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.acknowledge(PATH);
    mgr.acknowledge(PATH);
    succeed();
    mgr.acknowledge(PATH);

    expect(posts).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  it('reverts the acknowledgement and reports the error when the request fails', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.acknowledge(PATH);
    const failure = { status: 400, error: { message: 'Alarm not found!' } };
    posts[0].response.error(failure);

    expect(shown(mgr).acknowledged).toBe(false);
    expect(errors).toEqual([failure]);
    mgr.acknowledge(PATH);
    expect(posts).toHaveLength(2);
  });

  it('keeps the alert acknowledged when a delta sent before the acknowledgement arrives', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.acknowledge(PATH);
    arrive();

    expect(shown(mgr).acknowledged).toBe(true);
    mgr.acknowledge(PATH);
    expect(posts).toHaveLength(1);
  });

  it('reverts the alert shown after such a delta when the request fails', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.acknowledge(PATH);
    arrive();
    posts[0].response.error({ status: 400 });

    expect(shown(mgr).acknowledged).toBe(false);
  });

  it('does not carry a pending acknowledgement to a new notification on the path', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.acknowledge(PATH);
    arrive({ id: '0b6c1f7e-3d2a-4c55-9e1b-8a7f6d5c4b3a' });

    expect(shown(mgr).acknowledged).toBe(false);
  });

  it('drops the pending acknowledgement of a notification replaced on the path', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.acknowledge(PATH);
    succeed();
    arrive({ id: '0b6c1f7e-3d2a-4c55-9e1b-8a7f6d5c4b3a' });
    arrive();

    expect(shown(mgr).acknowledged).toBe(false);
  });

  it('keeps the alert acknowledged when an unconfirmed delta arrives after the request succeeded', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.acknowledge(PATH);
    succeed();
    arrive();

    expect(shown(mgr).acknowledged).toBe(true);
    mgr.acknowledge(PATH);
    expect(posts).toHaveLength(1);
  });

  it('shows the server status again once a delta confirms the acknowledgement', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.acknowledge(PATH);
    succeed();
    arrive({ acknowledged: true });
    arrive();

    expect(shown(mgr).acknowledged).toBe(false);
  });

  it('keeps an acknowledgement the server confirmed when the request fails', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.acknowledge(PATH);
    arrive({ acknowledged: true });
    posts[0].response.error({ status: 400 });

    expect(shown(mgr).acknowledged).toBe(true);
    expect(errors).toHaveLength(1);
  });

  it('shows an alarm that escalates while its acknowledgement is pending', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.acknowledge(PATH);
    succeed();
    arrive({ state: ALARM_STATE.alarm });

    expect(shown(mgr).acknowledged).toBe(false);
  });

  it('does not carry a pending acknowledgement over the alert clearing', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.acknowledge(PATH);
    succeed();
    clear();
    arrive();

    expect(shown(mgr).acknowledged).toBe(false);
  });

  it('sends one request when MUTE is pressed twice before the delta confirms it', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.silence(PATH);
    mgr.silence(PATH);

    expect(posts.map((p) => p.path)).toEqual([`notifications/${ID}/silence`]);
    expect(shown(mgr).silenced).toBe(true);
  });

  it('keeps the alert silenced in this browser when the server refuses MUTE', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.silence(PATH);
    posts[0].response.error({ status: 401 });
    arrive();

    expect(shown(mgr).silenced).toBe(true);
    expect(errors).toEqual([]);
  });

  it('keeps a refused MUTE when the server reports the alert silenced and then not', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.silence(PATH);
    posts[0].response.error({ status: 401 });
    arrive({ silenced: true });
    arrive();

    expect(shown(mgr).silenced).toBe(true);
  });

  it('keeps a refused MUTE whose silenced delta arrived before the refusal', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.silence(PATH);
    arrive({ silenced: true });
    posts[0].response.error({ status: 401 });
    arrive();

    expect(shown(mgr).silenced).toBe(true);
  });

  it('does not silence an alert that escalated before MUTE was refused', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.silence(PATH);
    arrive({ state: ALARM_STATE.alarm });
    posts[0].response.error({ status: 401 });

    expect(shown(mgr).silenced).toBe(false);
  });

  it('does not silence an alert that cleared and returned before MUTE was refused', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.silence(PATH);
    clear();
    arrive();
    posts[0].response.error({ status: 401 });

    expect(shown(mgr).silenced).toBe(false);
  });

  it('does not silence an alert that changed state and back before MUTE was refused', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.silence(PATH);
    arrive({ state: ALARM_STATE.alarm });
    arrive();
    posts[0].response.error({ status: 401 });

    expect(shown(mgr).silenced).toBe(false);
  });

  it('does not silence an alert that cleared and returned before Silence All was refused', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.silenceAll();
    clear();
    arrive();
    posts[0].response.error({ status: 401 });

    expect(shown(mgr).silenced).toBe(false);
  });

  it('does not silence an alert that changed state and back before Silence All was refused', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.silenceAll();
    arrive({ state: ALARM_STATE.alarm });
    arrive();
    posts[0].response.error({ status: 401 });

    expect(shown(mgr).silenced).toBe(false);
  });

  it('keeps a refused Silence All when the server reports the alert silenced and then not', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.silenceAll();
    posts[0].response.error({ status: 403 });
    arrive({ silenced: true });
    arrive();

    expect(shown(mgr).silenced).toBe(true);
  });

  it('sounds again when an alarm silenced in this browser escalates', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.silence(PATH);
    posts[0].response.error({ status: 403 });
    arrive({ state: ALARM_STATE.alarm });

    expect(shown(mgr).silenced).toBe(false);
  });

  it('still reports a refused ACK', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.acknowledge(PATH);
    const failure = { status: 401 };
    posts[0].response.error(failure);

    expect(shown(mgr).acknowledged).toBe(false);
    expect(errors).toEqual([failure]);
  });

  const OTHER_PATH = 'notifications.navigation.anchor';
  const OTHER_ID = '3f0c9a52-7d1e-4b8a-a6c2-5e9d8b7f1a24';

  for (const status of [401, 403]) {
    it(`silences every alert in this browser when the server refuses Silence All with ${status}`, () => {
      const mgr = TestBed.inject(NotificationManager);
      arrive();
      arrive({ path: OTHER_PATH, id: OTHER_ID });

      mgr.silenceAll();
      posts[0].response.error({ status });

      expect(posts.map((p) => p.path)).toEqual(['notifications/silenceAll']);
      expect(shown(mgr).silenced).toBe(true);
      expect(shown(mgr, OTHER_PATH).silenced).toBe(true);
      expect(errors).toEqual([]);
    });
  }

  it('shows the alerts silenced as soon as Silence All is pressed', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.silenceAll();

    expect(shown(mgr).silenced).toBe(true);
  });

  it('shows the server status again once a delta confirms Silence All', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.silenceAll();
    succeed();
    arrive({ silenced: true });
    arrive();

    expect(shown(mgr).silenced).toBe(false);
  });

  it('does not silence an alert raised while Silence All is under way', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.silenceAll();
    arrive({ path: OTHER_PATH, id: OTHER_ID });
    posts[0].response.error({ status: 401 });

    expect(shown(mgr, OTHER_PATH).silenced).toBe(false);
  });

  it('reverts Silence All and reports the error when the request fails', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.silenceAll();
    const failure = { status: 500 };
    posts[0].response.error(failure);

    expect(shown(mgr).silenced).toBe(false);
    expect(errors).toEqual([failure]);
  });

  it('returns the id the server gives a raised MOB', async () => {
    const mgr = TestBed.inject(NotificationManager);
    const raised = mgr.raiseServerAlarm('mob', 'Person Overboard!');
    posts[0].response.next({ state: 'COMPLETED', statusCode: 200, id: ID });
    posts[0].response.complete();
    expect(await raised).toEqual({ id: ID });
  });

  it('says a MOB was not taken, without an error, when nobody is logged in', async () => {
    const mgr = TestBed.inject(NotificationManager);
    const raised = mgr.raiseServerAlarm('mob', 'Person Overboard!');
    posts[0].response.error(new HttpErrorResponse({ status: 401 }));
    expect(await raised).toBeNull();
    expect(errors).toEqual([]);
  });

  it('gives up on a MOB request the server does not answer in time', async () => {
    vi.useFakeTimers();
    try {
      const mgr = TestBed.inject(NotificationManager);
      const raised = mgr.raiseServerAlarm('mob', 'Person Overboard!');
      vi.advanceTimersByTime(3001);
      expect(await raised).toBeNull();
      expect(errors).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports any other failure to raise a MOB', async () => {
    const mgr = TestBed.inject(NotificationManager);
    const raised = mgr.raiseServerAlarm('mob', 'Person Overboard!');
    const failure = new HttpErrorResponse({ status: 500 });
    posts[0].response.error(failure);
    expect(await raised).toBeNull();
    expect(errors).toEqual([failure]);
  });

  it('shows a MOB kept on this display until it is ended there', () => {
    const mgr = TestBed.inject(NotificationManager);
    const at = Date.UTC(2026, 10, 9, 12);
    const id = mgr.addLocalMob({ latitude: -18.1, longitude: 178.4 }, at);
    const [[, alert]] = mgr.mobAlerts();
    expect(alert).toMatchObject({
      id,
      type: 'mob',
      local: true,
      createdAt: at,
      canCancel: true,
      canAcknowledge: false,
      properties: { position: { latitude: -18.1, longitude: 178.4 } }
    });

    mgr.removeLocalMob(alert);
    expect(mgr.mobAlerts()).toEqual([]);
  });

  describe('across a reload', () => {
    const KEY = 'fb-local-mobs';
    const reload = () => {
      TestBed.resetTestingModule();
      configure();
      return TestBed.inject(NotificationManager);
    };
    afterEach(() => localStorage.removeItem(KEY));

    it('keeps a MOB on this display until it is ended there', () => {
      const at = Date.UTC(2026, 10, 9, 12);
      TestBed.inject(NotificationManager).addLocalMob(
        { latitude: -18.1, longitude: 178.4 },
        at
      );

      const after = reload();
      const [[, alert]] = after.mobAlerts();
      expect(alert).toMatchObject({
        local: true,
        createdAt: at,
        properties: { position: { latitude: -18.1, longitude: 178.4 } }
      });

      after.removeLocalMob(alert);
      expect(reload().mobAlerts()).toEqual([]);
    });

    it('ignores what it cannot read', () => {
      localStorage.setItem(
        KEY,
        JSON.stringify([
          null,
          { createdAt: 'x' },
          { createdAt: 5, position: { latitude: 'a', longitude: 1 } }
        ])
      );
      const [[, alert], ...rest] = reload().mobAlerts();
      expect(rest).toEqual([]);
      expect(alert).toMatchObject({ createdAt: 5, properties: {} });

      localStorage.setItem(KEY, '{not json');
      expect(reload().mobAlerts()).toEqual([]);
    });
  });
});

/**
 * The buddy list plugin notifies on notifications.buddy.<vessel urn> when a
 * buddy comes near. Freeboard shows that as a passing message; where it has
 * the buddy's position, the message offers LOCATE, which centres the map on
 * the buddy.
 */
describe('NotificationManager buddy notifications', () => {
  const BUDDY = 'urn:mrn:imo:mmsi:520000001';
  let notifications: Subject<NotificationMessage>;
  let pressed: Subject<void>;
  let shown: Array<[string, boolean, number, string | undefined]>;
  let aisTargets: Map<
    string,
    { position: number[]; positionReceived: boolean }
  >;
  let mapMoveRequest: ReturnType<typeof signal>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    notifications = new Subject<NotificationMessage>();
    pressed = new Subject<void>();
    shown = [];
    aisTargets = new Map();
    mapMoveRequest = signal(null);
    TestBed.configureTestingModule({
      providers: [
        NotificationManager,
        {
          provide: AppFacade,
          useValue: {
            featureFlags: signal({ notificationApi: true }),
            config: {
              display: { depthAlarm: { enabled: true }, muteSound: true }
            },
            data: { vessels: { closest: [], aisTargets } },
            debug: (): void => undefined,
            mapMoveRequest,
            showMessage: (
              message: string,
              sound: boolean,
              duration: number,
              action?: string
            ) => {
              shown.push([message, sound, duration, action]);
              return { onAction: () => pressed.asObservable() };
            }
          }
        },
        {
          provide: SKWorkerService,
          useValue: { notification$: () => notifications.asObservable() }
        },
        { provide: SignalKClient, useValue: {} },
        { provide: MatBottomSheet, useValue: {} }
      ]
    });
  });

  const buddyNear = () => {
    const msg = new NotificationMessage();
    msg.result = {
      path: `notifications.buddy.${BUDDY}`,
      value: {
        state: ALARM_STATE.alert,
        method: [ALARM_METHOD.visual, ALARM_METHOD.sound],
        message: 'Your buddy Mako is near',
        status: {
          silenced: false,
          acknowledged: false,
          canSilence: true,
          canAcknowledge: true,
          canClear: true
        }
      } as SKNotification
    };
    notifications.next(msg);
  };

  it('offers LOCATE, which centres the map on where the buddy is', () => {
    aisTargets.set(`vessels.${BUDDY}`, {
      position: [177.2, -17.8],
      positionReceived: true
    });
    const mgr = TestBed.inject(NotificationManager);
    buddyNear();

    expect(shown).toHaveLength(1);
    expect(shown[0][0]).toBe('Your buddy Mako is near');
    expect(shown[0][3]).toBe('LOCATE');
    expect(mgr.alerts()).toHaveLength(0);

    // the buddy has moved on by the time LOCATE is pressed
    const buddy = aisTargets.get(`vessels.${BUDDY}`);
    if (!buddy) {
      throw new Error('no buddy vessel');
    }
    buddy.position = [177.25, -17.75];
    pressed.next();

    // A place to show: on the active pane when the chart is split.
    expect(mapMoveRequest()).toEqual({
      center: [177.25, -17.75],
      activePane: true
    });
  });

  it('offers no LOCATE for a buddy without a position', () => {
    aisTargets.set(`vessels.${BUDDY}`, {
      position: [0, 0],
      positionReceived: false
    });
    TestBed.inject(NotificationManager);
    buddyNear();

    expect(shown).toHaveLength(1);
    expect(shown[0][3]).toBeUndefined();
  });
});
