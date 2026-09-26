import { describe, expect, it } from 'vitest';
import {
  durationLabel,
  HISTORY_ALL,
  HISTORY_EPOCH,
  HISTORY_MAX_POINTS,
  historyAxis,
  historyContextsQuery,
  historyEpsilon,
  historyMetaQuery,
  historyQuery,
  loopToRange,
  minimumLoop,
  nearestVertexIndex,
  parseHistoryContexts,
  parseHistorySpan,
  parseHistoryTrack,
  parseTimedTracks,
  poseAt,
  nextPlaybackTime,
  stepScrubTime,
  bearingBetween,
  presetRange,
  rangeParams,
  rangeToLoop,
  segmentTimeInfo,
  trackTimeInfo,
  joinStretches,
  TrailStamps
} from './track-history';

const MIN = 60000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const NOW = Date.parse('2026-09-24T12:00:00.000Z');

const params = (q: string) => Object.fromEntries(new URLSearchParams(q));

describe('track-history ranges', () => {
  it('turns presets into ranges open at now', () => {
    expect(presetRange('7d', NOW)).toEqual({ from: NOW - 7 * DAY, to: null });
    expect(presetRange('30d', NOW)).toEqual({ from: NOW - 30 * DAY, to: null });
    expect(presetRange('all', NOW)).toEqual(HISTORY_ALL);
  });

  it('sends no window at all for the whole history', () => {
    expect(rangeParams(HISTORY_ALL)).toEqual({});
  });

  it('sends only from for a range open at now', () => {
    expect(rangeParams({ from: NOW - DAY, to: null })).toEqual({
      from: new Date(NOW - DAY).toISOString()
    });
  });

  it('opens a to-only range at the epoch, since to alone is not a window', () => {
    expect(rangeParams({ from: null, to: NOW })).toEqual({
      from: HISTORY_EPOCH,
      to: new Date(NOW).toISOString()
    });
  });
});

describe('historyEpsilon', () => {
  const box = (lat: number) => [-82, lat - 0.5, -81, lat + 0.5];

  it('is one Web Mercator pixel on the ground, in metres', () => {
    // zoom 0 on the equator: the equator's length over one 256-pixel tile
    expect(historyEpsilon(0, box(0))).toBe(157000);
    // a pixel covers half the ground at 60 degrees, and half again a level in
    expect(historyEpsilon(1, box(60))).toBe(39100);
  });

  it('follows the zoom level: coarse zoomed out, fine in a harbour', () => {
    const wide = historyEpsilon(6, box(24.5));
    const harbour = historyEpsilon(16, box(24.5));
    expect(wide).toBe(2230);
    expect(harbour).toBe(2.17);
    // each level in halves the tolerance
    expect(
      historyEpsilon(13, box(24.5)) / historyEpsilon(12, box(24.5))
    ).toBeCloseTo(0.5, 2);
  });

  it('reads the latitude from the middle of the view, clamped to the Mercator limit', () => {
    expect(historyEpsilon(12, [-82, 20, -81, 29])).toBe(
      historyEpsilon(12, box(24.5))
    );
    expect(historyEpsilon(18, [0, 88, 1, 90])).toBe(
      historyEpsilon(18, box(85))
    );
    expect(historyEpsilon(18, [0, 88, 1, 90])).toBeGreaterThan(0);
  });

  it('is null without a usable zoom or extent', () => {
    expect(historyEpsilon(NaN, box(24.5))).toBeNull();
    expect(historyEpsilon(12, undefined)).toBeNull();
    expect(historyEpsilon(12, [0, 0])).toBeNull();
    expect(historyEpsilon(12, [0, NaN, 1, 1])).toBeNull();
  });
});

