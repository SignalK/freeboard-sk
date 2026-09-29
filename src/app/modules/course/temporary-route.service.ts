import { effect, inject, Injectable, untracked } from '@angular/core';
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
  isTemporaryRouteExpired,
  routeIdFromHref,
  TEMPORARY_ROUTE_NAME
} from './temporary-route';

/**
 * Starts a drawn route without the user saving it first, and deletes the
 * stored copy again once it is no longer the active route (see
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
    // A temporary route this client saw stop being active is deleted at once.
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
    // The client that started a temporary route keeps it selected, so one
    // whose stop the stream never showed it turns up in its displayed routes.
    effect(() => {
      const routes = this.skres.routes();
      untracked(() => this.deleteExpired(routes));
    });
  }

  /**
   * Delete temporary routes left behind while no Freeboard was watching, e.g.
   * the course was cleared from another app. Call on connecting to the
   * server. Reads the server's full route list: routes the user has not
   * selected are not in the displayed routes.
   */
  async sweep() {
    let routes: FBRoute[];
    try {
      routes = await this.skres.listFromServer<FBRoute>('routes');
    } catch (err) {
      this.app.debug('temporary routes: route list unavailable', err);
      return;
    }
    this.deleteExpired(routes);
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
    return saved.href;
  }

  private async release(id: string) {
    let route = this.skres.fromCache('routes', id)?.[1];
    if (!route) {
      try {
        route = await this.skres.fromServer('routes', id);
      } catch {
        return;
      }
    }
    if (isTemporaryRoute(route)) {
      await this.deleteUnlessActive([id]);
    }
  }

  private deleteExpired(routes: FBRoute[]) {
    const now = Date.now();
    const expired = routes
      .filter(
        ([id, route]) =>
          id !== this.app.data.activeRoute &&
          isTemporaryRouteExpired(route, now)
      )
      .map(([id]) => id);
    if (expired.length) {
      this.deleteUnlessActive(expired);
    }
  }

  /**
   * Delete temporary routes unless the server reports one of them as the
   * active route. The local course state can be reset while the course is
   * unchanged (a reconnect, switching the active vessel), so the server
   * decides. Resolves with the ids that were deleted.
   */
  private async deleteUnlessActive(ids: string[]): Promise<string[]> {
    const deleted: string[] = [];
    const pending = ids.filter(
      (id) => !this.deleting.has(id) && !this.attempted.has(id)
    );
    if (!pending.length) {
      return deleted;
    }
    pending.forEach((id) => this.deleting.add(id));
    try {
      const active = await this.serverActiveRoute();
      for (const id of pending) {
        if (id === active) {
          continue;
        }
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
        }
      }
    } catch (err) {
      // Without the server's course there is no telling which route is active.
      this.app.debug('temporary routes: course unavailable', err);
    } finally {
      pending.forEach((id) => this.deleting.delete(id));
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
