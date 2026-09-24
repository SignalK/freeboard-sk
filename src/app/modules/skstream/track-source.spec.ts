import { describe, expect, it } from 'vitest';
import {
  aisTracksQuery,
  createRequestGate,
  detectTrackSource,
  migrateTrailSource,
  needsAisRefetch,
  padExtent,
  parseAisTracks,
  parseSelfTrail,
  ProbeResponse,
  resolutionToIso,
  resolveTrailSource,
  serverTrailAvailable,
  trackApiNoticeMessage,
  TrackSource,
  trackSourceUrls,
  trailBands,
  trailBandUrl,
  tracksApiUrl,
  viewportBbox
} from './track-source';

describe('track-source resolutionToIso', () => {
  it('converts the stored resolution values to ISO 8601 durations', () => {
    expect(resolutionToIso('1s')).toBe('PT1S');
    expect(resolutionToIso('5s')).toBe('PT5S');
    expect(resolutionToIso('30s')).toBe('PT30S');
    expect(resolutionToIso('1m')).toBe('PT1M');
    expect(resolutionToIso('15m')).toBe('PT15M');
    expect(resolutionToIso('2h')).toBe('PT2H');
  });

  it('passes an ISO duration through and omits anything unrecognised', () => {
    expect(resolutionToIso('PT10S')).toBe('PT10S');
    expect(resolutionToIso('fast')).toBeUndefined();
    expect(resolutionToIso(undefined)).toBeUndefined();
  });
});

describe('track-source trailBands', () => {
  const res = { lastHour: '5s', next23: '1m', beyond24: '5m' };
  const now = Date.UTC(2026, 8, 24, 12, 0, 0);
  const hoursAgo = (h: number) => new Date(now - h * 3600000).toISOString();

  it('tiles a window longer than 24 h into three contiguous bands', () => {
    const bands = trailBands(48, res, now);
    expect(bands).toEqual([
      { from: hoursAgo(48), to: hoursAgo(24), resolution: 'PT5M' },
      { from: hoursAgo(24), to: hoursAgo(1), resolution: 'PT1M' },
      { from: hoursAgo(1), to: hoursAgo(0), resolution: 'PT5S' }
    ]);
  });

  it('uses two bands for a window between 1 h and 24 h', () => {
    const bands = trailBands(24, res, now);
    expect(bands.map((b) => [b.from, b.to])).toEqual([
      [hoursAgo(24), hoursAgo(1)],
      [hoursAgo(1), hoursAgo(0)]
    ]);
  });

  it('uses only the last-hour band for a 1 h window', () => {
    expect(trailBands(1, res, now)).toEqual([
      { from: hoursAgo(1), to: hoursAgo(0), resolution: 'PT5S' }
    ]);
  });

  it('leaves no gap or overlap between bands, and covers the whole window', () => {
    [2, 12, 25, 96].forEach((d) => {
      const bands = trailBands(d, res, now);
      expect(bands[0].from).toBe(hoursAgo(d));
      expect(bands[bands.length - 1].to).toBe(hoursAgo(0));
      for (let i = 1; i < bands.length; i++) {
        expect(bands[i].from).toBe(bands[i - 1].to);
      }
    });
  });

  it('builds a self-context band url with the provider and no bbox', () => {
    const url = trailBandUrl(
      'http://h/signalk/v2/api/tracks',
      {
        from: '2026-09-24T11:00:00.000Z',
        to: '2026-09-24T12:00:00.000Z',
        resolution: 'PT5S'
      },
      'tracks'
    );
    expect(url).toBe(
      'http://h/signalk/v2/api/tracks?context=self' +
        '&from=2026-09-24T11%3A00%3A00.000Z&to=2026-09-24T12%3A00%3A00.000Z' +
        '&resolution=PT5S&times=true&provider=tracks'
    );
    expect(url).not.toContain('bbox');
  });
});

