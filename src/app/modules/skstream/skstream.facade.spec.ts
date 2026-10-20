import { afterEach, beforeEach, expect, describe, it, vi } from 'vitest';
import { signal } from '@angular/core';
import {
  SKStreamFacade,
  isPositionStale,
  SELF_POSITION_STALE_AGE,
  TRAIL_REFRESH_DEBOUNCE
} from './skstream.facade';
import { SKVessel } from '../skresources/resource-classes';
import { TRAIL_DURATION_ALL, TrackSource } from './track-source';

// AIS icons rotate by `orientation`. A crabbing target's heading and COG differ,
// so the icon must follow heading, with COG only as a fallback when no heading
// is reported. Guards the precedence in parseVesselOther against a silent
// reorder (#415).
describe('SKStreamFacade.parseVesselOther — AIS target orientation', () => {
  // Exercise the real (private) method without the heavy DI constructor.
  const orientationOf = (v: SKVessel): number => {
    const facade = Object.create(SKStreamFacade.prototype) as unknown as {
      app: unknown;
      parseVesselOther: (targets: Map<string, SKVessel>) => void;
    };
    facade.app = { useMagnetic: false, data: { vessels: {} } };
    facade.parseVesselOther(new Map([['ais', v]]));
    return v.orientation;
  };

  const vessel = (props: Partial<SKVessel>): SKVessel =>
    Object.assign(new SKVessel(), props);

  it('prefers true heading when both heading and COG are present', () => {
    expect(
      orientationOf(vessel({ headingTrue: Math.PI / 4, cogTrue: 1.658 }))
    ).toBe(Math.PI / 4);
  });

  // a buddy relayed over signalk-to-signalk may report only magnetic values
  // and its variation; the icon must then agree with its corrected COG vector
  it('corrects a magnetic-only heading by the target variation (#858)', () => {
    expect(
      orientationOf(vessel({ headingMagnetic: 1, magneticVariation: 0.2 }))
    ).toBeCloseTo(1.2, 9);
  });

  it('corrects a magnetic-only COG by the target variation (#858)', () => {
    expect(
      orientationOf(vessel({ cogMagnetic: 1, magneticVariation: 0.2 }))
    ).toBeCloseTo(1.2, 9);
  });

  it('falls back to COG when no heading is reported', () => {
    expect(
      orientationOf(
        vessel({ headingTrue: null, headingMagnetic: null, cogTrue: 1.658 })
      )
    ).toBe(1.658);
  });
});

// The anchor values the facade hands to the anchor watch come from the
// navigation.anchor.* deltas, which carry plain numbers.
describe('SKStreamFacade.parseVesselSelf — anchor', () => {
  it('passes on the current anchor radius', () => {
    const facade = Object.create(SKStreamFacade.prototype) as unknown as {
      app: unknown;
      course: unknown;
      anchorSignal: ReturnType<typeof signal>;
      parseSelfRacing: () => void;
      processVessel: () => void;
      refreshSelfNightMode: () => void;
      refreshSelfPositionStale: () => void;
      parseVesselSelf: (v: SKVessel) => void;
    };
    facade.app = {
      config: { vessels: { fixedLocationMode: false } },
      data: { vessels: {} }
    };
    facade.course = { parseSelf: (): void => undefined };
    facade.anchorSignal = signal({});
    facade.parseSelfRacing = (): void => undefined;
    facade.processVessel = (): void => undefined;
    facade.refreshSelfNightMode = (): void => undefined;
    facade.refreshSelfPositionStale = (): void => undefined;

    const v = new SKVessel();
    v.anchor = { maxRadius: 40, radius: 25, position: null };
    facade.parseVesselSelf(v);

    expect(facade.anchorSignal()).toEqual({
      position: null,
      maxRadius: 40,
      radius: 25
    });
  });
});

// The worker drops an AIS target once it expires, and the map, the sidebar
// and the course tools all read the active vessel.
describe('SKStreamFacade.parseUpdateMessage — active vessel', () => {
  const update = (activeId: string | null, targets: Map<string, SKVessel>) => {
    const self = new SKVessel();
    const facade = Object.create(SKStreamFacade.prototype) as unknown as {
      app: {
        data: {
          vessels: {
            self: SKVessel;
            active?: SKVessel;
            activeId: string | null;
            aisTargets: Map<string, SKVessel>;
            aisTracks: Map<string, unknown>;
          };
        };
      };
      aisLifecycle: ReturnType<typeof signal>;
      vesselsUpdate: { next: () => void };
      parseVesselSelf: (v: SKVessel) => void;
      parseVesselOther: (targets: Map<string, SKVessel>) => void;
      parseUpdateMessage: (msg: unknown) => void;
    };
    facade.app = {
      data: {
        vessels: {
          self,
          activeId,
          aisTargets: new Map(),
          aisTracks: new Map()
        }
      }
    };
    facade.aisLifecycle = signal({ updated: [], stale: [], expired: [] });
    facade.vesselsUpdate = { next: (): void => undefined };
    facade.parseVesselSelf = (): void => undefined;
    facade.parseVesselOther = (t): void => {
      facade.app.data.vessels.aisTargets = t;
    };
    facade.parseUpdateMessage({
      action: 'update',
      result: {
        self,
        aisTargets: targets,
        paths: {},
        aisStatus: { updated: [], stale: [], expired: [] }
      }
    });
    return { vessels: facade.app.data.vessels, self };
  };

  it('follows the selected AIS target', () => {
    const target = new SKVessel();
    const { vessels } = update('ais1', new Map([['ais1', target]]));
    expect(vessels.active).toBe(target);
    expect(vessels.activeId).toBe('ais1');
  });

  it('follows the own vessel again once the selected target has expired', () => {
    const { vessels, self } = update('ais1', new Map());
    expect(vessels.active).toBe(self);
    expect(vessels.activeId).toBeNull();
  });
});

