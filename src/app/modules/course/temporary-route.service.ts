import {
  DestroyRef,
  effect,
  inject,
  Injectable,
  untracked
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SignalKClient } from 'signalk-client-angular';
import type { CourseInfo } from '@signalk/server-api';

import { AppFacade } from 'src/app/app.facade';
import { FBRoute } from 'src/app/types';
import { InfoPanelFacade } from 'src/app/modules/info-panel/info-panel.facade';
import { PlotterExtensionService } from 'src/app/modules/plotterext/plotterext.service';
import { RouteBufferRegistry } from 'src/app/modules/plotterext/route-buffer.registry';
import { SKResourceService } from 'src/app/modules/skresources/resources.service';
import { CourseService } from './course.service';
import {
  isTemporaryRoute,
  routeIdFromHref,
  TEMPORARY_ROUTE_NAME,
  TemporaryRouteMarker,
  temporaryRoutesToDelete
} from './temporary-route';

/** How often temporary routes are checked for expiry during a session. */
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Starts a drawn route without the user saving it first, and deletes stored
 * temporary routes again as `temporaryRoutesToDelete` decides (see
 * `temporary-route.ts`).
 */
@Injectable({ providedIn: 'root' })
export class TemporaryRouteService {
  private app = inject(AppFacade);
  private signalk = inject(SignalKClient);
  private skres = inject(SKResourceService);
  private course = inject(CourseService);
  private plotterExt = inject(PlotterExtensionService);
  private routeBuffers = inject(RouteBufferRegistry);
  private infoPanel = inject(InfoPanelFacade);

  private activeRoute: string | null = null;
  /** Deletes in flight, so overlapping triggers don't repeat one. */
  private readonly deleting = new Set<string>();
  /** Routes already sent a delete this session. A read-only user's delete
   *  fails every time, so it is not retried on each routes refresh. */
  private readonly attempted = new Set<string>();

