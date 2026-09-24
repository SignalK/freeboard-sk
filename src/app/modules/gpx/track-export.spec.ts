import { describe, expect, it } from 'vitest';
import {
  aisTrackDisplayed,
  attachTimes,
  displayedOwnTrail,
  exportRange,
  exportTrackName,
  gpxTrack,
  gpxTrackResource,
  hasExportableTrack,
  spanLabel,
  trackExportQuery,
  trackSpan,
  validCustomRange,
  vesselExportOffer,
  vesselLabel
} from './track-export';
import { SK2GPX } from './sk2gpx';
import type { Position } from '../../types';

const DAY = 86400000;
const NOW = Date.parse('2026-09-25T15:00:00.000Z');
const iso = (ms: number) => new Date(ms).toISOString();
const params = (q: string) => new URLSearchParams(q);

describe('exportRange', () => {
  it('fetches nothing for the displayed track', () => {
    expect(exportRange('displayed', NOW)).toBeNull();
  });

  it('opens the presets at now', () => {
    expect(exportRange('7d', NOW)).toEqual({ from: NOW - 7 * DAY, to: null });
    expect(exportRange('30d', NOW)).toEqual({
      from: NOW - 30 * DAY,
      to: null
    });
    expect(exportRange('all', NOW)).toEqual({ from: null, to: null });
  });

  it('uses the Track history range, when there is one', () => {
    const history = { from: NOW - 3 * DAY, to: NOW - DAY };
    expect(exportRange('history', NOW, { history })).toEqual(history);
    expect(exportRange('history', NOW)).toBeNull();
  });

  it('uses a custom range only when both ends are set and in order', () => {
    const custom = { from: NOW - DAY, to: NOW };
    expect(exportRange('custom', NOW, { custom })).toEqual(custom);
    expect(
      exportRange('custom', NOW, { custom: { from: NOW, to: NOW - DAY } })
    ).toBeNull();
    expect(
      exportRange('custom', NOW, { custom: { from: null, to: NOW } })
    ).toBeNull();
    expect(validCustomRange({ from: NOW, to: NOW })).toBe(false);
  });
});

describe('trackExportQuery', () => {
  it('asks for one vessel at full resolution, with point times', () => {
    const q = params(
      trackExportQuery(
        'vessels.urn:mrn:imo:mmsi:366000012',
        { from: NOW - 7 * DAY, to: null },
        'tracks-plugin'
      )
    );
    expect(q.get('context')).toBe('vessels.urn:mrn:imo:mmsi:366000012');
    expect(q.get('from')).toBe(iso(NOW - 7 * DAY));
    expect(q.has('to')).toBe(false);
    expect(q.get('times')).toBe('true');
    expect(q.get('provider')).toBe('tracks-plugin');
    // no display thinning and no viewport selection
    expect(q.has('maxPoints')).toBe(false);
    expect(q.has('epsilon')).toBe(false);
    expect(q.has('bbox')).toBe(false);
  });

  it('sends no window at all for the whole history', () => {
    const q = params(trackExportQuery('self', { from: null, to: null }));
    expect(q.get('context')).toBe('self');
    expect(q.has('from')).toBe(false);
    expect(q.has('to')).toBe(false);
    expect(q.has('provider')).toBe(false);
  });

  it('sends both ends of a closed range', () => {
    const q = params(trackExportQuery('self', { from: NOW - DAY, to: NOW }));
    expect(q.get('from')).toBe(iso(NOW - DAY));
    expect(q.get('to')).toBe(iso(NOW));
  });
});

