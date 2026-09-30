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
    data: { vessels: { closest: string[] } };
    debug: () => void;
    showMessage: () => void;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    notifications = new Subject<NotificationMessage>();
    app = {
      featureFlags: signal({ notificationApi: true }),
      config: { display: { depthAlarm: { enabled: true }, muteSound: true } },
      data: { vessels: { closest: [] } },
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
    extra: Partial<SKNotification> & { other?: string } = {}
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

  it('leaves properties empty when the notification carries neither', () => {
    const mgr = TestBed.inject(NotificationManager);
    emit('notifications.fire', notification());

    const [[, alert]] = mgr.alerts();
    expect(alert.properties).toEqual({});
  });
});

/**
 * The server confirms an acknowledge / silence in a notification delta that the
 * `notifications.*` subscription period can hold back for a second. A second
 * press inside that window must not reach the server, which rejects it with a
 * 400 because the alarm is already acknowledged / silenced.
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

  const arrive = () => {
    const msg = new NotificationMessage();
    msg.result = {
      path: PATH,
      value: {
        id: ID,
        state: ALARM_STATE.alert,
        method: [ALARM_METHOD.visual, ALARM_METHOD.sound],
        message: 'Entered arrival zone: 22m < 100',
        status: {
          silenced: false,
          acknowledged: false,
          canSilence: true,
          canAcknowledge: true,
          canClear: false
        }
      } as SKNotification
    };
    notifications.next(msg);
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
    posts[0].response.next({ state: 'COMPLETED', statusCode: 200 });
    posts[0].response.complete();
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

  it('sends one request when MUTE is pressed twice before the delta confirms it', () => {
    const mgr = TestBed.inject(NotificationManager);
    arrive();

    mgr.silence(PATH);
    mgr.silence(PATH);

    expect(posts.map((p) => p.path)).toEqual([`notifications/${ID}/silence`]);
    expect(shown(mgr).silenced).toBe(true);
  });
});
