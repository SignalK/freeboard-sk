import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { SignalKClient } from 'signalk-client-angular';

import { AppFacade } from 'src/app/app.facade';
import { FBRoute } from 'src/app/types';
import { InfoPanelFacade } from 'src/app/modules/info-panel/info-panel.facade';
import { PlotterExtensionService } from 'src/app/modules/plotterext/plotterext.service';
import { RouteBufferRegistry } from 'src/app/modules/plotterext/route-buffer.registry';
import { SKResourceService } from 'src/app/modules/skresources/resources.service';
import { CourseService } from './course.service';
import { TemporaryRouteService } from './temporary-route.service';
import {
  TEMPORARY_ROUTE_GRACE_MS,
  temporaryRouteMarker
} from './temporary-route';

const POINTS = [
  { position: [23.1, 60.1] as [number, number] },
  { position: [23.2, 60.2] as [number, number] },
  { position: [23.3, 60.3] as [number, number] }
];

function storedRoute(
  id: string,
  opts: { temporary?: boolean; ageMs?: number } = {}
): FBRoute {
  const properties: { [name: string]: unknown } = {};
  if (opts.temporary) {
    properties['temporary'] = temporaryRouteMarker(
      new Date(Date.now() - (opts.ageMs ?? 0))
    );
  }
  return [
    id,
    {
      name: id,
      description: '',
      distance: 0,
      feature: {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [] },
        properties
      }
    },
    true
  ] as FBRoute;
}

const EXPIRED = TEMPORARY_ROUTE_GRACE_MS + 60_000;

