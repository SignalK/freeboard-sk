import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of, Subject, throwError } from 'rxjs';
import { SignalKClient } from 'signalk-client-angular';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppFacade } from '../../app.facade';
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
        contextName: 'TEST 1'
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

  const historyCalls = () =>
    get.mock.calls
      .map((c) => c[1] as string)
      .filter((p) => p.startsWith('/tracks?') && !p.includes('geometry=false'));
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
        return of(spanFc);
      }
      return answer(path);
    });
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
            saveConfig: vi.fn()
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
});
