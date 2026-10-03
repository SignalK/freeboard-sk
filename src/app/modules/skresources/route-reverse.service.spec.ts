import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RouteReverseService } from './route-reverse.service';
import { AppFacade } from 'src/app/app.facade';
import { CourseService } from 'src/app/modules/course/course.service';
import { RouteBufferRegistry } from 'src/app/modules/plotterext/route-buffer.registry';
import { SKResourceService } from './resources.service';
import { Position } from 'src/app/types';

/**
 * REVERSE turns a route round in the way that fits it: the route being
 * followed through the Course API, a draft or a route with unsaved edits in its
 * edit buffer, and a saved route on the server. A read-only route that isn't
 * being followed can't be turned round.
 */
describe('RouteReverseService', () => {
  const coords: Position[] = [
    [24.95, 60.15],
    [24.955, 60.16],
    [24.95, 60.17]
  ];
  const names = ['One', 'Two', 'Three'];
  const reversedPoints = [...coords]
    .reverse()
    .map((position, i) => ({ position, name: [...names].reverse()[i] }));

  // A stored route stub: just what the service reads and the write changes.
  type StoredRoute = {
    feature: {
      geometry: { coordinates: Position[] };
      properties: {
        readOnly?: boolean;
        coordinatesMeta?: Array<{ name: string }>;
      };
    };
  };

  let registry: RouteBufferRegistry;
  let data: { activeRoute: string | null };
  let cached: Map<string, StoredRoute>;
  let updateRouteCoords: ReturnType<typeof vi.fn>;
  let courseReverse: ReturnType<typeof vi.fn>;
  let service: RouteReverseService;

  const store = (id: string, readOnly = false, withMeta = true) =>
    cached.set(id, {
      feature: {
        geometry: { coordinates: [...coords] },
        properties: {
          ...(readOnly ? { readOnly } : {}),
          ...(withMeta
            ? { coordinatesMeta: names.map((name) => ({ name })) }
            : {})
        }
      }
    });

  const bufferPoints = () =>
    coords.map((position, i) => ({ position, name: names[i] }));

  beforeEach(() => {
    TestBed.resetTestingModule();
    registry = new RouteBufferRegistry();
    data = { activeRoute: null };
    cached = new Map();
    updateRouteCoords = vi.fn(async () => true);
    courseReverse = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        RouteReverseService,
        { provide: AppFacade, useValue: { data } },
        {
          provide: SKResourceService,
          useValue: {
            fromCache: (_c: string, id: string) =>
              cached.has(id) ? [id, cached.get(id), true] : undefined,
            updateRouteCoords
          }
        },
        { provide: RouteBufferRegistry, useValue: registry },
        {
          provide: CourseService,
          useValue: { courseData: signal({}), courseReverse }
        }
      ]
    });
    service = TestBed.inject(RouteReverseService);
  });

  describe('mode()', () => {
    it('turns the route being followed round through the course, read-only or not', () => {
      store('rte-1', true);
      data.activeRoute = 'rte-1';
      expect(service.mode('rte-1')).toBe('course');
    });

    it('turns a draft round in its edit buffer', () => {
      const { routeId } = registry.create({ points: bufferPoints() });
      expect(service.mode(routeId)).toBe('buffer');
    });

    it('turns a saved route with unsaved edits round in its edit buffer', () => {
      const { routeId } = registry.create({ points: bufferPoints() });
      registry.markSaved(routeId, 'rte-1');
      registry.replace(routeId, bufferPoints());
      expect(service.mode(routeId)).toBe('buffer');
    });

    it('turns a saved route round on the server', () => {
      store('rte-1');
      expect(service.mode('rte-1')).toBe('stored');
    });

    it('cannot turn round a read-only route that is not being followed', () => {
      store('rte-1', true);
      expect(service.mode('rte-1')).toBeNull();
    });

    it('cannot turn round a route it does not know', () => {
      expect(service.mode('rte-unknown')).toBeNull();
      expect(service.mode('')).toBeNull();
    });
  });

  describe('reverse()', () => {
    it('reverses the course of the route being followed', async () => {
      store('rte-1');
      data.activeRoute = 'rte-1';

      expect(await service.reverse('rte-1')).toBe(true);

      expect(courseReverse).toHaveBeenCalledOnce();
      expect(updateRouteCoords).not.toHaveBeenCalled();
    });

    it('turns unsaved edits round in the buffer, still unsaved', async () => {
      const { routeId } = registry.create({ points: bufferPoints() });
      registry.markSaved(routeId, 'rte-1');
      registry.replace(routeId, bufferPoints());

      expect(await service.reverse(routeId)).toBe(true);

      const buffer = registry.get(routeId);
      expect(buffer.points).toEqual(reversedPoints);
      expect(buffer.dirty).toBe(true);
      expect(updateRouteCoords).not.toHaveBeenCalled();
    });

    it('writes a saved route back with its points and their names turned round', async () => {
      store('rte-1');

      expect(await service.reverse('rte-1')).toBe(true);

      expect(updateRouteCoords).toHaveBeenCalledWith(
        'rte-1',
        [...coords].reverse(),
        [...names].reverse().map((name) => ({ name }))
      );
    });

    it('writes a saved route without point names back without them', async () => {
      store('rte-1', false, false);

      await service.reverse('rte-1');

      expect(updateRouteCoords).toHaveBeenCalledWith(
        'rte-1',
        [...coords].reverse(),
        undefined
      );
    });

    it("turns a saved route's clean edit buffer round too, still clean", async () => {
      store('rte-1');
      const { routeId } = registry.create({ points: bufferPoints() });
      registry.markSaved(routeId, 'rte-1');

      await service.reverse('rte-1');

      const buffer = registry.get(routeId);
      expect(buffer.points).toEqual(reversedPoints);
      expect(buffer.dirty).toBe(false);
    });

    it('leaves the edit buffer alone when the server write fails', async () => {
      store('rte-1');
      const { routeId } = registry.create({ points: bufferPoints() });
      registry.markSaved(routeId, 'rte-1');
      updateRouteCoords.mockResolvedValue(false);

      expect(await service.reverse('rte-1')).toBe(false);

      expect(registry.get(routeId).points).toEqual(bufferPoints());
    });

    it('does nothing to a read-only route that is not being followed', async () => {
      store('rte-1', true);

      expect(await service.reverse('rte-1')).toBe(false);

      expect(updateRouteCoords).not.toHaveBeenCalled();
      expect(courseReverse).not.toHaveBeenCalled();
    });
  });
});