describe('track-history queries', () => {
  it('asks for one vessel in the viewport at a detail for the view, capped, with times', () => {
    const p = params(
      historyQuery({
        context: 'self',
        bbox: [-82, 24, -81, 25],
        epsilon: 34.8,
        range: HISTORY_ALL,
        provider: 'tracks'
      })
    );
    expect(p).toEqual({
      context: 'self',
      bbox: '-82,24,-81,25',
      epsilon: '34.8',
      maxPoints: String(HISTORY_MAX_POINTS),
      times: 'true',
      provider: 'tracks'
    });
  });

  it('passes a range and an antimeridian box through', () => {
    const p = params(
      historyQuery({
        context: 'vessels.urn:mrn:imo:mmsi:366000010',
        bbox: [170, -20, -170, -10],
        range: { from: NOW - 7 * DAY, to: null }
      })
    );
    expect(p.context).toBe('vessels.urn:mrn:imo:mmsi:366000010');
    expect(p.bbox).toBe('170,-20,-170,-10');
    expect(p.from).toBe(new Date(NOW - 7 * DAY).toISOString());
    expect(p.to).toBeUndefined();
    // no view yet: the provider's own tolerance, under the point cap
    expect(p.epsilon).toBeUndefined();
    expect(p.simplify).toBeUndefined();
    expect(p.provider).toBeUndefined();
  });

  it('asks for metadata only when probing a recorded span', () => {
    expect(params(historyMetaQuery('self', 'tracks'))).toEqual({
      context: 'self',
      geometry: 'false',
      provider: 'tracks'
    });
  });

  it('opens the contexts listing at the epoch (a listing needs a window)', () => {
    expect(params(historyContextsQuery())).toEqual({ from: HISTORY_EPOCH });
  });
});

describe('track-history parseHistoryTrack', () => {
  const feature = (providerId: string, coords, coordTimes?) => ({
    type: 'Feature',
    geometry: { type: 'MultiLineString', coordinates: coords },
    properties: { context: 'vessels.x', providerId, coordTimes }
  });

  it('keeps every segment and its aligned recording times', () => {
    const fc = {
      features: [
        feature(
          'tracks',
          [
            [
              [1, 2],
              [3, 4]
            ],
            [[5, 6]]
          ],
          [
            ['2026-09-01T00:00:00Z', '2026-09-01T01:00:00Z'],
            ['2026-09-02T00:00:00Z']
          ]
        )
      ]
    };
    expect(parseHistoryTrack('self', fc)).toEqual({
      context: 'self',
      lines: [
        [
          [1, 2],
          [3, 4]
        ],
        [[5, 6]]
      ],
      times: [
        ['2026-09-01T00:00:00Z', '2026-09-01T01:00:00Z'],
        ['2026-09-02T00:00:00Z']
      ]
    });
  });

  it('drops the times when they do not line up with the points', () => {
    const fc = {
      features: [
        feature(
          'tracks',
          [
            [
              [1, 2],
              [3, 4]
            ]
          ],
          [['2026-09-01T00:00:00Z']]
        )
      ]
    };
    const t = parseHistoryTrack('self', fc);
    expect(t.lines.length).toBe(1);
    expect(t.times).toBeUndefined();
  });

  it('draws one provider only, preferring the default', () => {
    const fc = {
      features: [feature('parquet', [[[9, 9]]]), feature('tracks', [[[1, 1]]])]
    };
    expect(parseHistoryTrack('self', fc, 'tracks').lines).toEqual([[[1, 1]]]);
    expect(parseHistoryTrack('self', fc, 'other').lines).toEqual([[[9, 9]]]);
  });

  it('is undefined for an empty or malformed response', () => {
    expect(parseHistoryTrack('self', { features: [] })).toBeUndefined();
    expect(parseHistoryTrack('self', null)).toBeUndefined();
    expect(
      parseHistoryTrack('self', {
        features: [{ geometry: null, properties: {} }]
      })
    ).toBeUndefined();
  });
});

describe('track-history parseTimedTracks', () => {
  const f = (context: string, providerId: string, coords, coordTimes?) => ({
    geometry: { type: 'MultiLineString', coordinates: coords },
    properties: { context, providerId, coordTimes }
  });

  it('keys timed tracks by context, one provider each, and skips untimed ones', () => {
    const m = parseTimedTracks(
      {
        features: [
          f('vessels.a', 'parquet', [[[9, 9]]], [['2026-09-01T00:00:00Z']]),
          f('vessels.a', 'tracks', [[[1, 1]]], [['2026-09-02T00:00:00Z']]),
          f('vessels.b', 'tracks', [[[2, 2]]])
        ]
      },
      'tracks'
    );
    expect([...m.keys()]).toEqual(['vessels.a']);
    expect(m.get('vessels.a')).toEqual({
      lines: [[[1, 1]]],
      times: [['2026-09-02T00:00:00Z']]
    });
  });
});

