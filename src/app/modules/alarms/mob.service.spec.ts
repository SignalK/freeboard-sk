import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppFacade } from 'src/app/app.facade';
import { MapService } from 'src/app/modules/map/ol/lib/map.service';
import { SplitViewService } from 'src/app/modules/map/split-view/split-view.service';
import { CourseService } from '../course';
import { AlertData } from './components/alert.component';
import { MobService } from './mob.service';
import { NotificationManager } from './notification-manager';

const MOB = { latitude: -18.1, longitude: 178.4 };

type AlertItems = Array<[string, AlertData]>;

function setup(opts: {
  engaged?: boolean;
  confirm?: { ok: boolean } | null;
  accepted?: boolean;
}) {
  const app = {
    data: {
      activeWaypoint: 'wpt1' as string | null,
      vessels: {
        self: {
          position: [178.45, -18.15],
          positionReceived: true,
          autopilot: { enabled: !!opts.engaged, mode: 'route' }
        }
      }
    },
    MAP_ZOOM_EXTENT: { min: 1, max: 24 },
    mapMoveRequest: signal<unknown>(null),
    showConfirm: vi.fn(() => of(opts.confirm ?? null))
  };
  const course = {
    setDestination: vi.fn(() => Promise.resolve(opts.accepted ?? true))
  };
  const mobAlerts = signal<AlertItems>([]);
  const notiMgr = {
    mobAlerts,
    raiseServerAlarm: vi.fn(),
    cancelServerAlarm: vi.fn()
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: AppFacade, useValue: app },
      { provide: CourseService, useValue: course },
      { provide: NotificationManager, useValue: notiMgr },
      {
        provide: MapService,
        useValue: { getMaps: () => [], getSecondaryMap: () => undefined }
      },
      { provide: SplitViewService, useValue: { secondaryActive: () => false } }
    ]
  });
  const mob = TestBed.inject(MobService);
  TestBed.tick();
  return { mob, app, course, notiMgr, mobAlerts };
}

const mobAlert = (id: string) =>
  ({ id, properties: { position: MOB } }) as AlertData;

const alert = mobAlert('m1');

describe('MobService', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('raises the alarm without touching the course', () => {
    const { mob, notiMgr, course } = setup({});
    mob.raise();
    expect(notiMgr.raiseServerAlarm).toHaveBeenCalledWith(
      'mob',
      'Person Overboard!'
    );
    expect(course.setDestination).not.toHaveBeenCalled();
  });

  it('zooms to the MOB it raised once the server reports it', () => {
    const { mob, app, mobAlerts } = setup({});
    mob.raise();
    expect(app.mapMoveRequest()).toBeNull();
    mobAlerts.set([['notifications.mob.m1', alert]]);
    TestBed.tick();
    expect(app.mapMoveRequest()).toMatchObject({
      activePane: true,
      exactZoom: true
    });
  });

  it('fits the vessel and the MOB live, and the MOB alone in playback', () => {
    const { mob, app } = setup({});
    mob.zoomTo(alert);
    const live = app.mapMoveRequest() as { center: number[]; zoom: number };
    expect(live.zoom).toBeLessThan(16);

    mob.playback = true;
    mob.zoomTo(alert);
    const alone = app.mapMoveRequest() as { center: number[]; zoom: number };
    expect(alone.zoom).toBe(16);
    expect(alone.center[0]).toBeCloseTo(MOB.longitude);
    expect(alone.center[1]).toBeCloseTo(MOB.latitude);
  });

  it('keeps its view when another display raises a MOB', () => {
    const { app, mobAlerts } = setup({});
    mobAlerts.set([['notifications.mob.m1', alert]]);
    TestBed.tick();
    expect(app.mapMoveRequest()).toBeNull();
  });

  it('sets the destination on Direct-To with no autopilot engaged', async () => {
    const { mob, app, course } = setup({});
    mob.directTo(alert);
    await Promise.resolve();
    expect(app.showConfirm).not.toHaveBeenCalled();
    expect(course.setDestination).toHaveBeenCalledWith(MOB);
    expect(app.data.activeWaypoint).toBeNull();
  });

  it('keeps the waypoint when the server refuses the destination', async () => {
    const { mob, app } = setup({ accepted: false });
    mob.directTo(alert);
    await Promise.resolve();
    expect(app.data.activeWaypoint).toBe('wpt1');
  });

  it('asks first while the autopilot is engaged', () => {
    const { mob, app, course } = setup({
      engaged: true,
      confirm: { ok: true }
    });
    mob.directTo(alert);
    expect(app.showConfirm).toHaveBeenCalled();
    expect(course.setDestination).toHaveBeenCalledWith(MOB);
  });

  it('leaves the course alone when the user cancels', () => {
    const { mob, course } = setup({ engaged: true, confirm: null });
    mob.directTo(alert);
    expect(course.setDestination).not.toHaveBeenCalled();
  });

  it('ends the MOB only after confirmation', () => {
    const cancelled = setup({ confirm: null });
    cancelled.mob.end(alert);
    expect(cancelled.notiMgr.cancelServerAlarm).not.toHaveBeenCalled();

    TestBed.resetTestingModule();
    const confirmed = setup({ confirm: { ok: true } });
    confirmed.mob.end(alert);
    expect(confirmed.notiMgr.cancelServerAlarm).toHaveBeenCalledWith(alert);
  });
});
