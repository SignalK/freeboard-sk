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
