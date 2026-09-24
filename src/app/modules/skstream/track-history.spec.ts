import { describe, expect, it } from 'vitest';
import {
  durationLabel,
  HISTORY_ALL,
  HISTORY_EPOCH,
  HISTORY_MAX_POINTS,
  historyAxis,
  historyContextsQuery,
  historyMetaQuery,
  historyQuery,
  loopToRange,
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
  trackTimeInfo
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

describe('track-history queries', () => {
  it('asks for one vessel in the viewport, bounded, with times and no epsilon', () => {
    const p = params(
      historyQuery({
        context: 'self',
        bbox: [-82, 24, -81, 25],
        range: HISTORY_ALL,
        provider: 'tracks'
      })
    );
    expect(p).toEqual({
      context: 'self',
      bbox: '-82,24,-81,25',
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
    expect(p.epsilon).toBeUndefined();
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
    expect(segmentTimeInfo(line, times, [-81.71, 24.5])).toEqual({
      start: Date.parse(times[0]),
      end: Date.parse(times[2]),
      duration: 3.5 * HOUR,
      atTime: Date.parse(times[2])
    });
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
    expect(info.atTime).toBe(Date.parse(times[1]));
    expect(
      trackTimeInfo([other, line], [otherTimes, []], [-81.79, 24.5]).start
    ).toBe(Date.parse(otherTimes[0])); // a segment without times is skipped
    expect(trackTimeInfo([line], undefined, [0, 0])).toBeUndefined();
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