describe('track-history parseHistorySpan / parseHistoryContexts', () => {
  it('reads the recorded span from metadata', () => {
    const fc = {
      features: [
        {
          geometry: null,
          properties: {
            providerId: 'tracks',
            from: '2026-09-17T00:00:00Z',
            to: '2026-09-20T00:00:00Z'
          }
        }
      ]
    };
    expect(parseHistorySpan(fc, 'tracks')).toEqual({
      from: Date.parse('2026-09-17T00:00:00Z'),
      to: Date.parse('2026-09-20T00:00:00Z')
    });
    expect(parseHistorySpan({ features: [] })).toBeUndefined();
  });

  it('reads the contexts listing', () => {
    expect(parseHistoryContexts(['a', 'b', 3])).toEqual(new Set(['a', 'b']));
    expect(parseHistoryContexts({ error: 'x' })).toEqual(new Set());
  });
});

describe('track-history range bar axis', () => {
  it('spans the earliest record to now on a grid that ends at or after now', () => {
    const a = historyAxis(NOW - 5 * DAY, NOW);
    expect(a.step).toBe(15 * MIN);
    expect(a.min).toBeLessThanOrEqual(NOW - 5 * DAY);
    expect(a.max).toBeGreaterThanOrEqual(NOW);
    expect((a.max - a.min) % a.step).toBe(0);
    expect((a.max - a.min) / a.step).toBeLessThanOrEqual(1000);
  });

  it('coarsens the step for a long history', () => {
    expect(historyAxis(NOW - 400 * DAY, NOW).step).toBe(DAY);
    expect(historyAxis(NOW - 5 * 365 * DAY, NOW).step).toBe(7 * DAY);
  });

  it('still gives a usable axis with no or very recent history', () => {
    const a = historyAxis(undefined, NOW);
    expect(a.max).toBeGreaterThan(a.min);
    const b = historyAxis(NOW - MIN, NOW);
    expect(b.max - b.min).toBeGreaterThanOrEqual(HOUR);
  });

  it('keeps the range handles at least one step apart', () => {
    const axis = { min: 0, max: 100, step: 10 };
    expect(minimumLoop({ min: 20, max: 60 }, axis)).toEqual({
      min: 20,
      max: 60
    });
    expect(minimumLoop({ min: 40, max: 40 }, axis)).toEqual({
      min: 40,
      max: 50
    });
    expect(minimumLoop({ min: 100, max: 100 }, axis)).toEqual({
      min: 90,
      max: 100
    });
  });

  it('puts an open end at that end of the axis, and back again', () => {
    const axis = { min: 1000, max: 5000 };
    expect(rangeToLoop(HISTORY_ALL, axis)).toEqual({ min: 1000, max: 5000 });
    expect(rangeToLoop({ from: 2000, to: 9000 }, axis)).toEqual({
      min: 2000,
      max: 5000
    });
    expect(loopToRange({ min: 1000, max: 5000 }, axis)).toEqual(HISTORY_ALL);
    expect(loopToRange({ min: 2000, max: 4000 }, axis)).toEqual({
      from: 2000,
      to: 4000
    });
  });
});