/**
 * Position age is measured against the client clock stamp applied when the
 * position delta arrived (#672), so it reports "no data" whether the
 * connection dropped or the server is still talking with no position source.
 */
describe('isPositionStale (#672)', () => {
  const now = 1_000_000;

  it('is not stale while updates are arriving', () => {
    expect(isPositionStale(now - 1000, now)).toBe(false);
  });

  it('is not stale exactly at the threshold', () => {
    expect(isPositionStale(now - SELF_POSITION_STALE_AGE, now)).toBe(false);
  });

  it('is stale once the threshold is passed', () => {
    expect(isPositionStale(now - SELF_POSITION_STALE_AGE - 1, now)).toBe(true);
  });

  it('is not stale when no position has ever been received', () => {
    expect(isPositionStale(0, now)).toBe(false);
  });
});

// A target's ship type — what colours it on the chart — arrives as a
// `design.aisShipType` path delta, not inside the empty-path identity object
// the subscription already asks for. The server matches subscription paths
// exactly, so a list without it leaves every target in the "unknown" colour
// no matter how often it broadcasts its static report.
describe('SKStreamFacade.subscribe — what the stream asks for', () => {
  interface Subscription {
    cmd: string;
    options: { context: string; path: { path: string }[] };
  }

  const subscriptionsPosted = (): Subscription[] => {
    const posted: Subscription[] = [];
    const facade = Object.create(SKStreamFacade.prototype) as unknown as {
      worker: { postMessage: (msg: Subscription) => void };
      subscribe: () => void;
    };
    facade.worker = { postMessage: (msg) => posted.push(msg) };
    facade.subscribe();
    return posted;
  };

  it('asks every vessel for its ship type', () => {
    const vessels = subscriptionsPosted().find(
      (s) => s.cmd === 'subscribe' && s.options.context === 'vessels.*'
    );
    expect(vessels).toBeDefined();
    expect(vessels?.options.path.map((p) => p.path)).toContain(
      'design.aisShipType'
    );
  });
});

