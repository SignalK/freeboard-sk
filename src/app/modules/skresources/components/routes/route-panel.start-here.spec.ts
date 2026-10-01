import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, it, expect } from 'vitest';
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

/**
 * "Start here" on a point of a route that isn't being followed starts the route
 * at that point. The route is started by its stored point index, counted from 0.
 */
describe('RoutePanel Start here', () => {
  let started: Array<[string, number]>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    started = [];
    TestBed.overrideComponent(RoutePanel, {
      set: { template: '', imports: [] }
    });
    TestBed.configureTestingModule({
      imports: [RoutePanel],
      providers: [
        {
          provide: AppFacade,
          useValue: {
            data: {
              activeRoute: null,
              activeRouteReversed: false,
              vessels: { self: { position: [24.95, 60.14] } }
            },
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
        {
          provide: RouteBufferRegistry,
          useValue: { live: signal([]), get: () => undefined }
        },
        { provide: InfoPanelFacade, useValue: {} },
        {
          provide: CourseService,
          useValue: {
            courseData: signal({ pointIndex: -1 }),
            activateRoute: async (id: string, index: number) => {
              started.push([id, index]);
              return true;
            }
          }
        },
        { provide: TemporaryRouteService, useValue: {} },
        { provide: SKResourceGroupService, useValue: { with: async () => [] } },
        { provide: MatDialog, useValue: {} },
        { provide: MatBottomSheet, useValue: {} }
      ]
    });
  });

  const startHere = (
    coordinatesMeta: Array<{ name: string }> | undefined,
    listed: string
  ) => {
    const fixture = TestBed.createComponent(RoutePanel);
    fixture.componentRef.setInput('id', 'rte-1');
    fixture.componentRef.setInput(
      'route',
      new SKRoute({
        name: 'Harbour run',
        feature: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [24.95, 60.15],
              [24.955, 60.16],
              [24.95, 60.17]
            ]
          },
          properties: coordinatesMeta ? { coordinatesMeta } : {}
        }
      })
    );
    fixture.detectChanges();
    const panel = fixture.componentInstance as unknown as {
      points: () => Array<{ index: number; name: string }>;
      onGoto: (index?: number) => void;
    };
    // the point list's "Start here" button passes the point's index
    panel.onGoto(panel.points().find((p) => p.name === listed).index);
  };

  const named = [{ name: 'One' }, { name: 'Two' }, { name: 'Three' }];

  it('starts a route with named points at the point chosen', () => {
    startHere(named, 'Two');
    expect(started).toEqual([['rte-1', 1]]);
  });

  it('starts a route with named points at its last point', () => {
    startHere(named, 'Three');
    expect(started).toEqual([['rte-1', 2]]);
  });

  it('starts a route without point names at the point chosen', () => {
    startHere(undefined, 'RtePt-002');
    expect(started).toEqual([['rte-1', 1]]);
  });
});
