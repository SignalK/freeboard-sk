/** Recorded-track source selection and the v2 Track API request helpers.
 *
 * Signal K server 2.33 ships the Track Query API (`/signalk/v2/api/tracks`).
 * Older servers, or servers whose track plugin predates it, only answer the
 * unspecified v1 routes (`/signalk/v1/api/self/track`, `/signalk/v1/api/tracks`)
 * that Freeboard has used historically. These helpers decide which one to use
 * and build / parse the v2 requests. They are pure (no worker state) so they can
 * be unit tested directly.
 *
 * The v1 path is frozen: kept working until it is removed, but every new track
 * behaviour is v2-only (#820).
 */

import { Position } from 'src/app/types';
import { Extent } from 'src/app/lib/geoutils';

/** User setting: where the own-vessel trail comes from. */
export type TrailSource = 'auto' | 'server' | 'local';

/** What the connected server can supply, as detected at (re)connect. */
export interface TrackSource {
  /** Interface Freeboard fetches recorded tracks from. */
  api: 'v2' | 'v1' | 'none';
  /** `/signalk/v2/features` lists the `tracks` API (server >= 2.33). */
  serverHasTracksApi: boolean;
  /** v2 provider to query (the one marked `isDefault`). */
  provider?: string;
  /** v1 `/self/track` answers (own-vessel trail). */
  v1SelfTrack: boolean;
  /** v1 `/tracks` answers (AIS tracks). */
  v1AisTracks: boolean;
}

export const NO_TRACK_SOURCE: TrackSource = {
  api: 'none',
  serverHasTracksApi: false,
  v1SelfTrack: false,
  v1AisTracks: false
};

/** Time window for "Show Track" (every AIS target in view); a multi-context
 * query needs one. Two hours, as the tracks plugin kept before the Track API. */
export const AIS_TRACK_WINDOW = 'PT2H';
/** Points per AIS track under "Show Track", so a busy harbour stays bounded. */
export const AIS_TRACK_MAX_POINTS = 120;
/** Below this zoom "Show Track" draws and fetches nothing: the low-zoom view of
 * every target is the expensive one (#706). Vessels picked one by one are not
 * gated, since the user asked for each of them. */
export const AIS_TRACK_MIN_ZOOM = 10;
/** Points per track of a vessel picked with the per-vessel TRACK toggle: few
 * vessels, over a window of hours (`vessels.aisTrackLength`). */
export const AIS_PICK_MAX_POINTS = 1000;
/** Default hours of track for a picked vessel (`vessels.aisTrackLength`). */
export const AIS_PICK_DEFAULT_HOURS = 12;

// ******** source selection ********

/** Whether the server can supply the own-vessel trail at all. */
export function serverTrailAvailable(source: TrackSource | null): boolean {
  return (
    !!source &&
    (source.api === 'v2' || (source.api === 'v1' && source.v1SelfTrack))
  );
}

/** Resolve the trail-source setting against what the server offers.
 * `auto` uses the server whenever it can supply a trail, else this device.
 * `server` is honoured as asked; if the server then fails to answer, the
 * trail falls back to the local one as it always has. */
export function resolveTrailSource(
  setting: TrailSource | undefined,
  source: TrackSource | null
): 'server' | 'local' {
  switch (setting) {
    case 'local':
      return 'local';
    case 'server':
      return 'server';
    default:
      return serverTrailAvailable(source) ? 'server' : 'local';
  }
}

/** Migrate the legacy boolean `trailFromServer` to the tri-state source.
 * `false` was the default and can't be told apart from a deliberate "off", and
 * was never a meaningful choice while server tracks needed a plugin most users
 * didn't have — so it becomes `auto`. */
export function migrateTrailSource(
  trailFromServer: boolean | undefined,
  trailSource: TrailSource | undefined
): TrailSource {
  if (
    trailSource === 'auto' ||
    trailSource === 'server' ||
    trailSource === 'local'
  ) {
    return trailSource;
  }
  return trailFromServer === true ? 'server' : 'auto';
}

// ******** detection ********

/** Minimal fetch result used by detection (a `Response` satisfies it). */
export interface ProbeResponse {
  ok: boolean;
  json(): Promise<unknown>;
}

export interface TrackSourceUrls {
  features: string; // /signalk/v2/features
  providers: string; // /signalk/v2/api/tracks/_providers
  v1SelfTrack: string; // /signalk/v1/api/self/track?timespan=1h
  v1Tracks: string; // /signalk/v1/api/tracks
}

/** Build the detection URLs from the worker's v1 api url
 * (e.g. `http://host:3000/signalk/v1/api`). */
