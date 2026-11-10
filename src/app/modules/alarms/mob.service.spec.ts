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
import { NotificationManager, RaiseResult } from './notification-manager';

const MOB = { latitude: -18.1, longitude: 178.4 };

type AlertItems = Array<[string, AlertData]>;

function setup(opts: {
  engaged?: boolean;
  confirm?: { ok: boolean } | null;
  accepted?: boolean;
  refused?: boolean;
  /** MOB alerts on screen to begin with */
  mobs?: AlertItems;
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
    showConfirm: vi.fn(() => of(opts.confirm ?? null)),
    showMessage: vi.fn()
  };
  const course = {
    setDestination: vi.fn(() => Promise.resolve(opts.accepted ?? true))
  };
  const mobAlerts = signal<AlertItems>(opts.mobs ?? []);
  const notiMgr = {
    mobAlerts,
    raiseServerAlarm: vi.fn((): Promise<RaiseResult> =>
      Promise.resolve(opts.refused ? null : { id: 'm1' })
    ),
    addLocalMob: vi.fn(() => 'local-1'),
    removeLocalMob: vi.fn(),
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
const ACTIVE: AlertItems = [['notifications.mob.m1', alert]];
const other = {
  id: 'm2',
  properties: { position: { latitude: 10, longitude: 20 } }
} as AlertData;

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

  it('keeps a MOB the server does not take on this display, where the vessel was', async () => {
    const { mob, notiMgr } = setup({ refused: true });
    const pressedAt = Date.now();
    await mob.raise();
    expect(notiMgr.addLocalMob).toHaveBeenCalledWith(
      { latitude: -18.15, longitude: 178.45 },
      expect.any(Number)
    );
    const [, at] = notiMgr.addLocalMob.mock.calls[0] as unknown as [
      unknown,
      number
    ];
    expect(at).toBeGreaterThanOrEqual(pressedAt);
  });

  it('zooms to a MOB kept on this display', async () => {
    const { mob, app, mobAlerts } = setup({ refused: true });
    await mob.raise();
    mobAlerts.set([
      [
        'notifications.mob.local-1',
        { ...mobAlert('local-1'), local: true } as AlertData
      ]
    ]);
    TestBed.tick();
    expect(app.mapMoveRequest()).not.toBeNull();
  });

  it('ends a MOB kept on this display there, not on the server', () => {
    const { mob, notiMgr } = setup({ confirm: { ok: true } });
    const local = { ...alert, local: true };
    mob.end(local);
    expect(notiMgr.removeLocalMob).toHaveBeenCalledWith(local);
    expect(notiMgr.cancelServerAlarm).not.toHaveBeenCalled();
  });

  it('zooms to the MOB it raised once the server reports it', async () => {
    const { mob, app, mobAlerts } = setup({});
    await mob.raise();
    expect(app.mapMoveRequest()).toBeNull();
    mobAlerts.set([['notifications.mob.m1', alert]]);
    TestBed.tick();
    expect(app.mapMoveRequest()).toMatchObject({
      activePane: true,
      exactZoom: true
    });
  });

  it('zooms to it when the notification beats the answer to the request', async () => {
    const { mob, mobAlerts } = setup({});
    const zoomTo = vi.spyOn(mob, 'zoomTo');
    const raised = mob.raise();
    mobAlerts.set([
      ['notifications.mob.m2', other],
      ['notifications.mob.m1', alert]
    ]);
    TestBed.tick();
    await raised;
    expect(zoomTo).toHaveBeenCalledTimes(1);
    expect(zoomTo).toHaveBeenCalledWith(alert);
  });

  it('raises one MOB however often it is pressed before the server answers', async () => {
    const { mob, notiMgr } = setup({});
    const first = mob.raise();
    void mob.raise();
    await first;
    expect(notiMgr.raiseServerAlarm).toHaveBeenCalledTimes(1);
    await mob.raise();
    expect(notiMgr.raiseServerAlarm).toHaveBeenCalledTimes(2);
  });

  it('does not move the chart later when its MOB first arrives without a position', async () => {
    const { mob, app, mobAlerts } = setup({});
    await mob.raise();
    mobAlerts.set([
      ['notifications.mob.m1', { id: 'm1', properties: {} } as AlertData]
    ]);
    TestBed.tick();
    mobAlerts.set([['notifications.mob.m1', alert]]);
    TestBed.tick();
    expect(app.mapMoveRequest()).toBeNull();
  });

  it('gives up on a MOB the server never reports in time', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      const { mob, app, mobAlerts } = setup({});
      await mob.raise();
      vi.setSystemTime(Date.now() + 11000);
      mobAlerts.set([['notifications.mob.m2', other]]);
      TestBed.tick();
      mobAlerts.set([
        ['notifications.mob.m2', other],
        ['notifications.mob.m1', alert]
      ]);
      TestBed.tick();
      expect(app.mapMoveRequest()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not move the chart when its MOB is first reported too late', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      const { mob, app, mobAlerts } = setup({});
      await mob.raise();
      vi.setSystemTime(Date.now() + 11000);
      mobAlerts.set([['notifications.mob.m1', alert]]);
      TestBed.tick();
      expect(app.mapMoveRequest()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not zoom to a MOB another display raised meanwhile', async () => {
    const { mob, app, mobAlerts } = setup({});
    await mob.raise();
    mobAlerts.set([['notifications.mob.m2', other]]);
    TestBed.tick();
    expect(app.mapMoveRequest()).toBeNull();

    mobAlerts.set([
      ['notifications.mob.m2', other],
      ['notifications.mob.m1', alert]
    ]);
    TestBed.tick();
    const move = app.mapMoveRequest() as { center: number[] };
    expect(move.center[0]).toBeCloseTo(178.425, 2);
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

  it('sets the destination, with a small arrival circle, on Direct-To with no autopilot engaged', async () => {
    const { mob, app, course } = setup({ mobs: ACTIVE });
    mob.directTo(alert);
    await Promise.resolve();
    expect(app.showConfirm).not.toHaveBeenCalled();
    expect(course.setDestination).toHaveBeenCalledWith(MOB, 10);
    expect(app.data.activeWaypoint).toBeNull();
  });

  it('offers no Direct-To for a position without a latitude', () => {
    const { mob, course } = setup({});
    mob.directTo({
      id: 'm1',
      properties: { position: { longitude: 178.4 } }
    } as unknown as AlertData);
    expect(course.setDestination).not.toHaveBeenCalled();
  });

  it('keeps the waypoint when the server refuses the destination', async () => {
    const { mob, app } = setup({
      mobs: ACTIVE,
      accepted: false
    });
    mob.directTo(alert);
    await Promise.resolve();
    expect(app.data.activeWaypoint).toBe('wpt1');
  });

  it('asks first while the autopilot is engaged', () => {
    const { mob, app, course } = setup({
      mobs: ACTIVE,
      engaged: true,
      confirm: { ok: true }
    });
    mob.directTo(alert);
    expect(app.showConfirm).toHaveBeenCalled();
    expect(course.setDestination).toHaveBeenCalledWith(MOB, 10);
  });

  it('leaves the course alone when the MOB ended during the warning', () => {
    const { mob, app, course, mobAlerts } = setup({
      mobs: ACTIVE,
      engaged: true
    });
    app.showConfirm.mockImplementation(() => {
      mobAlerts.set([]);
      return of({ ok: true });
    });
    mob.directTo(alert);
    expect(course.setDestination).not.toHaveBeenCalled();
    expect(app.showMessage).toHaveBeenCalledWith('This MOB has ended.');
  });

  it('leaves the course alone when the user cancels', () => {
    const { mob, course } = setup({
      mobs: ACTIVE,
      engaged: true,
      confirm: null
    });
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