// The server simplifies the trail older than an hour to about a pixel at the
// zoom it was fetched for: kept after zooming in it looks coarse, after zooming
// out it carries points the chart cannot show.
describe('SKStreamFacade.postMapView — trail fetched for the zoom', () => {
  interface Msg {
    cmd: string;
    options?: Record<string, unknown>;
  }
  const extent = [-1, 50, 1, 51];

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** A view change, and then the view holding still. */
  const view = (
    facade: { postMapView: (extent: number[], zoom: number) => void },
    viewExtent: number[],
    zoom: number
  ) => {
    facade.postMapView(viewExtent, zoom);
    vi.advanceTimersByTime(TRAIL_REFRESH_DEBOUNCE);
  };

  const facadeWith = (
    vessels: { trail?: boolean; trailDuration?: number } = {},
    serverTrailWanted = true,
    api: TrackSource['api'] = 'v2'
  ) => {
    const posted: Msg[] = [];
    const facade = Object.create(SKStreamFacade.prototype) as unknown as {
      app: unknown;
      worker: { postMessage: (msg: Msg) => void };
      postMapView: (extent: number[], zoom: number) => void;
      requestTrailFromServer: (recentOnly?: boolean) => void;
      refreshTrail: () => void;
      parseSelfTrail: (msg: { result: unknown }) => void;
    };
    facade.worker = { postMessage: (msg) => posted.push(msg) };
    const config = {
      vessels: {
        trail: true,
        trailDuration: TRAIL_DURATION_ALL,
        trailResolution: { lastHour: '5s', next23: '1m', beyond24: '5m' },
        ...vessels
      }
    };
    facade.app = {
      config,
      serverTrailWanted: () => serverTrailWanted,
      trackSource: () => ({ api }),
      data: { serverTrail: true },
      selfTrailTimed: { set: (): void => undefined }
    };
    const trailRequests = () => posted.filter((m) => m.cmd === 'trail').length;
    return { facade, trailRequests, vessels: config.vessels, posted };
  };

  it('fetches the trail again when the zoom level changes', () => {
    const { facade, trailRequests } = facadeWith();
    view(facade, extent, 10.2);
    expect(trailRequests()).toBe(1);
    view(facade, extent, 12.4);
    expect(trailRequests()).toBe(2);
    view(facade, extent, 11.7);
    expect(trailRequests()).toBe(3);
  });

  it('fetches once for a zoom through several levels, at the level it stops on', () => {
    const { facade, trailRequests } = facadeWith();
    view(facade, extent, 10.2);
    [11.2, 12.2, 13.2, 14.2].forEach((zoom) =>
      facade.postMapView(extent, zoom)
    );
    expect(trailRequests()).toBe(1);
    vi.advanceTimersByTime(TRAIL_REFRESH_DEBOUNCE);
    expect(trailRequests()).toBe(2);
    view(facade, extent, 14.6);
    expect(trailRequests()).toBe(2);
  });

  it('is not held off by view changes that keep the zoom, as a heading-up chart sends under way', () => {
    const { facade, trailRequests } = facadeWith();
    view(facade, extent, 10.2);
    facade.postMapView(extent, 12.2);
    for (let i = 0; i < 4; i++) {
      vi.advanceTimersByTime(TRAIL_REFRESH_DEBOUNCE / 2);
      facade.postMapView(extent, 12.2);
    }
    expect(trailRequests()).toBe(2);
  });

  it('does not fetch it again for a pan or a zoom within the level', () => {
    const { facade, trailRequests } = facadeWith();
    view(facade, extent, 10.2);
    view(facade, [0, 50, 2, 51], 10.2);
    view(facade, extent, 10.9);
    expect(trailRequests()).toBe(1);
  });

  it('does not fetch it again for a pan by a whole view', () => {
    const { facade, trailRequests } = facadeWith();
    view(facade, extent, 10.2);
    view(facade, [1, 50, 3, 51], 10.2);
    view(facade, [-1, 51, 1, 52], 10.2);
    expect(trailRequests()).toBe(1);
  });

  it('fetches it again when the view leaves the box it was fetched for', () => {
    const { facade, trailRequests } = facadeWith();
    view(facade, extent, 10.2);
    view(facade, [2, 50, 4, 51], 10.2);
    expect(trailRequests()).toBe(2);
  });

  it('counts a fetch made for another reason as made for the current zoom', () => {
    const { facade, trailRequests } = facadeWith();
    view(facade, extent, 10.2);
    facade.requestTrailFromServer();
    view(facade, extent, 10.6);
    expect(trailRequests()).toBe(2);
  });

  it('does not count a refresh of the recent part as a fetch for the view', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { facade, trailRequests, posted } = facadeWith();
    view(facade, extent, 10.2);
    facade.parseSelfTrail({ result: null });
    facade.requestTrailFromServer(true);
    expect(posted.at(-1)?.options).toMatchObject({ recentOnly: true });
    view(facade, [0, 50, 2, 51], 10.2);
    expect(trailRequests()).toBe(3);
    vi.restoreAllMocks();
  });

  it('tries again on the next view change when the fetch failed', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { facade, trailRequests } = facadeWith();
    view(facade, extent, 10.2);
    facade.parseSelfTrail({ result: null });
    view(facade, [0, 50, 2, 51], 10.2);
    expect(trailRequests()).toBe(2);
    vi.restoreAllMocks();
  });

  it('fetches it again when the length is changed to All in the same view', () => {
    const { facade, trailRequests, vessels } = facadeWith({
      trailDuration: 24
    });
    view(facade, extent, 10.2);
    expect(trailRequests()).toBe(1);
    vessels.trailDuration = TRAIL_DURATION_ALL;
    facade.refreshTrail();
    expect(trailRequests()).toBe(2);
    facade.refreshTrail();
    expect(trailRequests()).toBe(2);
  });

  it('does not fetch a trail of a fixed length again for a pan out of the box', () => {
    const { facade, trailRequests } = facadeWith({ trailDuration: 24 });
    view(facade, extent, 10.2);
    view(facade, [2, 50, 4, 51], 10.2);
    expect(trailRequests()).toBe(1);
  });

  it('fetches a trail of a fixed length again when the zoom level changes', () => {
    const { facade, trailRequests } = facadeWith({ trailDuration: 24 });
    view(facade, extent, 10.2);
    view(facade, extent, 13.2);
    expect(trailRequests()).toBe(2);
  });

  it('leaves a one-hour trail alone, which is drawn as recorded', () => {
    const { facade, trailRequests } = facadeWith({ trailDuration: 1 });
    view(facade, extent, 10.2);
    view(facade, extent, 13.2);
    expect(trailRequests()).toBe(0);
  });

  it('leaves a trail from the v1 interface alone, which has no zoom to follow', () => {
    const { facade, trailRequests } = facadeWith({}, true, 'v1');
    view(facade, extent, 10.2);
    view(facade, extent, 13.2);
    expect(trailRequests()).toBe(0);
  });

  it('fetches nothing with the trail hidden or kept on this device', () => {
    [facadeWith({ trail: false }), facadeWith({}, false)].forEach(
      ({ facade, trailRequests }) => {
        view(facade, extent, 10.2);
        view(facade, extent, 13.2);
        expect(trailRequests()).toBe(0);
      }
    );
  });
});