export function trackSourceUrls(v1ApiUrl: string): TrackSourceUrls {
  const root = v1ApiUrl.replace(/\/v1\/api\/?$/, '');
  return {
    features: `${root}/v2/features`,
    providers: `${root}/v2/api/tracks/_providers`,
    v1SelfTrack: `${v1ApiUrl}/self/track?timespan=1h`,
    v1Tracks: `${v1ApiUrl}/tracks`
  };
}

/** The v2 tracks endpoint for a given v1 api url. */
export function tracksApiUrl(v1ApiUrl: string): string {
  return `${v1ApiUrl.replace(/\/v1\/api\/?$/, '')}/v2/api/tracks`;
}

const probeOk = async (
  get: (url: string) => Promise<ProbeResponse>,
  url: string
): Promise<boolean> => {
  try {
    return (await get(url)).ok;
  } catch {
    return false;
  }
};

const probeJson = async (
  get: (url: string) => Promise<ProbeResponse>,
  url: string
): Promise<unknown> => {
  try {
    const r = await get(url);
    return r.ok ? await r.json() : undefined;
  } catch {
    return undefined;
  }
};

/** Pick the provider to query: the one flagged `isDefault`, else the first. */
export function defaultProvider(providers: unknown): string | undefined {
  if (!providers || typeof providers !== 'object') {
    return undefined;
  }
  const entries = Object.entries(
    providers as Record<string, { isDefault?: boolean }>
  );
  if (entries.length === 0) {
    return undefined;
  }
  return (entries.find(([, p]) => p?.isDefault) ?? entries[0])[0];
}

/** Detect where recorded tracks come from.
 *
 * v2 is asked about FIRST, because tracks-plugin v3 also answers on the v1
 * routes. The v2 route is mounted on 2.33+ even with no provider installed (it
 * then answers 501), so a registered provider is what makes v2 usable, not the
 * features listing alone. v1 is only probed when v2 is not available. */
export async function detectTrackSource(
  get: (url: string) => Promise<ProbeResponse>,
  urls: TrackSourceUrls
): Promise<TrackSource> {
  const features = (await probeJson(get, urls.features)) as
    { apis?: string[] } | undefined;
  const serverHasTracksApi =
    Array.isArray(features?.apis) && features.apis.includes('tracks');

  if (serverHasTracksApi) {
    const provider = defaultProvider(await probeJson(get, urls.providers));
    if (provider) {
      return {
        api: 'v2',
        serverHasTracksApi,
        provider,
        v1SelfTrack: false,
        v1AisTracks: false
      };
    }
  }

  const [v1SelfTrack, v1AisTracks] = await Promise.all([
    probeOk(get, urls.v1SelfTrack),
    probeOk(get, urls.v1Tracks)
  ]);
  return {
    api: v1SelfTrack || v1AisTracks ? 'v1' : 'none',
    serverHasTracksApi,
    v1SelfTrack,
    v1AisTracks
  };
}

/** Text of the notice shown while tracks come from the v1 fallback. Names the
 * requirement (a Track API v2 provider), never a particular plugin. */
export function trackApiNoticeMessage(source: TrackSource): string {
  const action = source.serverHasTracksApi
    ? 'update to a Track API (v2) provider'
    : 'upgrade to Signal K server 2.33 or later with a Track API (v2) provider';
  return (
    'Vessel tracks are being fetched from an older Signal K server interface.\n' +
    'Support for it will be removed in a future Freeboard release.\n' +
    `To keep server tracks working, ${action}.`
  );
}

// ******** own-vessel trail request ********

/** Convert a stored resolution (`'5s'`, `'1m'`, `'2h'`) to an ISO 8601
 * duration (`PT5S`, `PT1M`, `PT2H`). A value already in ISO form passes
 * through; anything unrecognised returns undefined (the parameter is omitted). */
export function resolutionToIso(res: string | undefined): string | undefined {
  if (typeof res !== 'string') {
    return undefined;
  }
  const s = res.trim();
  if (/^P/i.test(s)) {
    return s.toUpperCase();
  }
  const m = /^(\d+)\s*([smh])$/i.exec(s);
  return m ? `PT${Number(m[1])}${m[2].toUpperCase()}` : undefined;
}

export interface TrailBand {
  from: string; // ISO 8601 instant
  to?: string; // ISO 8601 instant; absent leaves the band open to the server's now
  resolution?: string; // ISO 8601 duration
}

const HOUR = 3600000;

/** Split the trail window into the same bands as the v1 request (beyond 24 h /
 * 1 → 24 h / last hour), oldest first. Adjacent bands share their boundary
 * instant, so they tile the window with no gap or overlap. The LAST band is
 * always the last hour, and has no `to`: the server closes it at its own now,
 * where the device's clock, if behind, would cut off the newest points. */
