import { expect, describe, it, vi, afterEach, beforeEach } from 'vitest';
import {
  apiGet,
  applyServerAisTracks,
  assembleTrail,
  getVesselTrail,
  getVesselTrailV2,
  handleStreamEvent,
  initVessels,
  processVessel
} from './skstream.worker';
import { timedTrail } from './track-history';
import { SKVessel } from '../skresources/resource-classes';
import { Position } from 'src/app/types';
import { TRAIL_DURATION_ALL } from './track-source';

// getVesselTrail() fetches the server-side "self" track with several apiGet()
// calls fired in the same tick and awaited via Promise.all. A shared in-flight
// guard (added in v2.21.0) made every concurrent call after the first resolve
// to `undefined`, so Promise.all yielded holes, the trail parse threw, and the
// server track silently vanished (#492). Guard the concurrency contract:
// each concurrent call must return a real Promise that resolves with its own
// payload.
describe('skstream.worker apiGet — concurrent requests', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves every concurrent call, not just the first', async () => {
    // Respond after a macrotask so all calls are in flight simultaneously —
    // reproduces the overlap getVesselTrail() creates.
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve({
          json: () => new Promise((r) => setTimeout(() => r({ url }), 0))
        } as unknown as Response)
      )
    );

    const urls = ['/self/track?a', '/self/track?b', '/self/track?c'];
    const results = await Promise.all(urls.map((u) => apiGet(u)));

    expect(results).toEqual(urls.map((url) => ({ url })));
  });
});

// The stale-position indication (#672) is driven by a receipt time stamped
// here, in the worker, because only the worker sees per-path deltas. Stamping
// on the delta rather than on a changed value is what makes a boat at anchor —
// which reports the same position indefinitely — read as live rather than
// stale, so the stamp must advance on every position delta.
describe('skstream.worker processVessel — position receipt time (#672)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const positionDelta = {
    path: 'navigation.position',
    value: { latitude: 25.7, longitude: -80.2 }
  };

  it('stamps the local receipt time when a position delta arrives', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const vessel = new SKVessel();

    processVessel(vessel, positionDelta, true);

    expect(vessel.positionUpdatedAt).toBe(1_700_000_000_000);
  });

  it('advances the stamp when the reported position is unchanged', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const vessel = new SKVessel();
    processVessel(vessel, positionDelta, true);

    now.mockReturnValue(1_700_000_030_000);
    processVessel(vessel, positionDelta, true);

    expect(vessel.positionUpdatedAt).toBe(1_700_000_030_000);
  });

  it('leaves the stamp untouched for a non-position delta', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const vessel = new SKVessel();

    processVessel(
      vessel,
      { path: 'navigation.speedOverGround', value: 3 },
      true
    );

    expect(vessel.positionUpdatedAt).toBe(0);
  });
});

// The status bar's "No server messages!" indicator is driven by the watchdog
// alarm, which the interval timer raises after ~9s of silence. A detected close
// used to *disarm* the watchdog instead of alarming — and since closeStream()
// also stops that interval, the alarm became unreachable in exactly the case
// where the server is known to be gone: a clean server shutdown or restart
// (#695). The indicator only appeared for a silently-dead socket, the harder
// case. Guard that a detected loss of connection reports itself immediately.
describe('skstream.worker handleStreamEvent — watchdog on disconnect (#695)', () => {
  let posted: Array<Record<string, unknown>>;

  beforeEach(() => {
    initVessels(); // openStream() does this before any stream event arrives
    posted = [];
    vi.stubGlobal(
      'postMessage',
      vi.fn((msg: Record<string, unknown>) => posted.push(msg))
    );
    // The watchdog is module state that initVessels() does not touch, so an
    // alarm raised by one test would leak into the next. Start every test from
    // a live connection, via the same event that arms the watchdog for real.
    handleStreamEvent({
      action: 'onConnect',
      msg: { target: { readyState: 1 } }
    });
    posted = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const alarmUpdates = () =>
    posted.filter((m) => m.action === 'update' && m.watchDogAlarm === true);

  it('raises the alarm on a detected close', () => {
    handleStreamEvent({ action: 'onClose', msg: {} });

    expect(alarmUpdates()).toHaveLength(1);
  });

  it('still posts the close message the app reconnects on', () => {
    handleStreamEvent({ action: 'onClose', msg: {} });

    expect(posted.some((m) => m.action === 'close')).toBe(true);
  });

  it('raises the alarm on a connection error', () => {
    handleStreamEvent({ action: 'onError', msg: {} });

    expect(alarmUpdates()).toHaveLength(1);
  });
});

// Orientation is resolved in the worker because only it sees per-path deltas.
// With the shipped default the self icon followed COG, so a boat at anchor
// pointed at GPS noise while a valid heading sat unused on the bus (#704).
// Guard the delta-level contract: heading deltas stamp a receipt time, and an
// unset/auto preference orients by heading rather than COG.
describe('skstream.worker processVessel — orientation source (#704)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stamps the receipt time when a true heading delta arrives', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const vessel = new SKVessel();

    processVessel(vessel, { path: 'navigation.headingTrue', value: 1.5 }, true);

    expect(vessel.headingTrueUpdatedAt).toBe(1_700_000_000_000);
  });

  it('stamps the magnetic receipt time separately', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const vessel = new SKVessel();

    processVessel(
      vessel,
      { path: 'navigation.headingMagnetic', value: 2.2 },
      true
    );

    expect(vessel.headingMagneticUpdatedAt).toBe(1_700_000_000_000);
    expect(vessel.headingTrueUpdatedAt).toBe(0);
  });

  it('orients by heading, not COG, when stationary', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const vessel = new SKVessel();

    processVessel(
      vessel,
      { path: 'navigation.speedOverGround', value: 0 },
      true
    );
    processVessel(vessel, { path: 'navigation.headingTrue', value: 1.5 }, true);
    // COG noise at anchor must not steal the icon.
    processVessel(
      vessel,
      { path: 'navigation.courseOverGroundTrue', value: 3 },
      true
    );

    expect(vessel.orientation).toBe(1.5);
  });
});