describe('track-source viewportBbox', () => {
  it('passes a plain viewport through', () => {
    expect(viewportBbox([-81, 24, -80, 25])).toEqual([-81, 24, -80, 25]);
  });

  it('normalises an unwrapped viewport into [-180, 180]', () => {
    expect(viewportBbox([279, 24, 280, 25])).toEqual([-81, 24, -80, 25]);
  });

  it('keeps an antimeridian-crossing viewport as west > east', () => {
    expect(viewportBbox([175, -20, 185, -10])).toEqual([175, -20, -175, -10]);
    expect(viewportBbox([-185, -20, -175, -10])).toEqual([175, -20, -175, -10]);
  });

  it('covers the whole world when the viewport is wider than 360°', () => {
    expect(viewportBbox([-300, -60, 300, 60])).toEqual([-180, -60, 180, 60]);
  });

  it('clamps latitude', () => {
    expect(viewportBbox([0, -95, 10, 95])).toEqual([0, -90, 10, 90]);
  });

  it('intersects with the AIS max-radius box', () => {
    expect(viewportBbox([-82, 24, -79, 26], [-80.5, 24.5, -80, 25])).toEqual([
      -80.5, 24.5, -80, 25
    ]);
  });

  it('intersects in the viewport world copy', () => {
    // viewport panned one world east; radius box in canonical space
    expect(viewportBbox([278, 24, 281, 26], [-80.5, 24.5, -80, 25])).toEqual([
      -80.5, 24.5, -80, 25
    ]);
  });

  it('returns null when the viewport and radius box do not meet', () => {
    expect(viewportBbox([0, 0, 1, 1], [10, 10, 11, 11])).toBeNull();
  });

  it('returns null without a usable extent', () => {
    expect(viewportBbox([])).toBeNull();
    expect(viewportBbox(undefined)).toBeNull();
  });
});

describe('track-source trail source setting', () => {
  const v2: TrackSource = {
    api: 'v2',
    serverHasTracksApi: true,
    provider: 'tracks',
    v1SelfTrack: false,
    v1AisTracks: false
  };
  const v1AisOnly: TrackSource = {
    api: 'v1',
    serverHasTracksApi: false,
    v1SelfTrack: false,
    v1AisTracks: true
  };
  const none: TrackSource = {
    api: 'none',
    serverHasTracksApi: true,
    v1SelfTrack: false,
    v1AisTracks: false
  };

  it('migrates the legacy boolean: true → server, false → auto', () => {
    expect(migrateTrailSource(true, undefined)).toBe('server');
    expect(migrateTrailSource(false, undefined)).toBe('auto');
    expect(migrateTrailSource(undefined, undefined)).toBe('auto');
  });

  it('keeps an already-migrated value', () => {
    expect(migrateTrailSource(true, 'local')).toBe('local');
    expect(migrateTrailSource(false, 'server')).toBe('server');
  });

  it('auto resolves to the server only when it can supply a trail', () => {
    expect(resolveTrailSource('auto', v2)).toBe('server');
    expect(resolveTrailSource('auto', v1AisOnly)).toBe('local');
    expect(resolveTrailSource('auto', none)).toBe('local');
    expect(resolveTrailSource('auto', null)).toBe('local');
  });

  it('server and local are honoured whatever the server offers', () => {
    expect(resolveTrailSource('server', none)).toBe('server');
    expect(resolveTrailSource('local', v2)).toBe('local');
  });

  it('reports whether a server trail is available', () => {
    expect(serverTrailAvailable(v2)).toBe(true);
    expect(serverTrailAvailable({ ...v1AisOnly, v1SelfTrack: true })).toBe(
      true
    );
    expect(serverTrailAvailable(v1AisOnly)).toBe(false);
    expect(serverTrailAvailable(none)).toBe(false);
  });
});