  constructor() {
    effect(() => {
      this.course.courseData();
      const current = this.app.data.activeRoute ?? null;
      untracked(() => {
        const previous = this.activeRoute;
        this.activeRoute = current;
        if (previous && previous !== current) {
          this.release(previous);
        }
      });
    });
    // The most recent temporary route expires a day after it stops being
    // followed, which can fall in the middle of a long session.
    const timer = setInterval(() => this.sweep(), SWEEP_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  /**
   * Delete the temporary routes that are due, including ones left behind
   * while no Freeboard was open. Call on connecting to the server.
   */
  async sweep() {
    const state = await this.serverState();
    if (state) {
      await this.deleteRoutes(
        temporaryRoutesToDelete(state.routes, state.active, Date.now())
      );
    }
  }

  /** Whether `id` is a drawn route that has never been saved. */
  isDraft(id: string): boolean {
    const buffer = this.routeBuffers.get(id);
    return !!buffer && !buffer.saved;
  }

  /**
   * Store the drawn route `bufferId` as a temporary route and follow it from
   * `pointIndex`. Resolves with the stored route's id, or null if it could not
   * be stored or the server would not follow it.
   */
  async start(bufferId: string, pointIndex = 0): Promise<string | null> {
    const buffer = this.routeBuffers.get(bufferId);
    if (!buffer || buffer.saved) {
      return null;
    }
    let saved: { href: string } | null;
    try {
      saved = await this.plotterExt.saveBuffer(bufferId, {
        name: buffer.name || TEMPORARY_ROUTE_NAME,
        temporary: true
      });
    } catch {
      // saveBuffer has already reported the server error.
      return null;
    }
    if (!saved) {
      return null;
    }
    if (!(await this.course.activateRoute(saved.href, pointIndex))) {
      // Not followed after all: remove the stored copy and hand the drawing
      // back as a draft, so it can be started again or saved. If the copy
      // stays, it is the drawing: START on it retries, a sweep removes it.
      const deleted = await this.deleteUnlessActive([saved.href]);
      if (deleted.includes(saved.href)) {
        this.routeBuffers.create({
          name: buffer.name ?? undefined,
          description: buffer.description ?? undefined,
          points: buffer.points
        });
        if (this.infoPanel.item()?.id === bufferId) {
          this.infoPanel.close();
        }
      }
      return null;
    }
    if (this.infoPanel.item()?.id === bufferId) {
      // Point the panel at the stored route so it offers STOP, not START.
      this.infoPanel.open('routes', saved.href);
    }
    // The new route replaces the previous temporary route.
    this.sweep();
    return saved.href;
  }

  /**
   * `id` stopped being this client's active route. A temporary route that is
   * kept is stamped with when it stopped; one that is due is deleted along
   * with any other temporary route that is due.
   */
  private async release(id: string) {
    let route = this.skres.fromCache('routes', id)?.[1];
    if (!route) {
      try {
        route = await this.skres.fromServer('routes', id);
      } catch {
        return;
      }
    }
    if (!isTemporaryRoute(route)) {
      return;
    }
    const state = await this.serverState();
    const stored = state?.routes.find(([rid]) => rid === id);
    if (!stored || id === state.active) {
      return;
    }
    // Stamping it before deciding also lifts the grace period, which only
    // protects routes that have never been followed.
    const marker = stored[1].feature.properties[
      'temporary'
    ] as TemporaryRouteMarker;
    marker.released = new Date().toISOString();
    const due = temporaryRoutesToDelete(state.routes, state.active, Date.now());
    if (!due.includes(id)) {
      try {
        await this.skres.putToServer('routes', id, stored[1]);
      } catch (err) {
        this.app.debug(`temporary route ${id} not stamped`, err);
      }
    }
    await this.deleteRoutes(due);
  }

  /**
   * Every stored route and the route the server is following. The local
   * course state can be reset while the course is unchanged (a reconnect,
   * switching the active vessel), so the server decides what is active. The
   * full list is read because routes the user has not selected are not among
   * the displayed routes.
   */
  private async serverState(): Promise<{
    routes: FBRoute[];
    active: string | null;
  } | null> {
    try {
      const [routes, active] = await Promise.all([
        this.skres.listFromServer<FBRoute>('routes'),
        this.serverActiveRoute()
      ]);
      return { routes, active };
    } catch (err) {
      this.app.debug('temporary routes: server state unavailable', err);
      return null;
    }
  }

  /** Delete `ids` unless the server reports one as the active route. */
  private async deleteUnlessActive(ids: string[]): Promise<string[]> {
    let active: string | null;
    try {
      active = await this.serverActiveRoute();
    } catch (err) {
      this.app.debug('temporary routes: course unavailable', err);
      return [];
    }
    return this.deleteRoutes(ids.filter((id) => id !== active));
  }

  /** Delete routes; resolves with the ids that were deleted. */
  private async deleteRoutes(ids: string[]): Promise<string[]> {
    const deleted: string[] = [];
    const pending = ids.filter(
      (id) => !this.deleting.has(id) && !this.attempted.has(id)
    );
    pending.forEach((id) => this.deleting.add(id));
    for (const id of pending) {
      this.attempted.add(id);
      try {
        await this.skres.deleteFromServer('routes', id);
        deleted.push(id);
        this.skres.selectionRemove('routes', id);
        if (this.infoPanel.item()?.id === id) {
          this.infoPanel.close();
        }
      } catch (err) {
        // Another Freeboard may have deleted it first.
        this.app.debug(`temporary route ${id} not deleted`, err);
      } finally {
        this.deleting.delete(id);
      }
    }
    return deleted;
  }

  private async serverActiveRoute(): Promise<string | null> {
    const course = (await firstValueFrom(
      this.signalk.api.get(
        this.app.skApiVersion,
        'vessels/self/navigation/course'
      )
    )) as CourseInfo | null;
    return routeIdFromHref(course?.activeRoute?.href);
  }
}
