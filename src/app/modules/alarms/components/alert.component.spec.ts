import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
          serverAdvancesRoute: vi.fn(() =>
            Promise.resolve(route?.serverAdvances ?? false)
          )
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

    const answered = async (f: ComponentFixture<AlertComponent>) => {
      await Promise.resolve();
      f.detectChanges();
      return f;
    };
    const serverRead = () =>
      TestBed.inject(CourseService).serverAdvancesRoute as ReturnType<
        typeof vi.fn
      >;

    it('counts down to the next point itself', async () => {
      const f = await answered(
        mount(arrival, { pointIndex: 1, pointTotal: 4, serverAdvances: false })
      );
      expect(labels(f).some((l) => l.includes('Next point in'))).toBe(true);
    });

    it('leaves advancing to a server that advances the route', async () => {
      const f = mount(arrival, {
        pointIndex: 1,
        pointTotal: 4,
        serverAdvances: true
      });
      expect(labels(f).some((l) => l.includes('NEXT POINT'))).toBe(false);
      await answered(f);
      expect(labels(f).some((l) => l.includes('Next point in'))).toBe(false);
      expect(labels(f).some((l) => l.includes('NEXT POINT'))).toBe(false);
    });

    it('asks the server again at every arrival, even with the same id', async () => {
      const f = await answered(
        mount(arrival, { pointIndex: 1, pointTotal: 4, serverAdvances: true })
      );
      f.componentRef.setInput('alert', {
        ...f.componentInstance.alert(),
        createdAt: f.componentInstance.alert().createdAt + 1000
      });
      f.detectChanges();
      expect(serverRead()).toHaveBeenCalledTimes(2);
    });

    it('takes only the answer for the latest arrival', async () => {
      const f = mount(arrival, {
        pointIndex: 1,
        pointTotal: 4,
        serverAdvances: true
      });
      let answerFirst: (advances: boolean) => void = () => undefined;
      serverRead().mockReset();
      serverRead()
        .mockReturnValueOnce(
          new Promise<boolean>((resolve) => (answerFirst = resolve))
        )
        .mockResolvedValue(true);
      f.componentRef.setInput('alert', {
        ...f.componentInstance.alert(),
        createdAt: f.componentInstance.alert().createdAt + 1000
      });
      f.detectChanges();
      f.componentRef.setInput('alert', {
        ...f.componentInstance.alert(),
        createdAt: f.componentInstance.alert().createdAt + 2000
      });
      f.detectChanges();
      await answered(f);
      answerFirst(false);
      await answered(f);
      expect(labels(f).some((l) => l.includes('Next point in'))).toBe(false);
      expect(labels(f).some((l) => l.includes('NEXT POINT'))).toBe(false);
    });

    it('still ends the route at its last point', async () => {
      const f = await answered(
        mount(arrival, { pointIndex: 3, pointTotal: 4, serverAdvances: true })
      );
      expect(labels(f).some((l) => l.includes('End Route in'))).toBe(true);
      expect(serverRead()).not.toHaveBeenCalled();
    });
  });
});