describe('track-source detectTrackSource', () => {
  const urls = trackSourceUrls('http://h:3000/signalk/v1/api');

  /** A server described by which urls answer 2xx, and with what. */
  const server =
    (routes: Record<string, unknown>) =>
    (url: string): Promise<ProbeResponse> => {
      const hit = Object.keys(routes).find((k) => url === k);
      return Promise.resolve({
        ok: hit !== undefined,
        json: () => Promise.resolve(hit ? routes[hit] : { error: 'x' })
      });
    };

  const features = (apis: string[]) => ({ apis, plugins: [] });

  it('builds the probe urls from the v1 api url', () => {
    expect(urls).toEqual({
      features: 'http://h:3000/signalk/v2/features',
      providers: 'http://h:3000/signalk/v2/api/tracks/_providers',
      v1SelfTrack: 'http://h:3000/signalk/v1/api/self/track?timespan=1h',
      v1Tracks: 'http://h:3000/signalk/v1/api/tracks'
    });
    expect(tracksApiUrl('http://h:3000/signalk/v1/api')).toBe(
      'http://h:3000/signalk/v2/api/tracks'
    );
  });

  it('row 1: server >= 2.33 with a v2 provider uses v2 and the default provider', async () => {
    const s = await detectTrackSource(
      server({
        [urls.features]: features(['tracks']),
        [urls.providers]: {
          parquet: { isDefault: false },
          tracks: { isDefault: true }
        },
        // tracks-plugin v3 also answers the v1 routes — must not matter
        [urls.v1SelfTrack]: {},
        [urls.v1Tracks]: {}
      }),
      urls
    );
    expect(s).toEqual({
      api: 'v2',
      serverHasTracksApi: true,
      provider: 'tracks',
      v1SelfTrack: false,
      v1AisTracks: false
    });
  });

  it('row 2: server >= 2.33 with only a v1 plugin falls back to v1', async () => {
    const s = await detectTrackSource(
      server({
        [urls.features]: features(['tracks']),
        [urls.providers]: {}, // mounted, but nothing registered
        [urls.v1SelfTrack]: {},
        [urls.v1Tracks]: {}
      }),
      urls
    );
    expect(s).toEqual({
      api: 'v1',
      serverHasTracksApi: true,
      v1SelfTrack: true,
      v1AisTracks: true
    });
  });

  it('row 2: signalk-to-influxdb supplies only the own trail over v1', async () => {
    const s = await detectTrackSource(
      server({
        [urls.features]: features(['tracks']),
        [urls.providers]: {},
        [urls.v1SelfTrack]: {}
      }),
      urls
    );
    expect(s.api).toBe('v1');
    expect(s.v1SelfTrack).toBe(true);
    expect(s.v1AisTracks).toBe(false);
  });

  it('rows 3–4: server < 2.33 with a track plugin uses v1', async () => {
    const s = await detectTrackSource(
      server({
        [urls.features]: features(['weather']),
        [urls.v1SelfTrack]: {},
        [urls.v1Tracks]: {}
      }),
      urls
    );
    expect(s).toEqual({
      api: 'v1',
      serverHasTracksApi: false,
      v1SelfTrack: true,
      v1AisTracks: true
    });
  });

  it('row 5: nothing answers → none, and v2 is not asked for providers', async () => {
    const asked: string[] = [];
    const get = server({ [urls.features]: features([]) });
    const s = await detectTrackSource((u) => {
      asked.push(u);
      return get(u);
    }, urls);
    expect(s.api).toBe('none');
    expect(asked).not.toContain(urls.providers);
  });

  it('row 5 on 2.33+: the route answers 501 with no provider → none', async () => {
    const s = await detectTrackSource(
      server({ [urls.features]: features(['tracks']) }),
      urls
    );
    expect(s).toEqual({
      api: 'none',
      serverHasTracksApi: true,
      v1SelfTrack: false,
      v1AisTracks: false
    });
  });

  it('treats a network error as "not available"', async () => {
    const s = await detectTrackSource(
      () => Promise.reject(new Error('offline')),
      urls
    );
    expect(s.api).toBe('none');
  });
});

describe('track-source notice wording', () => {
  const base = { api: 'v1' as const, v1SelfTrack: true, v1AisTracks: true };

  it('row 2 asks for a v2 provider only', () => {
    const msg = trackApiNoticeMessage({ ...base, serverHasTracksApi: true });
    expect(msg).toContain('update to a Track API (v2) provider');
    expect(msg).not.toContain('2.33');
  });

  it('rows 3–4 ask for a server upgrade', () => {
    const msg = trackApiNoticeMessage({ ...base, serverHasTracksApi: false });
    expect(msg).toContain('Signal K server 2.33 or later');
  });

  it('names the requirement, never a plugin', () => {
    const msg = trackApiNoticeMessage({ ...base, serverHasTracksApi: true });
    expect(msg.toLowerCase()).not.toContain('plugin');
  });
});