/** Let the async cleanup (course GET, then deletes) run to completion. */
const settle = async () => {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

function setup() {
  const app = {
    data: { activeRoute: null as string | null },
    skApiVersion: 2,
    debug: () => undefined
  };
  let serverCourse: { activeRoute: { href: string } | null } = {
    activeRoute: null
  };
  const signalk = {
    api: { get: vi.fn(() => of(serverCourse)) }
  };
  const routes = signal<FBRoute[]>([]);
  const skres = {
    routes,
    fromCache: (_collection: string, id: string) =>
      routes().find((r) => r[0] === id),
    fromServer: vi.fn(() => Promise.reject(new Error('not found'))),
    listFromServer: vi.fn(() => Promise.resolve([] as FBRoute[])),
    deleteFromServer: vi.fn(() => Promise.resolve()),
    selectionRemove: vi.fn()
  };
  const courseData = signal({});
  const course = {
    courseData,
    activateRoute: vi.fn(() => Promise.resolve(true))
  };
  const registry = new RouteBufferRegistry();
  // Like the real save, the draft becomes a saved route backed by 'rte-1'.
  const plotterExt = {
    saveBuffer: vi.fn((routeId: string) => {
      registry.markSaved(routeId, 'rte-1');
      return Promise.resolve({ href: 'rte-1', rev: 2 });
    })
  };
  const infoPanel = {
    item: signal<{ id: string } | null>(null),
    open: vi.fn(),
    close: vi.fn()
  };

  TestBed.configureTestingModule({
    providers: [
      TemporaryRouteService,
      { provide: RouteBufferRegistry, useValue: registry },
      { provide: AppFacade, useValue: app },
      { provide: SignalKClient, useValue: signalk },
      { provide: SKResourceService, useValue: skres },
      { provide: CourseService, useValue: course },
      { provide: PlotterExtensionService, useValue: plotterExt },
      { provide: InfoPanelFacade, useValue: infoPanel }
    ]
  });
  const service = TestBed.inject(TemporaryRouteService);
  TestBed.tick();

  /** A course update from the stream: `activeRoute` is the local state. */
  const courseUpdate = (activeRoute: string | null) => {
    app.data.activeRoute = activeRoute;
    courseData.set({});
    TestBed.tick();
  };
  const setServerActiveRoute = (id: string | null) => {
    serverCourse = {
      activeRoute: id ? { href: `/resources/routes/${id}` } : null
    };
  };

  return {
    service,
    registry,
    signalk,
    skres,
    routes,
    course,
    plotterExt,
    infoPanel,
    courseUpdate,
    setServerActiveRoute
  };
}

describe('TemporaryRouteService — starting a drawn route', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('stores the drawn route as a temporary route and follows it', async () => {
    const t = setup();
    const draft = t.registry.create({ points: POINTS });

    const id = await t.service.start(draft.routeId, 2);

    expect(id).toBe('rte-1');
    expect(t.plotterExt.saveBuffer).toHaveBeenCalledWith(draft.routeId, {
      name: 'Temporary route',
      temporary: true
    });
    expect(t.course.activateRoute).toHaveBeenCalledWith('rte-1', 2);
  });

  it('keeps the name a draft already has', async () => {
    const t = setup();
    const draft = t.registry.create({ name: 'Harbour exit', points: POINTS });

    await t.service.start(draft.routeId);

    expect(t.plotterExt.saveBuffer).toHaveBeenCalledWith(draft.routeId, {
      name: 'Harbour exit',
      temporary: true
    });
    expect(t.course.activateRoute).toHaveBeenCalledWith('rte-1', 0);
  });

  it('moves an info panel showing the draft to the stored route', async () => {
    const t = setup();
    const draft = t.registry.create({ points: POINTS });
    t.infoPanel.item.set({ id: draft.routeId });

    await t.service.start(draft.routeId);

    expect(t.infoPanel.open).toHaveBeenCalledWith('routes', 'rte-1');
  });

  it('does not start a route that is already saved', async () => {
    const t = setup();
    t.registry.show({ routeId: 'saved', href: 'saved', points: POINTS });

    expect(t.service.isDraft('saved')).toBe(false);
    expect(await t.service.start('saved')).toBeNull();
    expect(t.plotterExt.saveBuffer).not.toHaveBeenCalled();
    expect(t.course.activateRoute).not.toHaveBeenCalled();
  });

  it('does not navigate when the route could not be stored', async () => {
    const t = setup();
    const draft = t.registry.create({ points: POINTS });
    t.plotterExt.saveBuffer.mockRejectedValueOnce(new Error('forbidden'));

    expect(await t.service.start(draft.routeId)).toBeNull();
    expect(t.course.activateRoute).not.toHaveBeenCalled();
  });

  it('gives the drawing back as a draft when the server will not follow it', async () => {
    const t = setup();
    const draft = t.registry.create({ name: 'Harbour exit', points: POINTS });
    t.infoPanel.item.set({ id: draft.routeId });
    t.course.activateRoute.mockResolvedValueOnce(false);

    expect(await t.service.start(draft.routeId)).toBeNull();

    expect(t.skres.deleteFromServer).toHaveBeenCalledWith('routes', 'rte-1');
    const drafts = t.registry.all().filter((b) => !b.saved);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].name).toBe('Harbour exit');
    expect(drafts[0].points.map((p) => p.position)).toEqual(
      POINTS.map((p) => p.position)
    );
    expect(t.infoPanel.close).toHaveBeenCalled();
    expect(t.infoPanel.open).not.toHaveBeenCalled();
  });

  it('keeps the stored copy as the drawing when it cannot be deleted', async () => {
    const t = setup();
    const draft = t.registry.create({ points: POINTS });
    t.course.activateRoute.mockResolvedValueOnce(false);
    t.skres.deleteFromServer.mockRejectedValueOnce(new Error('offline'));

    expect(await t.service.start(draft.routeId)).toBeNull();

    // no second copy: the stored route is still the only one
    expect(t.registry.all()).toHaveLength(1);
    expect(t.registry.all()[0].href).toBe('rte-1');
  });
});

