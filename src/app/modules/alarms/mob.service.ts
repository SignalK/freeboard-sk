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

/**
 * Arrival circle for a MOB destination, in metres. The usual one (100 m by
 * default) would sound the arrival alarm as soon as Direct-To is pressed
 * near the MOB, and long before the boat reaches the person.
 */
const MOB_ARRIVAL_CIRCLE = 10;

/** How long after the server's answer the MOB this display raised may still move its chart. */
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

  /** The MOB this display raised, until its notification first arrives. */
  private zoomPending: { id: string; until: number } | null = null;
  /** A MOB request is on its way to the server. */
  private raising = false;
  /**
   * Set while a history playback runs: the vessel it shows is not where the
   * boat is, so a fit to it could zoom far out from the MOB.
   */
  playback = false;

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
   *
   * A server that refuses it, on a display nobody is logged in to, still
   * leaves the MOB on this display, where the vessel was at the press. It is
   * not sent later: the server would place it where the vessel is then.
   */
  async raise() {
    // a second press before the server answers would raise a second MOB
    if (this.raising) {
      return;
    }
    this.raising = true;
    this.zoomPending = null;
    const pressedAt = Date.now();
    const vessel = this.vesselPosition();
    try {
      const raised = await this.notiMgr.raiseServerAlarm(
        'mob',
        'Person Overboard!'
      );
      if (raised === 'refused') {
        const id = this.notiMgr.addLocalMob(
          vessel ? { latitude: vessel[1], longitude: vessel[0] } : null,
          pressedAt
        );
        this.zoomPending = { id, until: Date.now() + RAISE_ECHO_MS };
      } else if (raised) {
        // the notification may arrive before the server's answer to the request
        this.zoomPending = { id: raised.id, until: Date.now() + RAISE_ECHO_MS };
      } else {
        return;
      }
      this.onMobAlerts(this.notiMgr.mobAlerts().map(([, a]) => a));
    } finally {
      this.raising = false;
    }
  }

  /** Fit the active chart pane to the vessel and the MOB, or to the MOB alone in playback. */
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
    const at = mobPosition(alert);
    if (!at) {
      return;
    }
    const position = { latitude: at[1], longitude: at[0] };
    const go = async () => {
      // the waypoint stays the destination until the server takes the MOB
      if (await this.course.setDestination(position, MOB_ARRIVAL_CIRCLE)) {
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
        if (!res?.ok) {
          return;
        }
        if (alert.local) {
          this.notiMgr.removeLocalMob(alert);
        } else {
          this.notiMgr.cancelServerAlarm(alert);
        }
      });
  }

  private onMobAlerts(alerts: AlertData[]) {
    const pending = this.zoomPending;
    if (!pending) {
      return;
    }
    const raised = alerts.find((a) => a.id === pending.id);
    if (raised || Date.now() > pending.until) {
      this.zoomPending = null;
    }
    if (raised) {
      this.zoomTo(raised);
    }
  }

  private vesselPosition(): Position | null {
    const self = this.app.data.vessels.self;
    return !this.playback && self.positionReceived ? self.position : null;
  }
}

/** The MOB position as `[lon, lat]`, when the notification carries a usable one. */
export function mobPosition(alert: AlertData): Position | null {
  const p = alert.properties.position;
  return p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
    ? [p.longitude, p.latitude]
    : null;
}