describe('track-source response parsing', () => {
  const feature = (
    context: string,
    isSelf: boolean,
    providerId: string,
    coordinates: number[][][]
  ) => ({
    type: 'Feature',
    geometry: { type: 'MultiLineString', coordinates },
    properties: { context, isSelf, providerId, from: '', to: '', pointCount: 0 }
  });

  const selfA = feature('vessels.urn:mrn:imo:mmsi:1', true, 'a', [
    [
      [1, 1],
      [2, 2]
    ]
  ]);
  const selfB = feature('vessels.urn:mrn:imo:mmsi:1', true, 'b', [
    [
      [9, 9],
      [8, 8]
    ]
  ]);
  const aisA = feature('vessels.urn:mrn:imo:mmsi:2', false, 'a', [
    [
      [3, 3],
      [4, 4]
    ]
  ]);
  const aisB = feature('vessels.urn:mrn:imo:mmsi:2', false, 'b', [
    [
      [5, 5],
      [6, 6]
    ]
  ]);

  it('returns the own-vessel lines', () => {
    expect(
      parseSelfTrail({ type: 'FeatureCollection', features: [aisA, selfA] })
    ).toEqual([
      [
        [1, 1],
        [2, 2]
      ]
    ]);
  });

  it('draws the own trail once when two providers answer', () => {
    expect(
      parseSelfTrail({ type: 'FeatureCollection', features: [selfA, selfB] })
    ).toEqual(selfA.geometry.coordinates);
  });

  it('returns undefined with no own-vessel feature or a malformed body', () => {
    expect(parseSelfTrail({ type: 'FeatureCollection', features: [] })).toBe(
      undefined
    );
    expect(parseSelfTrail({ error: 'x' })).toBeUndefined();
  });

  it('drops the own vessel from AIS tracks and keys by context', () => {
    const m = parseAisTracks({
      type: 'FeatureCollection',
      features: [selfA, aisA]
    });
    expect([...m.keys()]).toEqual(['vessels.urn:mrn:imo:mmsi:2']);
    expect(m.get('vessels.urn:mrn:imo:mmsi:2')).toEqual(
      aisA.geometry.coordinates
    );
  });

  it('keeps one AIS track per context when providers duplicate it', () => {
    const fc = { type: 'FeatureCollection', features: [aisA, aisB] };
    expect(parseAisTracks(fc).get('vessels.urn:mrn:imo:mmsi:2')).toEqual(
      aisA.geometry.coordinates
    );
    expect(parseAisTracks(fc, 'b').get('vessels.urn:mrn:imo:mmsi:2')).toEqual(
      aisB.geometry.coordinates
    );
  });
});

