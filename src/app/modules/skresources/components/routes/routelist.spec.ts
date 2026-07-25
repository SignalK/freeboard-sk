import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { MatDialog } from '@angular/material/dialog';

import { RouteListComponent } from './routelist';
import { SKResourceService } from '../../resources.service';
import { SKWorkerService } from 'src/app/modules/skstream/skstream.service';
import { AppFacade } from 'src/app/app.facade';
import { SKResourceGroupService } from '../groups/groups.service';
import { FBRoute, FBRoutes } from 'src/app/types/resources/freeboard';

/**
 * The "Show on Map" checkbox is bound to each entry's `r[2]` flag. When a route
 * is shown/hidden from *outside* the list (e.g. the map route popover's Hide
 * action, #551), only the displayed route cache changes — no server delta fires
 * — so the list must re-align its checkboxes with cache membership. These tests
 * drive the public `skres.routes()` signal and assert the observable checkbox
 * state, not the private sync helper.
 *
 * `TestBed.inject` gives a real injection context for the constructor effect
 * without rendering the template; `TestBed.tick()` flushes the effect.
 */
const route = (id: string, checked: boolean): FBRoute =>
  [id, { name: id } as never, checked] as FBRoute;

const fullListOf = (c: RouteListComponent) =>
  (c as unknown as { fullList: FBRoutes }).fullList;
const filteredSignalOf = (c: RouteListComponent) =>
  (c as unknown as { filteredList: WritableSignal<FBRoutes> }).filteredList;
const checkedOf = (list: FBRoutes, id: string) =>
  list.find((r) => r[0] === id)?.[2];

describe('RouteListComponent — Show-on-Map checkbox sync (#551)', () => {
  let routes: WritableSignal<FBRoutes>;
  let comp: RouteListComponent;

  const seed = (entries: FBRoutes) => {
    fullListOf(comp).length = 0;
    fullListOf(comp).push(...entries.map((e) => [...e] as FBRoute));
    filteredSignalOf(comp).set(entries.map((e) => [...e] as FBRoute));
  };

  beforeEach(() => {
    routes = signal<FBRoutes>([]);
    TestBed.configureTestingModule({
      providers: [
        RouteListComponent,
        { provide: SKResourceService, useValue: { routes } },
        {
          provide: SKWorkerService,
          useValue: { resourceUpdate: signal({ path: '' }) }
        },
        { provide: AppFacade, useValue: {} },
        { provide: MatDialog, useValue: {} },
        { provide: SKResourceGroupService, useValue: {} }
      ]
    });
    comp = TestBed.inject(RouteListComponent);
  });

  it('unticks a route removed from the displayed cache elsewhere', () => {
    seed([route('r1', true), route('r2', true)]);
    // External hide: r2 leaves the displayed cache.
    routes.set([route('r1', true)]);
    TestBed.tick();

    const filtered = filteredSignalOf(comp)();
    expect(checkedOf(filtered, 'r2')).toBe(false);
    expect(checkedOf(filtered, 'r1')).toBe(true);
    expect(checkedOf(fullListOf(comp), 'r2')).toBe(false);
  });

  it('re-ticks a route added back to the displayed cache', () => {
    seed([route('r1', true), route('r2', false)]);
    // External show: r2 re-enters the displayed cache.
    routes.set([route('r1', true), route('r2', true)]);
    TestBed.tick();

    expect(checkedOf(filteredSignalOf(comp)(), 'r2')).toBe(true);
  });
});
