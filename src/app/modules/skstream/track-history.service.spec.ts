import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of, Subject, throwError } from 'rxjs';
import { SignalKClient } from 'signalk-client-angular';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppFacade } from '../../app.facade';
import { MapService } from '../map/ol/lib/map.service';
import { TrackHistoryService } from './track-history.service';

const SELF_ID = 'vessels.urn:mrn:signalk:uuid:self';
const AIS = 'vessels.urn:mrn:imo:mmsi:366000010';

const trackFc = (coords: number[][][], times?: string[][]) => ({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'MultiLineString', coordinates: coords },
      properties: { providerId: 'tracks', coordTimes: times }
    }
  ]
});
const spanFc = {
  features: [
    {
      geometry: null,
      properties: {
        providerId: 'tracks',
        from: '2026-09-17T00:00:00Z',
        to: '2026-09-20T00:00:00Z',
        contextName: 'TEST 1',
        // well away from the view the tests start in
        bbox: [-100, 20, -99, 21]
      }
    }
  ]
};

describe('TrackHistoryService', () => {
  let service: TrackHistoryService;
  let get: ReturnType<typeof vi.fn>;
  let open: ReturnType<typeof vi.fn>;
  let close: ReturnType<typeof vi.fn>;
  let afterClosed: Subject<void>;
  let tracksApi: ReturnType<typeof signal<{ tracksApi: boolean }>>;
  let trackSource: ReturnType<typeof signal<{ api: string; provider: string }>>;
  /** Answer for a `/tracks?…` history request, by call order. */
  let answer: (path: string) => Observable<unknown>;
  /** Answer for a `geometry=false` span / extent request. */
  let meta: (path: string) => Observable<unknown>;
  let mapMoveRequest: ReturnType<
    typeof signal<{ center: number[]; zoom?: number } | null>
  >;

  const historyCalls = () =>
    get.mock.calls
      .map((c) => c[1] as string)
      .filter((p) => p.startsWith('/tracks?') && !p.includes('geometry=false'));
  const metaCalls = () =>
    get.mock.calls
      .map((c) => c[1] as string)
      .filter((p) => p.includes('geometry=false'));
  const params = (path: string) =>
    Object.fromEntries(new URLSearchParams(path.split('?')[1]));

  beforeEach(() => {
    vi.useFakeTimers();
    afterClosed = new Subject<void>();
    close = vi.fn(() => afterClosed.next());
    open = vi.fn(() => ({ afterClosed: () => afterClosed, close }));
    answer = () =>
      of(
        trackFc([
          [
            [-81.9, 24.5],
            [-81.8, 24.5]
          ]
        ])
      );
    get = vi.fn((_v: number, path: string) => {
      if (path.startsWith('/tracks/contexts')) {
        return of([SELF_ID, AIS]);
      }
      if (path.includes('geometry=false')) {
        return meta(path);
      }
      return answer(path);
    });
    meta = () => of(spanFc);
    mapMoveRequest = signal(null);
    tracksApi = signal({ tracksApi: true });
    trackSource = signal({ api: 'v2', provider: 'tracks' });
    TestBed.configureTestingModule({
      providers: [
        TrackHistoryService,
        {
          provide: AppFacade,
          useValue: {
            featureFlags: tracksApi,
            trackSource,
            data: {
              vessels: {
                self: { id: SELF_ID, name: 'eSea Street' },
                aisTargets: new Map()
              }
            },
            config: { trackHistoryPalettePos: null },
            saveConfig: vi.fn(),
            mapMoveRequest,
            MAP_ZOOM_EXTENT: { min: 2, max: 28 }
          }
        },
        {
          provide: MapService,
          useValue: {
            getMaps: () => [
              {
                getSize: () => [1000, 800],
                getView: () => ({ getRotation: () => 0 })
              }
            ]
          }
        },
        { provide: SignalKClient, useValue: { api: { get } } },
        { provide: MatDialog, useValue: { open } }
      ]
    });
    service = TestBed.inject(TrackHistoryService);
    TestBed.tick(); // settle the provider effect before each test
    service.setView([-82, 24, -81, 25], 12);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fetches the own vessel's whole history in the viewport and opens the palette", () => {
    service.toggle('self');
    const [path] = historyCalls();
    expect(params(path)).toMatchObject({
      context: 'self',
      // one pixel's ground distance a level into zoom 12, latitude 24.5
      epsilon: '17.4',
      maxPoints: '5000',
      times: 'true',
      provider: 'tracks'
    });
    expect(params(path).from).toBeUndefined();
    // the viewport padded by half its size on each side
    expect(params(path).bbox).toBe('-82.5,23.5,-80.5,25.5');
    expect(service.tracks().get('self').lines.length).toBe(1);
    expect(service.spans().get('self').from).toBe(
      Date.parse('2026-09-17T00:00:00Z')
    );
    expect(open).toHaveBeenCalledTimes(1);

    service.toggle(AIS);
    expect(open).toHaveBeenCalledTimes(1); // one palette for every vessel
    expect(service.label(AIS)).toBe('TEST 1'); // provider-recorded name
  });

  it('shows nothing without a Track API provider', () => {
    tracksApi.set({ tracksApi: false });
    service.toggle('self');
    expect(historyCalls()).toEqual([]);
    expect(service.shown()).toEqual([]);
  });

  it('refetches on move-end only when the view leaves the fetched box or the zoom changes', () => {
    service.toggle('self');
    expect(historyCalls().length).toBe(1);
    service.setView([-81.9, 24.1, -80.9, 25.1], 12.4); // inside the padded box
    vi.advanceTimersByTime(1000);
    expect(historyCalls().length).toBe(1);
    service.setView([-81.9, 24.1, -80.9, 25.1], 13.1); // zoomed a level
    vi.advanceTimersByTime(1000);
    expect(historyCalls().length).toBe(2);
    // ...and asked again at the finer detail of the new zoom
    expect(params(historyCalls()[1]).epsilon).toBe('8.69');
    service.setView([-75, 24, -74, 25], 13.1); // panned away
    vi.advanceTimersByTime(1000);
    expect(historyCalls().length).toBe(3);
  });

  it('fetches a dragged range once the handles settle', () => {
    service.toggle('self');
    const from = Date.parse('2026-09-18T00:00:00Z');
    service.setRange({ from: from - 3600000, to: null });
    service.setRange({ from, to: null });
    expect(historyCalls().length).toBe(1);
    expect(service.preset()).toBeNull();
    vi.advanceTimersByTime(1000);
    const calls = historyCalls();
    expect(calls.length).toBe(2);
    expect(params(calls[1]).from).toBe(new Date(from).toISOString());
  });

  it('never lets an older answer replace a newer one', () => {
    const replies: Subject<unknown>[] = [];
    answer = () => {
      const s = new Subject<unknown>();
      replies.push(s);
      return s;
    };
    service.toggle('self');
    service.setPreset('7d');
    vi.advanceTimersByTime(1000);
    expect(replies.length).toBe(2);
    replies[1].next(
      trackFc([
        [
          [1, 1],
          [2, 2]
        ]
      ])
    );
    replies[1].complete();
    replies[0].next(
      trackFc([
        [
          [9, 9],
          [8, 8]
        ]
      ])
    );
    replies[0].complete();
    expect(service.tracks().get('self').lines).toEqual([
      [
        [1, 1],
        [2, 2]
      ]
    ]);
    expect(service.pending()).toBe(0);
  });

  it('knows which vessels have recorded history, the own vessel under its context', () => {
    expect(service.hasHistory('self')).toBeUndefined();
    service.refreshRecorded();
    expect(service.hasHistory('self')).toBe(true);
    expect(service.hasHistory(AIS)).toBe(true);
    expect(service.hasHistory('vessels.urn:mrn:imo:mmsi:999')).toBe(false);
    service.refreshRecorded(); // listed recently: not asked again
    expect(
      get.mock.calls.filter((c) =>
        (c[1] as string).startsWith('/tracks/contexts')
      ).length
    ).toBe(1);
  });

  it('hides everything and closes the palette when the last vessel is removed', () => {
    service.toggle('self');
    service.toggle(AIS);
    service.remove('self');
    expect(close).not.toHaveBeenCalled();
    service.toggle(AIS);
    expect(close).toHaveBeenCalledTimes(1);
    expect(service.shown()).toEqual([]);
    expect(service.tracks().size).toBe(0);
  });

  it('places a ghost of each shown vessel at the scrubbed time, and none when live', () => {
    answer = () =>
      of(
        trackFc(
          [
            [
              [-81.9, 24.5],
              [-81.8, 24.5],
              [-81.7, 24.5]
            ]
          ],
          [
            [
              '2026-09-20T00:00:00Z',
              '2026-09-20T01:00:00Z',
              '2026-09-20T02:00:00Z'
            ]
          ]
        )
      );
    service.toggle('self');
    expect(service.ghosts()).toEqual([]);
    service.setScrub(Date.parse('2026-09-20T00:30:00Z'));
    const [g] = service.ghosts();
    expect(g.context).toBe('self');
    expect(g.position[0]).toBeCloseTo(-81.85);
    expect(g.heading).toBeCloseTo(Math.PI / 2, 1); // heading east
    service.setScrub(Date.parse('2026-09-21T00:00:00Z')); // nothing recorded then
    expect(service.ghosts()).toEqual([]);
    service.setScrub(Date.parse('2026-09-20T00:30:00Z'));
    service.clear();
    expect(service.scrubTime()).toBeNull();
  });

  it("drops a removed vessel's span, so the bar no longer spans its record", () => {
    service.toggle('self');
    service.toggle(AIS);
    expect(service.spans().has(AIS)).toBe(true);
    service.remove(AIS);
    expect(service.spans().has(AIS)).toBe(false);
    expect(service.spans().has('self')).toBe(true);
  });

  it('drops the old geometry and says so when a refresh fails', () => {
    service.toggle('self');
    expect(service.tracks().has('self')).toBe(true);
    answer = () => throwError(() => new Error('500'));
    service.setPreset('7d');
    vi.advanceTimersByTime(1000);
    expect(service.tracks().has('self')).toBe(false);
    expect(service.failed().has('self')).toBe(true);
    expect(service.pending()).toBe(0);
    // a later success clears it
    answer = () =>
      of(
        trackFc([
          [
            [1, 1],
            [2, 2]
          ]
        ])
      );
    service.setPreset('all');
    vi.advanceTimersByTime(1000);
    expect(service.failed().size).toBe(0);
    expect(service.tracks().has('self')).toBe(true);
  });

  it('ignores a failure superseded by a newer request', () => {
    const replies: Subject<unknown>[] = [];
    answer = () => {
      const s = new Subject<unknown>();
      replies.push(s);
      return s;
    };
    service.toggle('self');
    service.setPreset('7d');
    vi.advanceTimersByTime(1000);
    replies[1].next(
      trackFc([
        [
          [1, 1],
          [2, 2]
        ]
      ])
    );
    replies[1].complete();
    replies[0].error(new Error('500'));
    expect(service.failed().size).toBe(0);
    expect(service.tracks().has('self')).toBe(true);
    expect(service.pending()).toBe(0);
  });

  it('forgets everything from one provider when another takes over', async () => {
    const replies: Subject<unknown>[] = [];
    answer = () => {
      const s = new Subject<unknown>();
      replies.push(s);
      return s;
    };
    service.refreshRecorded();
    expect(service.recorded()).not.toBeNull();
    service.toggle('self');
    trackSource.set({ api: 'v2', provider: 'parquet' });
    TestBed.tick();
    expect(service.shown()).toEqual([]);
    expect(service.recorded()).toBeNull();
    // the old provider's answer arriving late is dropped
    replies[0].next(
      trackFc([
        [
          [1, 1],
          [2, 2]
        ]
      ])
    );
    replies[0].complete();
    expect(service.tracks().size).toBe(0);
  });

  it('hides everything when the palette is closed', () => {
    service.toggle('self');
    afterClosed.next();
    expect(service.shown()).toEqual([]);
    expect(service.tracks().size).toBe(0);
  });

  describe('zoom to a recorded track (#842)', () => {
    const noTrack = () => of({ type: 'FeatureCollection', features: [] });
    const metaWith = (bbox: number[] | undefined) =>
      of({
        features: [
          {
            geometry: null,
            properties: { ...spanFc.features[0].properties, bbox }
          }
        ]
      });

    it("takes the whole record's extent from the span, with no second request", () => {
      service.toggle('self');
      expect(metaCalls().length).toBe(1);
      expect(service.extents().get('self')).toEqual([-100, 20, -99, 21]);
    });

    it("asks where the selected range's track lies, and again when the range changes", () => {
      meta = (path) =>
        params(path).from ? metaWith([-90, 30, -89, 31]) : of(spanFc);
      service.setPreset('7d');
      service.toggle('self');
      // the whole record for the bar's axis, the range for the extent
      expect(metaCalls().length).toBe(2);
      expect(params(metaCalls()[1]).from).toBeDefined();
      expect(service.extents().get('self')).toEqual([-90, 30, -89, 31]);
      expect(service.spans().get('self').bbox).toEqual([-100, 20, -99, 21]);

      service.setPreset('all');
      vi.advanceTimersByTime(1000);
      expect(metaCalls().length).toBe(3);
      expect(params(metaCalls()[2]).from).toBeUndefined();
      expect(service.extents().get('self')).toEqual([-100, 20, -99, 21]);
    });

    it('does not ask for extents again when only the view moves', () => {
      service.toggle('self');
      service.setView([-75, 24, -74, 25], 12);
      vi.advanceTimersByTime(1000);
      expect(historyCalls().length).toBe(2);
      expect(metaCalls().length).toBe(1);
    });

    it('asks for extents after a range change even if a view move follows', () => {
      service.toggle('self');
      service.setPreset('7d');
      service.setView([-75, 24, -74, 25], 12); // restarts the debounce
      vi.advanceTimersByTime(1000);
      expect(metaCalls().length).toBe(2);
    });

    it('lists a vessel whose track lies outside the view, and not one drawn in it', () => {
      meta = () => metaWith([-81.9, 24.5, -81.8, 24.5]); // where it is drawn
      service.toggle('self');
      expect(service.offscreen()).toEqual([]); // drawn
      answer = noTrack;
      meta = () => of(spanFc);
      service.toggle(AIS);
      expect(service.offscreen()).toEqual([AIS]);
    });

    it('clears an extent failure when the range is asked for again', () => {
      meta = (path) =>
        params(path).from ? throwError(() => new Error('500')) : of(spanFc);
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      service.setPreset('7d');
      service.toggle('self');
      expect(service.extentFailed().has('self')).toBe(true);
      meta = () => of(spanFc);
      service.setPreset('30d');
      vi.advanceTimersByTime(1000);
      expect(service.extentFailed().has('self')).toBe(false);
      expect(service.extents().get('self')).toEqual([-100, 20, -99, 21]);
      warn.mockRestore();
    });

    it('does not call a drawn track out of view while the view is unknown', () => {
      service.toggle('self');
      service.viewExtent.set(null);
      expect(service.tracks().has('self')).toBe(true);
      expect(service.offscreen()).toEqual([]);
    });

    it('lists a track drawn in the padded box but out of the visible view', () => {
      meta = () => metaWith([-81.9, 24.5, -81.8, 24.5]);
      service.toggle('self');
      // still inside the fetched box, so nothing is refetched...
      service.setView([-81.7, 24.6, -80.7, 25.4], 12);
      vi.advanceTimersByTime(1000);
      expect(historyCalls().length).toBe(1);
      expect(service.tracks().has('self')).toBe(true);
      // ...but what was drawn is off-screen
      expect(service.offscreen()).toEqual(['self']);
    });

    it('counts span and extent requests as loading, and warns when one fails', () => {
      const replies: Subject<unknown>[] = [];
      meta = () => {
        const s = new Subject<unknown>();
        replies.push(s);
        return s;
      };
      service.setPreset('7d');
      service.toggle('self');
      expect(replies.length).toBe(2); // the whole record, and the range
      expect(service.pending()).toBe(2); // the track itself has answered
      replies[0].next(spanFc);
      replies[0].complete();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      replies[1].error(new Error('500'));
      expect(service.pending()).toBe(0);
      expect(service.extents().has('self')).toBe(false);
      // unknown, and known to be: not taken for "no track here"
      expect(service.extentFailed()).toEqual(new Set(['self']));
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('extent request for self failed')
      );
      warn.mockRestore();
    });

    it('does not call a range with nothing recorded "outside this area"', () => {
      answer = noTrack;
      meta = () => of({ features: [] });
      service.toggle('self');
      expect(service.extents().get('self')).toBeNull();
      expect(service.offscreen()).toEqual([]);
    });

    it('treats a provider that sends no bbox as unknown, not empty', () => {
      answer = noTrack;
      meta = () => metaWith(undefined);
      service.toggle('self');
      expect(service.extents().has('self')).toBe(false);
      expect(service.offscreen()).toEqual([]);
    });

    it('fits the map to the track, only when asked', () => {
      answer = noTrack;
      service.toggle('self');
      expect(mapMoveRequest()).toBeNull(); // never moved unasked
      service.zoomTo(['self']);
      const req = mapMoveRequest();
      expect(req.center[0]).toBeCloseTo(-99.5, 6);
      expect(req.center[1]).toBeGreaterThan(20);
      expect(req.center[1]).toBeLessThan(21);
      expect(req.zoom).toBeGreaterThan(8);
      expect(req.zoom).toBeLessThanOrEqual(16);
    });

    it('fits a track across the antimeridian near 180, and several tracks at once', () => {
      answer = noTrack;
      meta = () => metaWith([178, -18, -178, -16]);
      service.toggle(AIS);
      service.zoomTo([AIS]);
      expect(Math.abs(mapMoveRequest().center[0])).toBeCloseTo(180, 6);

      meta = () => metaWith([-176, -18, -175, -16]);
      service.toggle('self');
      service.zoomTo(service.offscreen());
      // the two together, the short way round: 178 east to 175 west
      expect(mapMoveRequest().center[0]).toBeCloseTo(-178.5, 6);
    });

    it('fits the track as it lies on a rotated (heading-up) map', () => {
      meta = () => metaWith([-100, 20, -90, 21]); // wide and flat
      let rotation = 0;
      TestBed.inject(MapService).getMaps = () =>
        [
          {
            getSize: () => [1000, 400],
            getView: () => ({ getRotation: () => rotation })
          }
        ] as never;
      service.toggle('self');
      service.zoomTo(['self']);
      const northUp = mapMoveRequest().zoom;
      rotation = Math.PI / 2; // the wide track now runs up the short side
      service.zoomTo(['self']);
      expect(mapMoveRequest().zoom).toBeLessThan(northUp - 1);
    });

    it('caps the zoom for a track of a single point', () => {
      meta = () => metaWith([-81.5, 24.5, -81.5, 24.5]);
      service.toggle('self');
      service.zoomTo(['self']);
      expect(mapMoveRequest().zoom).toBe(16);
    });

    it('drops an extent answer superseded by a newer range', () => {
      const replies: Subject<unknown>[] = [];
      meta = (path) => {
        if (!params(path).from) {
          return of(spanFc);
        }
        const s = new Subject<unknown>();
        replies.push(s);
        return s;
      };
      service.setPreset('7d');
      service.toggle('self');
      service.setPreset('30d');
      vi.advanceTimersByTime(1000);
      expect(replies.length).toBe(2);
      replies[1].next({
        features: [
          {
            geometry: null,
            properties: { ...spanFc.features[0].properties, bbox: [1, 1, 2, 2] }
          }
        ]
      });
      replies[0].next({ features: [] });
      expect(service.extents().get('self')).toEqual([1, 1, 2, 2]);
    });

    it("forgets a removed vessel's extent", () => {
      service.toggle('self');
      service.toggle(AIS);
      service.remove(AIS);
      expect(service.extents().has(AIS)).toBe(false);
      expect(service.extents().has('self')).toBe(true);
    });
  });
});
