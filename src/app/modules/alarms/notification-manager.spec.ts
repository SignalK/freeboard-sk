import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

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
      debug: () => undefined,
      showMessage: () => undefined
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

    expect(app.data.vessels.cpaPositions.get(vessel).self).toEqual([4.2, 52.2]);
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

  beforeEach(() => {
    TestBed.resetTestingModule();
    notifications = new Subject<NotificationMessage>();
    posts = [];
    errors = [];
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
            debug: () => undefined,
            showMessage: () => undefined,
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
  });

  const arrive = ({
    id = ID,
    state = ALARM_STATE.alert,
    acknowledged = false,
    silenced = false
  } = {}) => {
    const msg = new NotificationMessage();
    msg.result = {
      path: PATH,
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

  const shown = (mgr: NotificationManager) => mgr.getAlert(PATH);

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
            debug: () => undefined,
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
    aisTargets.get(`vessels.${BUDDY}`).position = [177.25, -17.75];
    pressed.next();

    expect(mapMoveRequest()).toEqual({ center: [177.25, -17.75] });
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
