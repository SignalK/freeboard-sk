import { effect, inject, Injectable, untracked } from '@angular/core';

import { AppFacade } from 'src/app/app.facade';
import { FIT_MAX_ZOOM, fitBbox } from 'src/app/lib/map-fit';
import { MapService } from 'src/app/modules/map/ol/lib/map.service';
import { SplitViewService } from 'src/app/modules/map/split-view/split-view.service';
import { Position } from 'src/app/types';
import { CourseService } from '../course';
import { AlertData } from './components/alert.component';
import { NotificationManager } from './notification-manager';
import { mobBox } from './mob';

/** How long the server may take to report a MOB this display raised. */
const RAISE_ECHO_MS = 10000;

/**
 * Person overboard actions. Nothing here changes the course on its own: an
 * autopilot following the destination turns the boat the moment it changes,
 * so Direct-To is only ever a deliberate tap by someone looking at the chart.
 */
@Injectable({ providedIn: 'root' })
export class MobService {
  private app = inject(AppFacade);
  private notiMgr = inject(NotificationManager);
  private course = inject(CourseService);
  private mapService = inject(MapService);
  private splitView = inject(SplitViewService);

  /** MOB alarms already on screen, so a new one can be told apart. */
  private known = new Set<string>();
  /** Until when a new MOB is the one this display raised. */
  private zoomUntil = 0;

  constructor() {
    effect(() => {
      const alerts = this.notiMgr.mobAlerts();
      untracked(() => this.onMobAlerts(alerts.map(([, a]) => a)));
    });
  }

  /**
   * Raise a MOB alarm. When the server reports it, this display zooms to it:
   * the server places it where the vessel is now, which is not where a
   * playback shows the vessel. The other displays get the alarm but keep the
   * view they are navigating on.
   */
  raise() {
    this.zoomUntil = Date.now() + RAISE_ECHO_MS;
    this.notiMgr.raiseServerAlarm('mob', 'Person Overboard!');
  }

  /** Fit the active chart pane to the vessel and the MOB. */
  zoomTo(alert: AlertData) {
    const mob = mobPosition(alert);
    if (!mob) {
      return;
    }
    const map =
      (this.splitView.secondaryActive()
        ? this.mapService.getSecondaryMap()
        : undefined) ?? this.mapService.getMaps()[0];
    const size = map?.getSize();
    const limits = this.app.MAP_ZOOM_EXTENT;
    const fit = fitBbox(
      mobBox(this.vesselPosition(), mob),
      size && size[0] > 0 && size[1] > 0
        ? [size[0], size[1]]
        : [window.innerWidth, window.innerHeight],
      { min: limits.min, max: Math.min(limits.max, FIT_MAX_ZOOM) },
      map?.getView()?.getRotation() ?? 0
    );
    this.app.mapMoveRequest.set({ ...fit, activePane: true, exactZoom: true });
  }

  /**
   * Set the MOB position as the destination, after the user confirms it
   * while an autopilot is engaged.
   */
  directTo(alert: AlertData) {
    const position = alert.properties.position;
    if (!position) {
      return;
    }
    const go = async () => {
      // the waypoint stays the destination until the server takes the MOB
      if (await this.course.setDestination(position)) {
        this.app.data.activeWaypoint = null;
      }
    };
    const pilot = this.app.data.vessels.self.autopilot;
    if (!pilot.enabled) {
      void go();
      return;
    }
    this.app
      .showConfirm(
        `The autopilot is engaged${pilot.mode ? ` (${pilot.mode})` : ''}. If it follows the destination, the boat will turn towards the MOB.`,
        'Direct-To MOB',
        'TURN TO MOB',
        'CANCEL'
      )
      .subscribe((res: { ok: boolean } | null) => {
        if (res?.ok) {
          void go();
        }
      });
  }

  /** End the MOB after the user confirms. */
  end(alert: AlertData) {
    this.app
      .showConfirm(
        'Is the person back on board, or was this a false alarm?',
        'End MOB',
        'END MOB',
        'CANCEL'
      )
      .subscribe((res: { ok: boolean } | null) => {
        if (res?.ok) {
          this.notiMgr.cancelServerAlarm(alert);
        }
      });
  }

  private onMobAlerts(alerts: AlertData[]) {
    const fresh = alerts.filter((a) => !this.known.has(a.id));
    this.known = new Set(alerts.map((a) => a.id));
    const raised = fresh.find((a) => a.properties.position);
    if (raised && Date.now() < this.zoomUntil) {
      this.zoomUntil = 0;
      this.zoomTo(raised);
    }
  }

  private vesselPosition(): Position | null {
    const self = this.app.data.vessels.self;
    return self.positionReceived ? self.position : null;
  }
}

/** The MOB position as `[lon, lat]`, when the notification carries one. */
export function mobPosition(alert: AlertData): Position | null {
  const p = alert.properties.position;
  return p ? [p.longitude, p.latitude] : null;
}