describe('track-source aisTracksQuery', () => {
  const targets = new Set(['vessels.a', 'vessels.b']);
  const view = { extent: [-81, 24, -80, 25], zoom: 12 };
  const params = (q: string | null) =>
    Object.fromEntries(new URLSearchParams(q ?? ''));

  it('Show Track on: fetches by viewport bbox, windowed and bounded', () => {
    expect(
      params(
        aisTracksQuery({
          view,
          showAll: true,
          picks: [],
          targets,
          provider: 'tracks'
        })
      )
    ).toEqual({
      bbox: '-81,24,-80,25',
      duration: 'PT2H',
      maxPoints: '120',
      times: 'true',
      provider: 'tracks'
    });
  });

  it('intersects the viewport with the max-radius box', () => {
    const q = aisTracksQuery({
      view,
      showAll: true,
      picks: [],
      targets,
      radiusBox: [-80.5, 24.5, -80, 25]
    });
    expect(params(q).bbox).toBe('-80.5,24.5,-80,25');
  });

  it('Show Track off: fetches only the picked vessels still held as targets', () => {
    const q = aisTracksQuery({
      view,
      showAll: false,
      picks: ['vessels.a', 'vessels.gone'],
      targets
    });
    expect(params(q).contexts).toBe('vessels.a');
    expect(params(q).bbox).toBeUndefined();
    expect(params(q).duration).toBe('PT12H');
    expect(params(q).maxPoints).toBe('1000');
    expect(params(q).times).toBe('true');
  });

  it('fetches picked vessels over the picked-track length, at any zoom', () => {
    const q = aisTracksQuery({
      view: { ...view, zoom: 5 },
      showAll: false,
      picks: ['vessels.a'],
      targets,
      pickHours: 6
    });
    expect(params(q).duration).toBe('PT6H');
    expect(
      aisTracksQuery({
        view: null,
        showAll: false,
        picks: ['vessels.a'],
        targets
      })
    ).not.toBeNull();
  });

  it('fetches nothing with Show Track off and nothing picked', () => {
    expect(
      aisTracksQuery({ view, showAll: false, picks: [], targets })
    ).toBeNull();
  });

  it('Show Track fetches nothing below the track layer minimum zoom', () => {
    expect(
      aisTracksQuery({
        view: { ...view, zoom: 9.9 },
        showAll: true,
        picks: [],
        targets
      })
    ).toBeNull();
    expect(
      aisTracksQuery({ view: null, showAll: true, picks: [], targets })
    ).toBeNull();
  });

  it('fetches nothing when the viewport is outside the max radius', () => {
    expect(
      aisTracksQuery({
        view,
        showAll: true,
        picks: [],
        targets,
        radiusBox: [10, 10, 11, 11]
      })
    ).toBeNull();
  });
});

describe('track-source AIS re-query on move-end', () => {
  const view = { extent: [-81, 24, -80, 25], zoom: 12 };
  const last = { extent: padExtent(view.extent, 0.5), zoom: 12 };

  it('pads the viewport by the given share on each side', () => {
    expect(padExtent([-81, 24, -80, 25], 0.5)).toEqual([
      -81.5, 23.5, -79.5, 25.5
    ]);
  });

  it('re-queries when nothing has been fetched yet', () => {
    expect(needsAisRefetch(null, view)).toBe(true);
  });

  it('does not re-query for a small pan or a rotation inside the fetched box', () => {
    expect(
      needsAisRefetch(last, { extent: [-80.8, 24.1, -79.8, 25.1], zoom: 12 })
    ).toBe(false);
    // a rotated view's bounding box grows, but stays inside the padding
    expect(
      needsAisRefetch(last, { extent: [-81.2, 23.8, -79.8, 25.2], zoom: 12.4 })
    ).toBe(false);
  });

  it('re-queries once the view leaves the fetched box', () => {
    expect(
      needsAisRefetch(last, { extent: [-80.2, 24, -79.2, 25], zoom: 12 })
    ).toBe(true);
  });

  it('re-queries when the zoom level changes', () => {
    expect(needsAisRefetch(last, { ...view, zoom: 11.9 })).toBe(true);
    expect(needsAisRefetch(last, { ...view, zoom: 13 })).toBe(true);
  });

  it('rounds bbox coordinates to 6 decimals', () => {
    expect(viewportBbox([-82.13, 24.25, -81.42000000000002, 24.74])).toEqual([
      -82.13, 24.25, -81.42, 24.74
    ]);
  });
});

describe('track-source createRequestGate', () => {
  it('lets only the latest request apply, whatever order responses arrive in', () => {
    const gate = createRequestGate();
    const older = gate.begin();
    const newer = gate.begin();
    expect(gate.isCurrent(newer)).toBe(true);
    expect(gate.isCurrent(older)).toBe(false); // late response is discarded
  });

  it('supersedes every in-flight request on invalidate', () => {
    const gate = createRequestGate();
    const inFlight = gate.begin();
    gate.invalidate(); // new stream
    expect(gate.isCurrent(inFlight)).toBe(false);
    expect(gate.isCurrent(gate.begin())).toBe(true);
  });
});