export function trailBands(
  durationHrs: number,
  resolution: { lastHour: string; next23: string; beyond24: string },
  now: number
): TrailBand[] {
  const iso = (t: number) => new Date(t).toISOString();
  const bands: TrailBand[] = [];
  if (durationHrs > 24) {
    bands.push({
      from: iso(now - durationHrs * HOUR),
      to: iso(now - 24 * HOUR),
      resolution: resolutionToIso(resolution.beyond24)
    });
    bands.push({
      from: iso(now - 24 * HOUR),
      to: iso(now - HOUR),
      resolution: resolutionToIso(resolution.next23)
    });
  } else if (durationHrs > 1) {
    bands.push({
      from: iso(now - durationHrs * HOUR),
      to: iso(now - HOUR),
      resolution: resolutionToIso(resolution.next23)
    });
  }
  bands.push({
    from: iso(now - HOUR),
    resolution: resolutionToIso(resolution.lastHour)
  });
  return bands;
}

/** Build a query string, skipping undefined values. */
export function queryString(
  params: Record<string, string | number | undefined>
): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
}

/** URL for one own-vessel trail band. No `bbox`: the own vessel is a single
 * context, and a bbox would only hide the trail when the map is panned away.
 * `times` carries each point's recording time, which a tap on the trail is
 * answered from. */
export function trailBandUrl(
  tracksUrl: string,
  band: TrailBand,
  provider?: string
): string {
  return `${tracksUrl}?${queryString({
    context: 'self',
    from: band.from,
    to: band.to,
    resolution: band.resolution,
    times: 'true',
    provider
  })}`;
}

// ******** response parsing ********

interface TrackFeatureLike {
  geometry?: { type?: string; coordinates?: Position[][] };
  properties?: { context?: string; isSelf?: boolean; providerId?: string };
}

const featuresOf = (fc: unknown): TrackFeatureLike[] => {
  const f = (fc as { features?: unknown })?.features;
  return Array.isArray(f) ? (f as TrackFeatureLike[]) : [];
};

const linesOf = (f: TrackFeatureLike): Position[][] | undefined =>
  f.geometry?.type === 'MultiLineString' &&
  Array.isArray(f.geometry.coordinates)
    ? f.geometry.coordinates
    : undefined;

/** Own-vessel trail lines from a v2 response. The response has one feature per
 * context per provider; if more than one provider answered, only the first
 * provider's feature is used so the trail is not drawn twice. */
export function parseSelfTrail(fc: unknown): Position[][] | undefined {
  const self = featuresOf(fc).filter((f) => f.properties?.isSelf && linesOf(f));
  if (self.length === 0) {
    return undefined;
  }
  const provider = self[0].properties?.providerId;
  return self
    .filter((f) => f.properties?.providerId === provider)
    .flatMap((f) => linesOf(f));
}

/** AIS tracks from a v2 response, keyed by context (`vessels.urn:mrn:…`).
 * The own vessel is dropped. When a context appears more than once (several
 * providers), the preferred provider's track wins, else the first seen. */
export function parseAisTracks(
  fc: unknown,
  preferredProvider?: string
): Map<string, Position[][]> {
  const result = new Map<string, Position[][]>();
  const winner = new Map<string, string | undefined>();
  featuresOf(fc).forEach((f) => {
    const ctx = f.properties?.context;
    const lines = linesOf(f);
    if (!ctx || f.properties?.isSelf || !lines) {
      return;
    }
    const pid = f.properties?.providerId;
    if (
      !result.has(ctx) ||
      (pid === preferredProvider && winner.get(ctx) !== preferredProvider)
    ) {
      result.set(ctx, lines);
      winner.set(ctx, pid);
    }
  });
  return result;
}

// ******** viewport ********

/** Shift a longitude into [-180, 180]. */
export function wrapLongitude(lon: number): number {
  const w = ((((lon + 180) % 360) + 360) % 360) - 180;
  return w === -180 && lon > 0 ? 180 : w;
}

/** The `bbox` (w,s,e,n) for a map viewport, optionally intersected with the
 * AIS max-radius box around own position.
 *
 * The map extent is in unwrapped longitude (a view panned across the
 * antimeridian can run past ±180). The result is normalised to [-180, 180];
 * a box crossing the antimeridian comes out with west > east, which the Track
 * API accepts. Returns null when the two boxes don't intersect (nothing to
 * fetch). */