describe('TemporaryRouteService — cleaning up', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('deletes a temporary route once it stops being the active route', async () => {
    const t = setup();
    t.routes.set([storedRoute('rte-1', { temporary: true })]);
    t.courseUpdate('rte-1');

    t.courseUpdate(null);
    await settle();

    expect(t.skres.deleteFromServer).toHaveBeenCalledWith('routes', 'rte-1');
    expect(t.skres.selectionRemove).toHaveBeenCalledWith('routes', 'rte-1');
  });

  it('closes an info panel showing the deleted route', async () => {
    const t = setup();
    t.routes.set([storedRoute('rte-1', { temporary: true })]);
    t.courseUpdate('rte-1');
    t.infoPanel.item.set({ id: 'rte-1' });

    t.courseUpdate(null);
    await settle();

    expect(t.infoPanel.close).toHaveBeenCalled();
  });

  it('keeps it while the server still reports it as the active route', async () => {
    const t = setup();
    t.routes.set([storedRoute('rte-1', { temporary: true })]);
    t.courseUpdate('rte-1');
    t.setServerActiveRoute('rte-1');

    // e.g. switching the active vessel resets the local course state
    t.courseUpdate(null);
    await settle();

    expect(t.signalk.api.get).toHaveBeenCalled();
    expect(t.skres.deleteFromServer).not.toHaveBeenCalled();
  });

  it('leaves a saved route alone when it stops being the active route', async () => {
    const t = setup();
    t.routes.set([storedRoute('passage')]);
    t.courseUpdate('passage');

    t.courseUpdate(null);
    await settle();

    expect(t.signalk.api.get).not.toHaveBeenCalled();
    expect(t.skres.deleteFromServer).not.toHaveBeenCalled();
  });

  it('deletes an expired temporary route among the displayed routes', async () => {
    const t = setup();

    // The stream never showed this client that the route stopped.
    t.routes.set([storedRoute('rte-old', { temporary: true, ageMs: EXPIRED })]);
    TestBed.tick();
    await settle();

    expect(t.skres.deleteFromServer).toHaveBeenCalledWith('routes', 'rte-old');
  });

  it('sweeps expired temporary routes the user has not selected', async () => {
    const t = setup();
    t.skres.listFromServer.mockResolvedValue([
      storedRoute('rte-old', { temporary: true, ageMs: EXPIRED }),
      storedRoute('rte-new', { temporary: true }),
      storedRoute('passage')
    ]);

    await t.service.sweep();
    await settle();

    expect(t.skres.listFromServer).toHaveBeenCalledWith('routes');
    expect(t.skres.deleteFromServer).toHaveBeenCalledTimes(1);
    expect(t.skres.deleteFromServer).toHaveBeenCalledWith('routes', 'rte-old');
  });

  it('sweeps nothing when the route list is unavailable', async () => {
    const t = setup();
    t.skres.listFromServer.mockRejectedValue(new Error('unauthorized'));

    await t.service.sweep();
    await settle();

    expect(t.skres.deleteFromServer).not.toHaveBeenCalled();
  });

  it('leaves a temporary route that was stored moments ago', async () => {
    const t = setup();

    // Another Freeboard has stored it and is about to make it active.
    t.routes.set([storedRoute('rte-new', { temporary: true })]);
    TestBed.tick();
    await settle();

    expect(t.skres.deleteFromServer).not.toHaveBeenCalled();
  });

  it('leaves the active temporary route alone however old it is', async () => {
    const t = setup();
    t.setServerActiveRoute('rte-long');

    t.routes.set([
      storedRoute('rte-long', { temporary: true, ageMs: EXPIRED })
    ]);
    TestBed.tick();
    await settle();

    expect(t.skres.deleteFromServer).not.toHaveBeenCalled();
  });

  it('does not retry a delete the server refused', async () => {
    const t = setup();
    t.skres.deleteFromServer.mockRejectedValue(new Error('forbidden'));
    const left = storedRoute('rte-old', { temporary: true, ageMs: EXPIRED });

    t.routes.set([left]);
    TestBed.tick();
    await settle();
    t.routes.set([left, storedRoute('passage')]);
    TestBed.tick();
    await settle();

    expect(t.skres.deleteFromServer).toHaveBeenCalledTimes(1);
  });
});
