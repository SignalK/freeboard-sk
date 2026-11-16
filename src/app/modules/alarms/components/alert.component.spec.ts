import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { AppFacade } from 'src/app/app.facade';
import type { ALARM_STATE } from 'src/app/types';
import { CourseService } from '../../course';
import { MobService } from '../mob.service';
import { NotificationManager } from '../notification-manager';
import { AlertComponent, AlertData } from './alert.component';

interface RouteContext {
  pointIndex: number;
  pointTotal: number;
  serverAdvances: boolean;
}

function mount(
  alert: Partial<AlertData>,
  route?: RouteContext
): ComponentFixture<AlertComponent> {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: AppFacade,
        useValue: {
          uiCtrl: signal({ alertList: false }),
          config: {
            course: route
              ? {
                  autoNextPointOnArrival: true,
                  autoNextPointTrigger: 'perpendicularPassed',
                  autoNextPointDelay: 5000
                }
              : {}
          },
          data: { activeRoute: route ? 'rte-1' : null, vessels: { self: {} } },
          audio: {},
          formatValueForDisplay: () => ''
        }
      },
      { provide: NotificationManager, useValue: {} },
      {
        provide: CourseService,
        useValue: {
          courseData: signal({
            position: null,
            pointIndex: route?.pointIndex ?? -1,
            pointTotal: route?.pointTotal ?? 0
          }),
          serverAdvancesRoute: signal(route?.serverAdvances ?? false)
        }
      },
      { provide: MobService, useValue: {} }
    ]
  });
  const fixture = TestBed.createComponent(AlertComponent);
  fixture.componentRef.setInput('alert', {
    id: 'a1',
    path: 'notifications.x',
    priority: 'emergency',
    message: 'Alert',
    sound: false,
    visual: true,
    properties: {},
    icon: {},
    acknowledged: false,
    silenced: false,
    createdAt: Date.now(),
    ...alert
  } as AlertData);
  fixture.detectChanges();
  return fixture;
}

const labels = (f: ComponentFixture<AlertComponent>) =>
  Array.from((f.nativeElement as HTMLElement).querySelectorAll('button')).map(
    (b) => b.textContent?.trim() ?? ''
  );

describe('AlertComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('lets an alert that cannot be acknowledged be dismissed', () => {
    const f = mount({ canAcknowledge: false });
    expect(labels(f).some((l) => l.includes('Dismiss'))).toBe(true);
  });

  it('keeps a MOB that cannot be acknowledged up, with no Dismiss', () => {
    const f = mount({ type: 'mob', canAcknowledge: false, canCancel: true });
    expect(labels(f).some((l) => l.includes('Dismiss'))).toBe(false);
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('mat-progress-bar')).toBeNull();
    expect(
      (el.querySelector('mat-card-actions') as HTMLElement).style.display
    ).toBe('none');
    expect(labels(f).some((l) => l.includes('END MOB'))).toBe(true);
  });

  it('keeps an acknowledged MOB card up with its own actions only', () => {
    const f = mount({
      type: 'mob',
      acknowledged: true,
      canAcknowledge: true,
      canCancel: true,
      visual: false
    });
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('fb-mob-readout')).not.toBeNull();
    const actions = el.querySelector('mat-card-actions') as HTMLElement;
    expect(actions.style.display).toBe('none');
    const readoutButtons = Array.from(
      el.querySelectorAll('fb-mob-readout button')
    ).map((b) => b.textContent?.trim());
    expect(readoutButtons).toEqual(['close END MOB']);
  });

  describe('on arriving at a route point', () => {
    const arrival: Partial<AlertData> = {
      type: 'perpendicularPassed',
      priority: 'alert' as ALARM_STATE,
      canAcknowledge: false
    };

    it('counts down to the next point itself', () => {
      const f = mount(arrival, {
        pointIndex: 1,
        pointTotal: 4,
        serverAdvances: false
      });
      expect(labels(f).some((l) => l.includes('Next point in'))).toBe(true);
    });

    it('leaves advancing to a server that advances the route', () => {
      const f = mount(arrival, {
        pointIndex: 1,
        pointTotal: 4,
        serverAdvances: true
      });
      expect(labels(f).some((l) => l.includes('Next point in'))).toBe(false);
      expect(labels(f).some((l) => l.includes('NEXT POINT'))).toBe(true);
    });

    it('still ends the route at its last point', () => {
      const f = mount(arrival, {
        pointIndex: 3,
        pointTotal: 4,
        serverAdvances: true
      });
      expect(labels(f).some((l) => l.includes('End Route in'))).toBe(true);
    });
  });
});