describe('displayedOwnTrail', () => {
  const t = (m: number) => iso(NOW + m * 60000);
  const local = {
    lines: [
      [
        [3, 3],
        [4, 4]
      ] as Position[]
    ],
    times: [[t(2), t(3)]]
  };

  it('exports the local trail when the server trail is not drawn', () => {
    const r = displayedOwnTrail(
      false,
      { lines: [[[9, 9]]], times: [[t(0)]] },
      [[[9, 9]]],
      local
    );
    expect(r).toBe(local);
  });

  it('exports the recorded server trail, carried on by the local trail', () => {
    const serverTimed = {
      lines: [
        [
          [1, 1],
          [2, 2]
        ] as Position[]
      ],
      times: [[t(0), t(1)]]
    };
    const r = displayedOwnTrail(true, serverTimed, [], local);
    // the local trail follows on within the join gap: one passage
    expect(r.lines).toEqual([
      [
        [1, 1],
        [2, 2],
        [3, 3],
        [4, 4]
      ]
    ]);
    expect(r.times).toEqual([[t(0), t(1), t(2), t(3)]]);
  });

  it('exports a v1 server trail (no times) as drawn, every segment', () => {
    const server: Position[][] = [
      [
        [1, 1],
        [2, 2]
      ],
      [
        [5, 5],
        [6, 6]
      ]
    ];
    const r = displayedOwnTrail(true, null, server, local);
    expect(r.lines).toEqual([...server, ...local.lines]);
    expect(r.times[0]).toEqual([undefined, undefined]);
    expect(r.times[2]).toEqual(local.times[0]);
  });
});

describe('attachTimes', () => {
  it('matches times by position and leaves the live tail untimed', () => {
    const timed = {
      lines: [
        [
          [1, 1],
          [2, 2]
        ] as Position[]
      ],
      times: [['2026-09-25T14:00:00Z', '2026-09-25T14:01:00Z']]
    };
    const displayed: Position[][] = [
      [
        [1, 1],
        [2, 2],
        [3, 3]
      ]
    ];
    expect(attachTimes(displayed, timed).times).toEqual([
      ['2026-09-25T14:00:00Z', '2026-09-25T14:01:00Z', undefined]
    ]);
  });

  it('takes a repeated position in recording order', () => {
    const timed = {
      lines: [
        [
          [1, 1],
          [2, 2],
          [1, 1]
        ] as Position[]
      ],
      times: [['a', 'b', 'c']]
    };
    expect(attachTimes(timed.lines, timed).times).toEqual([['a', 'b', 'c']]);
  });

  it('has no times without a timed track', () => {
    expect(attachTimes([[[1, 1]]], undefined).times).toEqual([[undefined]]);
  });
});

describe('track name', () => {
  // local-time dates, so the labels hold in any time zone
  const at = (d: number, h: number, m: number) =>
    new Date(2026, 8, d, h, m).getTime();

  it('labels a span within a day, and across days', () => {
    expect(spanLabel({ from: at(25, 14, 5), to: at(25, 15, 5) })).toBe(
      '2026-09-25 14:05–15:05'
    );
    expect(spanLabel({ from: at(18, 9, 0), to: at(25, 15, 5) })).toBe(
      '2026-09-18 09:00 – 2026-09-25 15:05'
    );
  });

  it('names the track from its recorded span', () => {
    const times = [[iso(at(25, 15, 5)), undefined, iso(at(25, 14, 5))]];
    expect(trackSpan(times)).toEqual({
      from: at(25, 14, 5),
      to: at(25, 15, 5)
    });
    expect(exportTrackName('FERRY ONE (366000012)', times, NOW)).toBe(
      'FERRY ONE (366000012) 2026-09-25 14:05–15:05'
    );
  });

  it('falls back to the export time without recording times', () => {
    expect(exportTrackName('Vessel trail', [[undefined]], at(25, 16, 30))).toBe(
      'Vessel trail (exported 2026-09-25 16:30)'
    );
  });

  it('labels a vessel by name and MMSI', () => {
    const ctx = 'vessels.urn:mrn:imo:mmsi:366000012';
    expect(vesselLabel(ctx, 'FERRY ONE', '366000012')).toBe(
      'FERRY ONE (366000012)'
    );
    expect(vesselLabel(ctx, undefined, '366000012')).toBe('366000012');
    expect(vesselLabel(ctx, 'FERRY ONE')).toBe('FERRY ONE');
    expect(vesselLabel(ctx)).toBe('366000012');
  });
});