// Everything drawn on the chart needs a TRUE angle. A boat that reports only
// magnetic heading/COG had its icon, heading line and COG vector rotated by the
// variation; with navigation.magneticVariation they are corrected (#858).
describe('skstream.worker processVessel — magnetic variation (#858)', () => {
  const rad = (d: number) => (d * Math.PI) / 180;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('re-orients a magnetic-only heading when the variation arrives', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const vessel = new SKVessel();

    processVessel(
      vessel,
      { path: 'navigation.headingMagnetic', value: rad(100) },
      true
    );
    expect(vessel.orientation).toBeCloseTo(rad(100), 9);

    processVessel(
      vessel,
      { path: 'navigation.magneticVariation', value: rad(12.8) },
      true
    );
    expect(vessel.magneticVariation).toBe(rad(12.8));
    expect(vessel.orientation).toBeCloseTo(rad(112.8), 9);
  });

  it('draws a magnetic-only COG vector along the true course', () => {
    const vessel = new SKVessel();
    const position = { latitude: -33.855, longitude: 151.225 };
    processVessel(
      vessel,
      { path: 'navigation.magneticVariation', value: rad(12.8) },
      true
    );
    processVessel(
      vessel,
      { path: 'navigation.speedOverGround', value: 3 },
      true
    );
    processVessel(
      vessel,
      { path: 'navigation.position', value: position },
      true
    );
    processVessel(
      vessel,
      { path: 'navigation.courseOverGroundMagnetic', value: rad(77.2) },
      true
    );

    const [from, to] = vessel.vectors.cog;
    const bearing =
      (Math.atan2((to[0] - from[0]) * Math.cos(rad(from[1])), to[1] - from[1]) *
        180) /
      Math.PI;
    expect(bearing).toBeCloseTo(90, 1);
  });
});

// AIS tracks from the v2 Track API (#820) replace a target's track wholesale,
// so they must not reach appendTrack() for a target with no position yet (it
// extends the track with the current position), and a server track is kept
// whole only while the target is still in the latest response — once it drops
// out it goes back to the short client-side tail.
describe('skstream.worker applyServerAisTracks — v2 AIS tracks (#820)', () => {
  const line = (n: number) =>
    Array.from(
      { length: n },
      (_, i) => [-81 + i * 0.001, 24] as [number, number]
    );

  const target = (position: [number, number] | null) => {
    const v = new SKVessel();
    v.position = position;
    v.positionReceived = position !== null;
    return v;
  };

  beforeEach(() => initVessels());

  it('applies a server track and extends it with the current position', () => {
    const v = target([-80, 25]);
    const targets = new Map([['vessels.a', v]]);
    v.id = 'vessels.a';

    applyServerAisTracks(targets, new Map([['vessels.a', [line(30)]]]));

    expect(v.track).toHaveLength(1);
    expect(v.track[0]).toHaveLength(31); // not cut to the 20-point tail
    expect(v.track[0][30]).toEqual([-80, 25]);
  });

  it('skips a target that has not reported a position yet', () => {
    const v = target(null);
    v.id = 'vessels.a';
    const before = v.track;

    expect(() =>
      applyServerAisTracks(
        new Map([['vessels.a', v]]),
        new Map([['vessels.a', [line(5)]]])
      )
    ).not.toThrow();
    expect(v.track).toBe(before);
  });

  it('skips empty lines and empty tracks', () => {
    const v = target([-80, 25]);
    v.id = 'vessels.a';
    const before = v.track;

    applyServerAisTracks(
      new Map([['vessels.a', v]]),
      new Map([['vessels.a', [[]]]])
    );

    expect(v.track).toBe(before);
  });

  it('trims a target back to the client tail as soon as it leaves the response', () => {
    const v = target([-80, 25]);
    v.id = 'vessels.a';
    const targets = new Map([['vessels.a', v]]);
    applyServerAisTracks(
      targets,
      new Map([['vessels.a', [line(10), line(30)]]])
    );

    applyServerAisTracks(targets, new Map()); // no longer in the response

    expect(v.track).toHaveLength(1);
    expect(v.track[0]).toHaveLength(20);
  });

  it('keeps the client tail once a trimmed target reports again', () => {
    const v = target([-80, 25]);
    v.id = 'vessels.a';
    const targets = new Map([['vessels.a', v]]);
    applyServerAisTracks(targets, new Map([['vessels.a', [line(30)]]]));

    applyServerAisTracks(targets, new Map()); // no longer in the response
    processVessel(v, {
      path: 'navigation.position',
      value: { latitude: 25.1, longitude: -79.9 }
    });

    expect(v.track[v.track.length - 1]).toHaveLength(20);
  });
});

