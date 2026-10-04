import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { MatBottomSheet } from '@angular/material/bottom-sheet';

import { RoutePanel } from './route-panel';
import { AppFacade } from 'src/app/app.facade';
import { SKResourceService } from '../../resources.service';
import { RouteBufferRegistry } from 'src/app/modules/plotterext/route-buffer.registry';
import { InfoPanelFacade } from 'src/app/modules/info-panel/info-panel.facade';
import { CourseService } from 'src/app/modules/course';
import { TemporaryRouteService } from 'src/app/modules/course/temporary-route.service';
import { SKResourceGroupService } from '../groups/groups.service';
import { SKRoute } from '../../resource-classes';
import { Position } from 'src/app/types';

/**
 * REVERSE turns a route round. The route being followed is turned round by the
 * Course API; a drawn route that was never saved (a draft) has no course yet,
 * so its points are turned round before START follows it; a saved route is
 * turned round on the server.
 */
describe('RoutePanel REVERSE', () => {
  const coords: Position[] = [
    [24.95, 60.15],
    [24.955, 60.16],
    [24.95, 60.17]
  ];
  const names = ['One', 'Two', 'Three'];
  let registry: RouteBufferRegistry;
  let courseReverse: ReturnType<typeof vi.fn>;
  let data: { activeRoute: string | null; activeRouteReversed: boolean };
  // the route cache, by id
  let cached: Map<string, SKRoute>;
  let updateRouteCoords: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    registry = new RouteBufferRegistry();
    courseReverse = vi.fn();
    data = { activeRoute: null, activeRouteReversed: false };
    cached = new Map();
    // like the real one: rewrites the cached route in place
    updateRouteCoords = vi.fn(
      async (id: string, c: Position[], meta?: Array<{ name: string }>) => {
        const route = cached.get(id);
        route.feature.geometry.coordinates = c;
        if (meta) {
          route.feature.properties.coordinatesMeta = meta;
        }
        return true;
      }
    );
    TestBed.overrideComponent(RoutePanel, {
      set: { template: '', imports: [] }
    });
    TestBed.configureTestingModule({
      imports: [RoutePanel],
      providers: [
        {
          provide: AppFacade,
          useValue: {
            data: Object.assign(data, {
              vessels: { self: { position: [24.95, 60.14] } }
            }),
            formatValueForDisplay: () => ''
          }
        },
        {
          provide: SKResourceService,
          useValue: {
            getRelatedNotes: async () => [],
            fromCache: (_c: string, id: string) =>
              cached.has(id) ? [id, cached.get(id), true] : undefined,
            updateRouteCoords
          }
        },
        { provide: RouteBufferRegistry, useValue: registry },
        { provide: InfoPanelFacade, useValue: {} },
        {
          provide: CourseService,
          useValue: { courseData: signal({ pointIndex: 0 }), courseReverse }
        },
        { provide: TemporaryRouteService, useValue: {} },
        { provide: SKResourceGroupService, useValue: { with: async () => [] } },
        { provide: MatDialog, useValue: {} },
        { provide: MatBottomSheet, useValue: {} }
      ]
    });
  });

  const route = (readOnly = false) =>
    new SKRoute({
      name: 'Harbour run',
      feature: {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [...coords] },
        properties: {
          coordinatesMeta: names.map((name) => ({ name })),
          ...(readOnly ? { readOnly } : {})
        }
      }
    });

  const open = (id: string, shown: SKRoute = route()) => {
    const fixture = TestBed.createComponent(RoutePanel);
    fixture.componentRef.setInput('id', id);
    fixture.componentRef.setInput('route', shown);
    fixture.detectChanges();
    return fixture.componentInstance as unknown as {
      canReverse: () => boolean;
      onReverse: () => Promise<void>;
      points: () => Array<{ name: string }>;
    };
  };

  /** A saved route, shown in the panel as the very object the cache holds. */
  const saved = (id: string, readOnly = false) => {
    const r = route(readOnly);
    cached.set(id, r);
    return open(id, r);
  };

  const draft = () =>
    registry.create({
      points: coords.map((position, i) => ({ position, name: names[i] }))
    }).routeId;

  it('turns a draft round, its points and their names, before it is started', async () => {
    const id = draft();
    const panel = open(id);

    expect(panel.canReverse()).toBe(true);
    await panel.onReverse();

    expect(registry.get(id).points.map((p) => p.position)).toEqual(
      [...coords].reverse()
    );
    expect(registry.get(id).points.map((p) => p.name)).toEqual(
      [...names].reverse()
    );
    expect(panel.points().map((p) => p.name)).toEqual([...names].reverse());
    expect(courseReverse).not.toHaveBeenCalled();
  });

  it('turns it back again', async () => {
    const id = draft();
    const panel = open(id);

    await panel.onReverse();
    await panel.onReverse();

    expect(registry.get(id).points.map((p) => p.position)).toEqual(coords);
    expect(panel.points().map((p) => p.name)).toEqual(names);
  });

  it('lists the edited points turned round for a saved route with unsaved edits', async () => {
    // the panel still shows the saved route; the buffer holds an edit that
    // added a point
    const edited = [
      ...coords.map((position, i) => ({ position, name: names[i] })),
      { position: [24.96, 60.18] as Position, name: 'Four' }
    ];
    const { routeId } = registry.create({ points: edited });
    registry.markSaved(routeId, 'rte-1');
    registry.replace(routeId, edited);
    const panel = open(routeId);

    await panel.onReverse();

    expect(registry.get(routeId).points.map((p) => p.name)).toEqual([
      'Four',
      'Three',
      'Two',
      'One'
    ]);
    expect(panel.points().map((p) => p.name)).toEqual([
      'Four',
      'Three',
      'Two',
      'One'
    ]);
  });

  it('turns the route being followed round through the course', async () => {
    data.activeRoute = 'rte-1';
    const panel = saved('rte-1');

    expect(panel.canReverse()).toBe(true);
    await panel.onReverse();

    expect(courseReverse).toHaveBeenCalledOnce();
    expect(updateRouteCoords).not.toHaveBeenCalled();
  });

  it('turns a saved route round on the server, its points and their names', async () => {
    data.activeRoute = 'rte-other';
    const panel = saved('rte-1');

    expect(panel.canReverse()).toBe(true);
    await panel.onReverse();

    expect(updateRouteCoords).toHaveBeenCalledWith(
      'rte-1',
      [...coords].reverse(),
      [...names].reverse().map((name) => ({ name }))
    );
    expect(panel.points().map((p) => p.name)).toEqual([...names].reverse());
    expect(courseReverse).not.toHaveBeenCalled();
  });

  it('is not offered for a read-only route that is not being followed', () => {
    data.activeRoute = 'rte-other';
    expect(saved('rte-1', true).canReverse()).toBe(false);
  });
});