describe('track-history tapped segment', () => {
  const line: [number, number][] = [
    [-81.9, 24.5],
    [-81.8, 24.5],
    [-81.7, 24.5]
  ];
  const times = [
    '2026-09-20T10:00:00Z',
    '2026-09-20T11:00:00Z',
    '2026-09-20T13:30:00Z'
  ];

  it('finds the nearest vertex, across the antimeridian too', () => {
    expect(nearestVertexIndex(line, [-81.79, 24.51])).toBe(1);
    expect(
      nearestVertexIndex(
        [
          [179.9, 0],
          [-179.9, 0]
        ],
        [-179.95, 0]
      )
    ).toBe(1);
  });

  it('reports the segment span and the time at the tapped point', () => {
    const info = segmentTimeInfo(line, times, [-81.71, 24.5]);
    expect(info.start).toBe(Date.parse(times[0]));
    expect(info.end).toBe(Date.parse(times[2]));
    expect(info.duration).toBe(3.5 * HOUR);
    // 90% of the way along the 11:00 -> 13:30 leg
    expect(info.atTime).toBeCloseTo(Date.parse('2026-09-20T13:15:00Z'), -3);
  });

  it('has nothing to say without recording times', () => {
    expect(segmentTimeInfo(line, undefined, [0, 0])).toBeUndefined();
    expect(segmentTimeInfo(line, [], [0, 0])).toBeUndefined();
  });

  it('picks the segment nearest the tap on a multi-segment track', () => {
    const other: [number, number][] = [
      [-70, 30],
      [-70.1, 30]
    ];
    const otherTimes = ['2026-09-10T00:00:00Z', '2026-09-10T00:30:00Z'];
    const info = trackTimeInfo(
      [other, line],
      [otherTimes, times],
      [-81.79, 24.5]
    );
    expect(info.start).toBe(Date.parse(times[0]));
    expect(info.atTime).toBeCloseTo(Date.parse('2026-09-20T11:15:00Z'), -3);
    expect(
      trackTimeInfo([other, line], [otherTimes, []], [-81.79, 24.5]).start
    ).toBe(Date.parse(otherTimes[0])); // a segment without times is skipped
    expect(trackTimeInfo([line], undefined, [0, 0])).toBeUndefined();
  });

  it('picks the passage the tap is on, not the one with the nearest recorded point', () => {
    // a sparse passage whose leg runs under the tap, and the next day's
    // passage with a recorded point close by
    const sparse: [number, number][] = [
      [0, 0],
      [10, 0]
    ];
    const sparseTimes = ['2026-09-20T00:00:00Z', '2026-09-20T10:00:00Z'];
    const nextDay: [number, number][] = [
      [4.9, 0.3],
      [4.9, 5]
    ];
    const nextDayTimes = ['2026-09-21T00:00:00Z', '2026-09-21T05:00:00Z'];
    const info = trackTimeInfo(
      [nextDay, sparse],
      [nextDayTimes, sparseTimes],
      [5, 0.01]
    );
    expect(info.start).toBe(Date.parse(sparseTimes[0]));
    expect(info.atTime).toBeCloseTo(Date.parse('2026-09-20T05:00:00Z'), -3);
  });

  it('formats durations', () => {
    expect(durationLabel(30 * 1000)).toBe('< 1 min');
    expect(durationLabel(40 * MIN)).toBe('40 min');
    expect(durationLabel(2 * HOUR + 15 * MIN)).toBe('2 h 15 min');
    expect(durationLabel(3 * DAY + 4 * HOUR)).toBe('3 d 4 h');
    expect(durationLabel(2 * DAY)).toBe('2 d');
  });
});

describe('track-history scrubbing', () => {
  const line: [number, number][] = [
    [0, 0],
    [0, 1],
    [1, 1],
    [1, 0]
  ];
  const times = [
    '2026-09-20T00:00:00Z',
    '2026-09-20T01:00:00Z',
    '2026-09-20T02:00:00Z',
    '2026-09-20T03:00:00Z'
  ];
  const at = (iso: string) => Date.parse(iso);

  it('measures bearings clockwise from north', () => {
    expect(bearingBetween([0, 0], [0, 1])).toBeCloseTo(0);
    expect(bearingBetween([0, 0], [1, 0])).toBeCloseTo(Math.PI / 2);
    expect(bearingBetween([0, 1], [0, 0])).toBeCloseTo(Math.PI);
  });

  it('interpolates the position between the recorded points either side', () => {
    const p = poseAt([line], [times], at('2026-09-20T00:30:00Z'));
    expect(p.position[0]).toBeCloseTo(0);
    expect(p.position[1]).toBeCloseTo(0.5);
  });

  it('points the vessel at the recorded point two ahead', () => {
    // between points 0 and 1: two ahead is [1, 1], north-east of [0, 0.5]
    const p = poseAt([line], [times], at('2026-09-20T00:30:00Z'));
    expect(p.heading).toBeGreaterThan(0);
    expect(p.heading).toBeLessThan(Math.PI / 2);
  });

  it('at the end of a stretch, keeps the heading it arrived on', () => {
    const p = poseAt([line], [times], at('2026-09-20T03:00:00Z'));
    expect(p.position).toEqual([1, 0]);
    // from [0, 1] (two before the end) to [1, 0]: south-east
    expect(p.heading).toBeGreaterThan(Math.PI / 2);
    expect(p.heading).toBeLessThan(Math.PI);
  });

  it('is undefined outside the record and in a gap between stretches', () => {
    const later: [number, number][] = [[5, 5]];
    const laterTimes = ['2026-09-20T06:00:00Z'];
    const lines = [line, later];
    const ts = [times, laterTimes];
    expect(poseAt(lines, ts, at('2026-09-19T00:00:00Z'))).toBeUndefined();
    expect(poseAt(lines, ts, at('2026-09-20T04:00:00Z'))).toBeUndefined();
    expect(poseAt(lines, ts, at('2026-09-21T00:00:00Z'))).toBeUndefined();
    expect(poseAt(lines, ts, at('2026-09-20T06:00:00Z')).position).toEqual([
      5, 5
    ]);
    expect(poseAt([line], undefined, at(times[1]))).toBeUndefined();
  });

  it('interpolates across the antimeridian the short way', () => {
    const p = poseAt(
      [
        [
          [179, 0],
          [-179, 0]
        ]
      ],
      [['2026-09-20T00:00:00Z', '2026-09-20T01:00:00Z']],
      at('2026-09-20T00:15:00Z')
    );
    expect(p.position[0]).toBeCloseTo(179.5);
  });
});