describe('export button', () => {
  it('is offered while the track is drawn', () => {
    const base = { zoom: 12, minZoom: 10 };
    expect(aisTrackDisplayed({ ...base, showAll: false, picked: true })).toBe(
      true
    );
    expect(aisTrackDisplayed({ ...base, showAll: false, picked: false })).toBe(
      false
    );
    expect(aisTrackDisplayed({ ...base, showAll: true, picked: false })).toBe(
      true
    );
    // "Show all tracks" draws nothing below its zoom; a pick draws at any zoom
    expect(
      aisTrackDisplayed({ zoom: 8, minZoom: 10, showAll: true, picked: true })
    ).toBe(false);
    expect(
      aisTrackDisplayed({ zoom: 8, minZoom: 10, showAll: false, picked: true })
    ).toBe(true);
  });

  it('starts on the displayed track, else on the Track history range', () => {
    const two: Position[][] = [
      [
        [1, 1],
        [2, 2]
      ]
    ];
    expect(
      vesselExportOffer({
        trackDisplayed: true,
        lines: two,
        historyShown: true
      })
    ).toBe('displayed');
    // history shown, the track itself not drawn (or too short to save)
    expect(
      vesselExportOffer({
        trackDisplayed: false,
        lines: two,
        historyShown: true
      })
    ).toBe('history');
    expect(
      vesselExportOffer({
        trackDisplayed: true,
        lines: [[[1, 1]]],
        historyShown: true
      })
    ).toBe('history');
    // neither shown: no button
    expect(
      vesselExportOffer({
        trackDisplayed: false,
        lines: two,
        historyShown: false
      })
    ).toBeNull();
    expect(
      vesselExportOffer({
        trackDisplayed: true,
        lines: [[[1, 1]]],
        historyShown: false
      })
    ).toBeNull();
  });

  it('needs at least two points', () => {
    expect(hasExportableTrack(undefined)).toBe(false);
    expect(hasExportableTrack([[[1, 1]]])).toBe(false);
    expect(
      hasExportableTrack([
        [[1, 1]],
        [
          [2, 2],
          [3, 3]
        ]
      ])
    ).toBe(true);
  });
});

describe('GPX track', () => {
  const times = [
    ['2026-09-25T14:05:00.000Z', '2026-09-25T14:06:00.000Z'],
    ['2026-09-25T15:00:00.000Z'],
    ['2026-09-25T15:04:00.000Z', undefined]
  ];
  const lines: Position[][] = [
    [
      [-80.1, 25.7],
      [-80.2, 25.8]
    ],
    [[-80.3, 25.9]],
    [
      [-80.4, 26.0],
      [-80.5, 26.1]
    ]
  ];

  it('drops one-point segments and is undefined with nothing left', () => {
    const t = gpxTrack('FERRY ONE', { lines, times }, NOW);
    expect(t.lines).toEqual([lines[0], lines[2]]);
    expect(t.times).toEqual([times[0], times[2]]);
    expect(gpxTrack('FERRY ONE', { lines: [[[1, 1]]], times: [[]] }, NOW)).toBe(
      undefined
    );
  });

  it('writes one track, a segment per line, and each known point time', () => {
    const t = gpxTrack('FERRY ONE', { lines, times }, NOW);
    const gpx = new SK2GPX();
    gpx.setTracks({ id1: gpxTrackResource('id1', t) });
    const xml = gpx.toXML();

    expect(xml.match(/<trk>/g)).toHaveLength(1);
    expect(xml).toContain(`<name>${t.name}</name>`);
    expect(xml.match(/<trkseg>/g)).toHaveLength(2);
    expect(xml.match(/<trkpt /g)).toHaveLength(4);
    expect(xml.match(/<time>[^<]*<\/time>/g).slice(-3)).toEqual([
      '<time>2026-09-25T14:05:00.000Z</time>',
      '<time>2026-09-25T14:06:00.000Z</time>',
      '<time>2026-09-25T15:04:00.000Z</time>'
    ]);
  });
});