export function viewportBbox(
  extent: Extent | number[] | undefined,
  radiusBox?: Extent | number[]
): [number, number, number, number] | null {
  if (!Array.isArray(extent) || extent.length !== 4) {
    return null;
  }
  let [w, s, e, n] = extent as [number, number, number, number];
  if (![w, s, e, n].every(Number.isFinite) || e < w) {
    return null;
  }
  if (Array.isArray(radiusBox) && radiusBox.length === 4) {
    const [rw, rs, re, rn] = radiusBox as [number, number, number, number];
    // move the radius box into the viewport's world copy before intersecting
    const shift = Math.round(((w + e) / 2 - (rw + re) / 2) / 360) * 360;
    w = Math.max(w, rw + shift);
    e = Math.min(e, re + shift);
    s = Math.max(s, rs);
    n = Math.min(n, rn);
    if (w >= e || s >= n) {
      return null;
    }
  }
  const r = (v: number) => Math.round(v * 1e6) / 1e6;
  s = r(Math.max(-90, s));
  n = r(Math.min(90, n));
  if (e - w >= 360) {
    return [-180, s, 180, n];
  }
  return [r(wrapLongitude(w)), s, r(wrapLongitude(e)), n];
}

// ******** AIS tracks request ********

export interface AisTracksRequest {
  view: { extent: Extent | number[]; zoom: number } | null;
  /** "Show Track" (all AIS tracks) is on. */
  showAll: boolean;
  /** Contexts picked with the per-vessel TRACK toggle. */
  picks: string[];
  /** Contexts currently held as AIS targets (hidden / purged ones are not). */
  targets: { has(context: string): boolean };
  /** AIS max-radius box around own position, when a max radius is set. */
  radiusBox?: Extent | number[];
  /** Hours of track for a picked vessel. */
  pickHours?: number;
  provider?: string;
}

/** Query string for the AIS tracks request, or null when there is nothing to
 * fetch. "Show Track" on: every track in the viewport (∩ the max-radius box),
 * over a short window and not below the zoom at which the layer draws them
 * (the low-zoom viewport query is the expensive one). Off: only the picked
 * vessels, by context — cheaper and exact, at any zoom, over `pickHours`.
 * Recording times come back too, so a tapped track can say when the vessel
 * was there. */
export function aisTracksQuery(req: AisTracksRequest): string | null {
  if (req.showAll) {
    if (!req.view || !(req.view.zoom >= AIS_TRACK_MIN_ZOOM)) {
      return null;
    }
    const bbox = viewportBbox(req.view.extent, req.radiusBox);
    if (!bbox) {
      return null;
    }
    return queryString({
      bbox: bbox.join(','),
      duration: AIS_TRACK_WINDOW,
      maxPoints: AIS_TRACK_MAX_POINTS,
      times: 'true',
      provider: req.provider
    });
  }
  const picks = req.picks.filter((id) => req.targets.has(id));
  if (picks.length === 0) {
    return null;
  }
  const hours =
    Number.isFinite(req.pickHours) && req.pickHours > 0
      ? req.pickHours
      : AIS_PICK_DEFAULT_HOURS;
  return queryString({
    contexts: picks.join(','),
    duration: `PT${hours}H`,
    maxPoints: AIS_PICK_MAX_POINTS,
    times: 'true',
    provider: req.provider
  });
}

/** Share of the viewport's width / height added on each side of the AIS
 * tracks box, so small pans and a heading-up map's rotations stay inside it. */
export const AIS_TRACK_BBOX_PAD = 0.5;

/** Grow an extent by `factor` of its width / height on each side. */
export function padExtent(
  extent: Extent | number[],
  factor: number
): [number, number, number, number] {
  const [w, s, e, n] = extent;
  const dx = (e - w) * factor;
  const dy = (n - s) * factor;
  return [w - dx, s - dy, e + dx, n + dy];
}

/** Whether a move-end needs a new AIS tracks request. `moveend` fires for any
 * view change — including a heading-up map re-rotating on every heading
 * update and a followed vessel panning the map — so a request is only made
 * when the zoom level changes or the view leaves the (padded) box last
 * fetched. The periodic poll keeps the tracks themselves fresh. */
export function needsAisRefetch(
  last: { extent: number[]; zoom: number } | null,
  view: { extent: Extent | number[]; zoom: number }
): boolean {
  if (!last) {
    return true;
  }
  if (Math.floor(last.zoom) !== Math.floor(view.zoom)) {
    return true;
  }
  const [w, s, e, n] = view.extent;
  const [lw, ls, le, ln] = last.extent;
  return w < lw || s < ls || e > le || n > ln;
}

/** Latest-request-wins gate for overlapping async requests. `begin()` returns
 * a token for a new request and supersedes every earlier one; `invalidate()`
 * supersedes them all (e.g. on a new stream). Apply a response only while
 * `isCurrent(token)`. */
export function createRequestGate() {
  let generation = 0;
  return {
    begin: (): number => ++generation,
    invalidate: (): void => {
      generation++;
    },
    isCurrent: (token: number): boolean => token === generation
  };
}