describe('track-history playback', () => {
  const loop = { min: 100, max: 200 };

  it('starts at the range start, steps on, shows the end, then wraps', () => {
    expect(nextPlaybackTime(null, loop, 30)).toBe(100);
    expect(nextPlaybackTime(50, loop, 30)).toBe(100);
    expect(nextPlaybackTime(100, loop, 30)).toBe(130);
    expect(nextPlaybackTime(190, loop, 30)).toBe(200);
    expect(nextPlaybackTime(200, loop, 30)).toBe(100);
  });

  it('steps the scrubber by one grid step, clamped, with the end meaning live', () => {
    const axis = { min: 0, max: 100, step: 10 };
    expect(stepScrubTime(null, -1, axis)).toBe(90);
    expect(stepScrubTime(null, 1, axis)).toBeNull();
    expect(stepScrubTime(90, 1, axis)).toBeNull();
    expect(stepScrubTime(40, 1, axis)).toBe(50);
    expect(stepScrubTime(0, -1, axis)).toBe(0);
  });
});

describe('track-history TrailStamps (local trail)', () => {
  const at = (h: number) => `2026-09-24T${String(h).padStart(2, '0')}:00:00Z`;

  it('keeps a time per logged sample, so revisiting a spot keeps both', () => {
    // A -> B -> A: two samples at the same coordinates
    const a1: [number, number] = [0, 0];
    const b: [number, number] = [1, 0];
    const a2: [number, number] = [0, 0];
    const stamps = new TrailStamps();
    stamps.stamp(a1, at(10));
    stamps.stamp(b, at(11));
    stamps.stamp(a2, at(12));
    expect(stamps.timed([a1, b, a2]).times).toEqual([[at(10), at(11), at(12)]]);
  });

  it('leaves a point rebuilt from storage without a time', () => {
    const stamps = new TrailStamps();
    const p: [number, number] = [5, 5];
    stamps.stamp(p, at(10));
    const restored = JSON.parse(JSON.stringify(p));
    expect(stamps.timeOf(restored)).toBeUndefined();
    expect(stamps.timed([]).lines).toEqual([]);
  });

  it('answers a tap on an untimed leg with nothing, not a nearby time', () => {
    // restored (untimed) leg westward, then a newly logged (timed) stretch
    // well east of it
    const line: [number, number][] = [
      [0, 0],
      [1, 0],
      [5, 0],
      [6, 0]
    ];
    const times = [undefined, undefined, at(10), at(11)];
    expect(segmentTimeInfo(line, times, [0.5, 0.01])).toBeUndefined();
    // the timed stretch answers for itself, bounded to its own points
    const info = segmentTimeInfo(line, times, [5.5, 0.01]);
    expect(info.start).toBe(Date.parse(at(10)));
    expect(info.end).toBe(Date.parse(at(11)));
    expect(info.atTime).toBeCloseTo(Date.parse('2026-09-24T10:30:00Z'), -3);
    // the leg bridging untimed to timed has no time either
    expect(segmentTimeInfo(line, times, [3, 0.01])).toBeUndefined();
  });
});

describe('track-history joinStretches', () => {
  const a = {
    lines: [[[0, 0] as [number, number], [1, 1] as [number, number]]],
    times: [['2026-09-24T10:00:00Z', '2026-09-24T10:05:00Z']]
  };

  it('continues the last stretch when the next follows on in time', () => {
    const j = joinStretches(a, {
      lines: [[[2, 2]]],
      times: [['2026-09-24T10:06:00Z']]
    });
    expect(j.lines).toEqual([
      [
        [0, 0],
        [1, 1],
        [2, 2]
      ]
    ]);
    expect(j.times[0]).toHaveLength(3);
    expect(a.lines[0]).toHaveLength(2); // inputs untouched
  });

  it('starts a new stretch after a gap, or when there is nothing before', () => {
    const j = joinStretches(a, {
      lines: [[[2, 2]]],
      times: [['2026-09-24T11:00:00Z']]
    });
    expect(j.lines).toHaveLength(2);
    expect(joinStretches({ lines: [], times: [] }, a).lines).toEqual(a.lines);
  });
});
