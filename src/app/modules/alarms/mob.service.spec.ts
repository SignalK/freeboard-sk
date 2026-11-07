import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AppFacade } from 'src/app/app.facade';
import { MapService } from 'src/app/modules/map/ol/lib/map.service';
import { CourseService } from '../course';
import { AlertData } from './components/alert.component';
import { MobService } from './mob.service';
import { NotificationManager } from './notification-manager';

const MOB = { latitude: -18.1, longitude: 178.4 };

function setup(opts: { engaged: boolean; confirm?: { ok: boolean } | null }) {
  const app = {
    data: {
      activeWaypoint: 'wpt1' as string | null,
      vessels: {
        self: {
          position: [178.45, -18.15],
          positionReceived: true,
          autopilot: { enabled: opts.engaged, mode: 'route' }
        }
      }
    },
    MAP_ZOOM_EXTENT: { min: 1, max: 24 },
    mapMoveRequest: signal<unknown>(null),
    showConfirm: vi.fn(() => of(opts.confirm ?? null))
  };
  const course = { setDestination: vi.fn() };
  const notiMgr = {
    raiseServerAlarm: vi.fn(),
    cancelServerAlarm: vi.fn()
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: AppFacade, useValue: app },
      { provide: CourseService, useValue: course },
      { provide: NotificationManager, useValue: notiMgr },
      { provide: MapService, useValue: { getMaps: () => [] } }
    ]
  });
  return { mob: TestBed.inject(MobService), app, course, notiMgr };
}

const alert = { properties: { position: MOB } } as AlertData;

describe('MobService', () => {
  it('raises the alarm and zooms this display in on the vessel', () => {
    const { mob, app, notiMgr, course } = setup({ engaged: false });
    mob.raise();
    expect(notiMgr.raiseServerAlarm).toHaveBeenCalledWith(
      'mob',
      'Person Overboard!'
    );
    expect(app.mapMoveRequest()).toEqual({
      center: [178.45, -18.15],
      zoom: 16,
      activePane: true
    });
    expect(course.setDestination).not.toHaveBeenCalled();
  });

  it('sets the destination on Direct-To with no autopilot engaged', () => {
    const { mob, app, course } = setup({ engaged: false });
    mob.directTo(alert);
    expect(app.showConfirm).not.toHaveBeenCalled();
    expect(course.setDestination).toHaveBeenCalledWith(MOB);
    expect(app.data.activeWaypoint).toBeNull();
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
    const cancelled = setup({ engaged: false, confirm: null });
    cancelled.mob.end(alert);
    expect(cancelled.notiMgr.cancelServerAlarm).not.toHaveBeenCalled();

    TestBed.resetTestingModule();
    const confirmed = setup({ engaged: false, confirm: { ok: true } });
    confirmed.mob.end(alert);
    expect(confirmed.notiMgr.cancelServerAlarm).toHaveBeenCalledWith(alert);
  });
});
