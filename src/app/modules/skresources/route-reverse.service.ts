import { inject, Injectable } from '@angular/core';

import { AppFacade } from 'src/app/app.facade';
import { CourseService } from 'src/app/modules/course/course.service';
import { RouteBufferRegistry } from 'src/app/modules/plotterext/route-buffer.registry';
import { SKResourceService } from './resources.service';

/**
 * How REVERSE turns a route round:
 * - `course`: the route being followed, through the Course API;
 * - `buffer`: a draft, or a saved route with unsaved edits, in its edit
 *   buffer, so the change stays unsaved with the rest;
 * - `stored`: a saved route, rewritten on the server.
 */
export type RouteReverseMode = 'course' | 'buffer' | 'stored';

@Injectable({ providedIn: 'root' })
export class RouteReverseService {
  private app = inject(AppFacade);
  private skres = inject(SKResourceService);
  private routeBuffers = inject(RouteBufferRegistry);
  private course = inject(CourseService);
  // saved routes whose reversed points are on their way to the server
  private writing = new Set<string>();

  /** How REVERSE would turn route `id` round, or null when it can't: a
   *  read-only route that isn't being followed. Reads the course, the edit
   *  buffers and the route cache as signals, so a computed() around it
   *  follows them. */
  mode(id: string): RouteReverseMode | null {
    this.course.courseData();
    this.routeBuffers.live();
    if (!id) {
      return null;
    }
    if (this.app.data.activeRoute === id) {
      return 'course';
    }
    const buffer = this.routeBuffers.get(id);
    if (buffer && (!buffer.saved || buffer.dirty)) {
      return 'buffer';
    }
    const route = this.skres.fromCache('routes', id)?.[1];
    if (route && !route.feature.properties?.readOnly) {
      return 'stored';
    }
    return null;
  }

  /** Turn route `id` round as mode() says. Resolves whether it was. */
  async reverse(id: string): Promise<boolean> {
    switch (this.mode(id)) {
      case 'course':
        this.course.courseReverse();
        return true;
      case 'buffer': {
        const buffer = this.routeBuffers.get(id);
        this.routeBuffers.replace(id, [...buffer.points].reverse());
        return true;
      }
      case 'stored':
        return this.reverseStored(id);
      default:
        return false;
    }
  }

  private async reverseStored(id: string): Promise<boolean> {
    // A second REVERSE before the first write is done (a double tap) would
    // read the order the first one already put in the cache and send a second
    // write, which could reach the server first. It is ignored instead.
    if (this.writing.has(id)) {
      return false;
    }
    this.writing.add(id);
    try {
      const route = this.skres.fromCache('routes', id)[1];
      const meta = route.feature.properties?.coordinatesMeta;
      return await this.skres.updateRouteCoords(
        id,
        [...route.feature.geometry.coordinates].reverse(),
        meta ? [...meta].reverse() : undefined
      );
    } finally {
      this.writing.delete(id);
    }
  }
}