describe('skstream.worker timedTrail — trail recording times (#821)', () => {
  const band = (coords: number[][][], coordTimes?: string[][]) => ({
    features: [
      {
        geometry: { type: 'MultiLineString', coordinates: coords },
        properties: { providerId: 'tracks', isSelf: true, coordTimes }
      }
    ]
  });

  it('joins the bands as recorded, each point with its time', () => {
    const t = timedTrail(
      [
        band(
          [
            [
              [1, 1],
              [2, 2]
            ]
          ],
          [['2026-09-23T00:00:00Z', '2026-09-23T01:00:00Z']]
        ),
        null,
        band([[[3, 3]]], [['2026-09-24T00:00:00Z']])
      ],
      'tracks'
    );
    expect(t.lines).toEqual([
      [
        [1, 1],
        [2, 2]
      ],
      [[3, 3]]
    ]);
    expect(t.times).toEqual([
      ['2026-09-23T00:00:00Z', '2026-09-23T01:00:00Z'],
      ['2026-09-24T00:00:00Z']
    ]);
  });

  it('joins bands that follow on in time into one stretch, but not across a gap', () => {
    const t = timedTrail([
      band(
        [
          [
            [1, 1],
            [2, 2]
          ]
        ],
        [['2026-09-23T00:00:00Z', '2026-09-23T01:00:00Z']]
      ),
      band(
        [[[3, 3]], [[4, 4]]],
        [['2026-09-23T01:00:05Z'], ['2026-09-23T05:00:00Z']]
      ),
      band([[[5, 5]]], [['2026-09-23T09:00:00Z']])
    ]);
    expect(t.lines).toEqual([
      [
        [1, 1],
        [2, 2],
        [3, 3]
      ],
      [[4, 4]],
      [[5, 5]]
    ]);
    expect(t.times[0]).toEqual([
      '2026-09-23T00:00:00Z',
      '2026-09-23T01:00:00Z',
      '2026-09-23T01:00:05Z'
    ]);
  });

  it('has no times when a band came back without them', () => {
    expect(
      timedTrail([
        band([[[1, 1]]], [['2026-09-23T00:00:00Z']]),
        band([[[3, 3]]])
      ])
    ).toBeUndefined();
    expect(timedTrail([null, null])).toBeUndefined();
  });
});

describe('skstream.worker assembleTrail — server-simplified bands', () => {
  // a zigzag finer than the fixed tolerance older bands are thinned to
  const zigzag = Array.from({ length: 10 }, (_, i): Position => [
    i * 0.0001,
    (i % 2) * 0.0001
  ]);
  const lastHour: Position[][] = [
    [
      [1, 1],
      [1.0001, 1.0001]
    ]
  ];

  it('thins an older band to the fixed tolerance', () => {
    const [older] = assembleTrail([[zigzag], lastHour]);
    expect(older.length).toBeLessThan(zigzag.length);
  });

  it('keeps a gap in the recording, simplified here or on the server', () => {
    const before: Position[] = [
      [177.0, -17.8],
      [177.01, -17.8]
    ];
    const after: Position[] = [
      [177.3, -17.9],
      [177.31, -17.9]
    ];
    [false, true].forEach((byServer) => {
      const trail = assembleTrail([[before, after], lastHour], [byServer]);
      expect(trail.slice(0, 2)).toEqual([before, after]);
    });
  });

  it('keeps the detail of a band the server simplified for the map zoom', () => {
    const [older, newest] = assembleTrail([[zigzag], lastHour], [true, false]);
    expect(older).toEqual(zigzag);
    expect(newest).toEqual(lastHour[0]);
  });
});

