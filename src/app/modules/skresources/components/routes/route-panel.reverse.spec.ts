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
 * so its points are turned round before START follows it.
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

  beforeEach(() => {
    TestBed.resetTestingModule();
    registry = new RouteBufferRegistry();
    courseReverse = vi.fn();
    data = { activeRoute: null, activeRouteReversed: false };
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
            fromCache: () => undefined
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

  const open = (id: string) => {
    const fixture = TestBed.createComponent(RoutePanel);
    fixture.componentRef.setInput('id', id);
    fixture.componentRef.setInput(
      'route',
      new SKRoute({
        name: 'Harbour run',
        feature: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords },
          properties: { coordinatesMeta: names.map((name) => ({ name })) }
        }
      })
    );
    fixture.detectChanges();
    return fixture.componentInstance as unknown as {
      canReverse: () => boolean;
      onReverse: () => void;
      points: () => Array<{ name: string }>;
    };
  };

  const draft = () =>
    registry.create({
      points: coords.map((position, i) => ({ position, name: names[i] }))
    }).routeId;

  it('turns a draft round, its points and their names, before it is started', () => {
    const id = draft();
    const panel = open(id);

    expect(panel.canReverse()).toBe(true);
    panel.onReverse();

    expect(registry.get(id).points.map((p) => p.position)).toEqual(
      [...coords].reverse()
    );
    expect(registry.get(id).points.map((p) => p.name)).toEqual(
      [...names].reverse()
    );
    expect(panel.points().map((p) => p.name)).toEqual([...names].reverse());
    expect(courseReverse).not.toHaveBeenCalled();
  });

  it('turns it back again', () => {
    const id = draft();
    const panel = open(id);

    panel.onReverse();
    panel.onReverse();

    expect(registry.get(id).points.map((p) => p.position)).toEqual(coords);
    expect(panel.points().map((p) => p.name)).toEqual(names);
  });

  it('turns the route being followed round through the course', () => {
    data.activeRoute = 'rte-1';
    const panel = open('rte-1');

    expect(panel.canReverse()).toBe(true);
    panel.onReverse();

    expect(courseReverse).toHaveBeenCalledOnce();
  });

  it('is not offered for a stored route that is not being followed', () => {
    data.activeRoute = 'rte-other';
    expect(open('rte-1').canReverse()).toBe(false);
  });
});
