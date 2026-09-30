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
  TEMPORARY_ROUTE_KEEP_MS,
  TemporaryRouteMarker,
  temporaryRouteMarker
} from './temporary-route';

const POINTS = [
  { position: [23.1, 60.1] as [number, number] },
  { position: [23.2, 60.2] as [number, number] },
  { position: [23.3, 60.3] as [number, number] }
];

const HOUR = 60 * 60 * 1000;

function storedRoute(
  id: string,
  opts: { temporary?: boolean; ageMs?: number; releasedAgoMs?: number } = {}
): FBRoute {
  const properties: { [name: string]: unknown } = {};
  if (opts.temporary) {
    const marker: TemporaryRouteMarker = temporaryRouteMarker(
      new Date(Date.now() - (opts.ageMs ?? 0))
    );
    if (opts.releasedAgoMs !== undefined) {
      marker.released = new Date(Date.now() - opts.releasedAgoMs).toISOString();
    }
    properties['temporary'] = marker;
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
  // Displayed routes (the cache) and every route stored on the server.
  const routes = signal<FBRoute[]>([]);
  const server = { routes: [] as FBRoute[] };
  const skres = {
    routes,
    fromCache: (_collection: string, id: string) =>
      routes().find((r) => r[0] === id),
    fromServer: vi.fn(() => Promise.reject(new Error('not found'))),
    listFromServer: vi.fn(() => Promise.resolve(server.routes)),
    putToServer: vi.fn(() => Promise.resolve({})),
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
    server,
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

  /** Displayed and stored on the server. */
  const store = (t: ReturnType<typeof setup>, ...rtes: FBRoute[]) => {
    t.routes.set(rtes);
    t.server.routes = rtes;
  };

  it('keeps the most recent temporary route when it stops being followed', async () => {
    const t = setup();
    store(t, storedRoute('rte-1', { temporary: true, ageMs: HOUR }));
    t.courseUpdate('rte-1');

    t.courseUpdate(null);
    await settle();

    expect(t.skres.deleteFromServer).not.toHaveBeenCalled();
    // stamped with when it stopped, so it expires a day after that
    expect(t.skres.putToServer).toHaveBeenCalledTimes(1);
    const [collection, id, route] = t.skres.putToServer.mock
      .calls[0] as unknown as [string, string, FBRoute[1]];
    expect([collection, id]).toEqual(['routes', 'rte-1']);
    const marker = route.feature.properties[
      'temporary'
    ] as TemporaryRouteMarker;
    expect(Date.now() - Date.parse(marker.released)).toBeLessThan(5000);
  });

  it('deletes the previous temporary route once a new one replaces it', async () => {
    const t = setup();
    // started a minute ago: the grace period does not protect a route that
    // has been followed
    store(
      t,
      storedRoute('rte-old', { temporary: true, ageMs: 60_000 }),
      storedRoute('rte-new', { temporary: true })
    );
    t.courseUpdate('rte-old');
    t.infoPanel.item.set({ id: 'rte-old' });

    t.setServerActiveRoute('rte-new');
    t.courseUpdate('rte-new');
    await settle();

    expect(t.skres.deleteFromServer).toHaveBeenCalledTimes(1);
    expect(t.skres.deleteFromServer).toHaveBeenCalledWith('routes', 'rte-old');
    expect(t.skres.selectionRemove).toHaveBeenCalledWith('routes', 'rte-old');
    expect(t.infoPanel.close).toHaveBeenCalled();
    expect(t.skres.putToServer).not.toHaveBeenCalled();
  });

  it('deletes the previous temporary route when a new one is started', async () => {
    const t = setup();
    // stopped a while ago and kept as the most recent one
    const previous = storedRoute('rte-prev', {
      temporary: true,
      ageMs: 2 * HOUR,
      releasedAgoMs: HOUR
    });
    const draft = t.registry.create({ points: POINTS });
    t.server.routes = [previous, storedRoute('rte-1', { temporary: true })];
    t.setServerActiveRoute('rte-1');

    await t.service.start(draft.routeId);
    await settle();

    expect(t.skres.deleteFromServer).toHaveBeenCalledTimes(1);
    expect(t.skres.deleteFromServer).toHaveBeenCalledWith('routes', 'rte-prev');
  });

  it('does nothing while the server still reports it as the active route', async () => {
    const t = setup();
    store(t, storedRoute('rte-1', { temporary: true }));
    t.courseUpdate('rte-1');
    t.setServerActiveRoute('rte-1');

    // e.g. switching the active vessel resets the local course state
    t.courseUpdate(null);
    await settle();

    expect(t.skres.putToServer).not.toHaveBeenCalled();
    expect(t.skres.deleteFromServer).not.toHaveBeenCalled();
  });

  it('leaves a saved route alone when it stops being followed', async () => {
    const t = setup();
    store(t, storedRoute('passage'));
    t.courseUpdate('passage');

    t.courseUpdate(null);
    await settle();

    expect(t.skres.listFromServer).not.toHaveBeenCalled();
    expect(t.skres.deleteFromServer).not.toHaveBeenCalled();
  });

  it('sweeps older temporary routes the user has not selected', async () => {
    const t = setup();
    t.server.routes = [
      storedRoute('rte-older', { temporary: true, ageMs: 3 * HOUR }),
      storedRoute('rte-latest', {
        temporary: true,
        ageMs: 2 * HOUR,
        releasedAgoMs: HOUR
      }),
      storedRoute('passage')
    ];

    await t.service.sweep();

    expect(t.skres.listFromServer).toHaveBeenCalledWith('routes');
    expect(t.skres.deleteFromServer).toHaveBeenCalledTimes(1);
    expect(t.skres.deleteFromServer).toHaveBeenCalledWith(
      'routes',
      'rte-older'
    );
  });

  it('sweeps the most recent temporary route a day after it stopped', async () => {
    const t = setup();
    t.server.routes = [
      storedRoute('rte-latest', {
        temporary: true,
        ageMs: TEMPORARY_ROUTE_KEEP_MS + 2 * HOUR,
        releasedAgoMs: TEMPORARY_ROUTE_KEEP_MS + HOUR
      })
    ];

    await t.service.sweep();

    expect(t.skres.deleteFromServer).toHaveBeenCalledWith(
      'routes',
      'rte-latest'
    );
  });

  it('sweeps nothing when the server state is unavailable', async () => {
    const t = setup();
    t.skres.listFromServer.mockRejectedValue(new Error('unauthorized'));

    await t.service.sweep();

    expect(t.skres.deleteFromServer).not.toHaveBeenCalled();
  });

  const due = () => [
    storedRoute('rte-older', { temporary: true, ageMs: 3 * HOUR }),
    storedRoute('rte-latest', { temporary: true, ageMs: HOUR })
  ];

  it('does not retry a delete the server refused this user', async () => {
    const t = setup();
    // a read-only user: every attempt is refused the same way
    t.skres.deleteFromServer.mockRejectedValue({ status: 403 });
    t.server.routes = due();

    await t.service.sweep();
    await t.service.sweep();

    expect(t.skres.deleteFromServer).toHaveBeenCalledTimes(1);
  });

  it('retries a delete that failed for another reason on the next sweep', async () => {
    const t = setup();
    t.skres.deleteFromServer
      .mockRejectedValueOnce({ status: 503 })
      .mockResolvedValueOnce(undefined);
    t.server.routes = due();

    await t.service.sweep();
    await t.service.sweep();

    expect(t.skres.deleteFromServer).toHaveBeenCalledTimes(2);
    expect(t.skres.deleteFromServer).toHaveBeenLastCalledWith(
      'routes',
      'rte-older'
    );
  });
});