// With the trail length "All", a zoom change fetches the trail again while an
// earlier fetch may still be running; a new track source can do the same.
// Whichever answers last, only the latest request may reach the app: an
// earlier one carries the detail of another zoom or source, and its failure
// would ask the app to fetch again for nothing.
describe('skstream.worker own trail — overlapping fetches', () => {
  const tracks = 'http://h/signalk/v2/api/tracks';
  const opt = {
    trailDuration: TRAIL_DURATION_ALL,
    trailResolution: { lastHour: '5s', next23: '1m', beyond24: '5m' }
  };
  interface Call {
    resolve: (r: Response) => void;
    reject: (e: Error) => void;
  }
  let posted: Array<{ action: string; result: unknown }>;
  let calls: Call[];

  /** Start a trail request and return its pending band fetches. */
  const request = (): Call[] => {
    getVesselTrailV2(tracks, opt);
    return calls.splice(0);
  };
  /** Answer every band with a trail starting at `lon`. */
  const answer = (fetches: Call[], lon: number) =>
    fetches.forEach((c) =>
      c.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'MultiLineString',
                  coordinates: [
                    [
                      [lon, 0],
                      [lon + 1, 0]
                    ]
                  ]
                },
                properties: { isSelf: true, providerId: 'tracks' }
              }
            ]
          })
      } as unknown as Response)
    );
  /** Answer every v1 band with a trail starting at `lon`. */
  const answerV1 = (fetches: Call[], lon: number) =>
    fetches.forEach((c) =>
      c.resolve({
        json: () =>
          Promise.resolve({
            type: 'MultiLineString',
            coordinates: [
              [
                [lon, 0],
                [lon + 1, 0]
              ]
            ]
          })
      } as unknown as Response)
    );
  const fail = (fetches: Call[]) =>
    fetches.forEach((c) => c.reject(new Error('offline')));
  const settle = () => new Promise((r) => setTimeout(r, 0));
  const trails = () => posted.filter((m) => m.action === 'trail');

  beforeEach(() => {
    posted = [];
    calls = [];
    vi.stubGlobal(
      'postMessage',
      vi.fn((msg: { action: string; result: unknown }) => posted.push(msg))
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve, reject) =>
            calls.push({ resolve, reject })
          )
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts the latest trail only, even when an earlier one answers last', async () => {
    const earlier = request();
    const latest = request();
    expect(latest).toHaveLength(3);

    answer(latest, 10);
    await settle();
    answer(earlier, 20);
    await settle();

    expect(trails()).toHaveLength(1);
    expect((trails()[0].result as Position[][])[0][0]).toEqual([10, 0]);
  });

  it('drops the failure of an earlier request but posts the latest one', async () => {
    const earlier = request();
    const latest = request();

    fail(earlier);
    await settle();
    expect(trails()).toHaveLength(0);

    fail(latest);
    await settle();
    expect(trails()).toHaveLength(1);
    expect(trails()[0].result).toBeNull();
  });

  it('lets a request over another interface supersede one still running', async () => {
    const v2 = request();
    getVesselTrail(opt);
    const v1 = calls.splice(0);
    expect(v1).toHaveLength(3);

    answerV1(v1, 30);
    await settle();
    answer(v2, 20);
    await settle();

    expect(trails()).toHaveLength(1);
    expect((trails()[0].result as Position[][])[0][0]).toEqual([30, 0]);

    posted.length = 0;
    getVesselTrail(opt);
    const staleV1 = calls.splice(0);
    const latest = request();
    answer(latest, 10);
    await settle();
    answerV1(staleV1, 30);
    await settle();

    expect(trails()).toHaveLength(1);
    expect((trails()[0].result as Position[][])[0][0]).toEqual([10, 0]);
  });
});

describe('skstream.worker own trail — v1 resolution', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks v1 for the coarse steps in place of the fine defaults', () => {
    const fetch = vi.fn(() => new Promise<Response>(() => undefined));
    vi.stubGlobal('fetch', fetch);
    getVesselTrail({
      trailDuration: 48,
      trailResolution: { lastHour: '5s', next23: '5s', beyond24: '10s' }
    });
    const urls = fetch.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(urls).toHaveLength(3);
    expect(urls[0]).toContain('timespanOffset=24');
    expect(urls[0]).toContain('resolution=5m');
    expect(urls[1]).toContain('resolution=1m');
    expect(urls[2]).toContain('resolution=5s');
  });
});
