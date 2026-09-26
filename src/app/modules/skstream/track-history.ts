/** Recorded track history (#821): request building and response parsing for
 * browsing the whole recorded track of the own vessel or an AIS vessel.
 *
 * The v2 Track API keeps the own vessel's track indefinitely (tracks-plugin v3
 * default) and other vessels' for 30 days. A single-context query may omit the
 * time window, which returns that vessel's whole history; a `bbox` then
 * *selects* passages touching the viewport (it never clips them). Detail is
 * set by an explicit `epsilon` of about one screen pixel's ground distance, so
 * zooming in refetches at finer detail. Providers don't size a tolerance to the
 * box themselves (SignalK/signalk-server#3081), and `simplify` alone derives
 * one from the whole track, far too coarse once zoomed in.
 *
 * Pure helpers (no Angular, no state) so they can be unit tested directly.
 * v2 only: the v1 routes have no equivalent.
 */

import { Position } from 'src/app/types';
import { queryString } from './track-source';

/** Most points per history track, at every zoom level: the budget cap on top
 * of the per-view `epsilon`. */
export const HISTORY_MAX_POINTS = 5000;

const EARTH_RADIUS = 6378137;

/** Web Mercator northing (metres) of a latitude, clamped to the projection. */
function mercatorY(lat: number): number {
  const c = Math.max(-85, Math.min(85, lat));
  return EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + (c * Math.PI) / 360));
}

/** Web Mercator ground resolution at zoom 0 on the equator, in metres per
 * pixel: the equator's length over one 256-pixel tile. */
const MERCATOR_RESOLUTION_Z0 = (2 * Math.PI * 6378137) / 256;

/** Start of time, for a window that is open at the start but bounded at the
 * end (a `to` alone is not a window the API accepts). */
export const HISTORY_EPOCH = '1970-01-01T00:00:00.000Z';

/** The selected time range, in ms. `null` leaves that end open: `from: null`
 * is the start of the recording, `to: null` is now. */
export interface HistoryRange {
  from: number | null;
  to: number | null;
}

export const HISTORY_ALL: HistoryRange = { from: null, to: null };

/** Quick range choices offered beside the bar. */
export type HistoryPreset = '7d' | '30d' | 'all';

const MINUTE = 60000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** The range a preset stands for, relative to `now`. */
export function presetRange(preset: HistoryPreset, now: number): HistoryRange {
  switch (preset) {
    case '7d':
      return { from: now - 7 * DAY, to: null };
    case '30d':
      return { from: now - 30 * DAY, to: null };
    default:
      return { ...HISTORY_ALL };
  }
}

/** The `from` / `to` query parameters for a range. With both ends open there is
 * no window at all, so the whole history is returned. */
export function rangeParams(range: HistoryRange): {
  from?: string;
  to?: string;
} {
  const iso = (t: number) => new Date(t).toISOString();
  const params: { from?: string; to?: string } = {};
  if (range.from !== null) {
    params.from = iso(range.from);
  }
  if (range.to !== null) {
    params.to = iso(range.to);
    params.from = params.from ?? HISTORY_EPOCH;
  }
  return params;
}

export interface HistoryRequest {
  /** `self`, or an AIS vessel's context (`vessels.urn:mrn:…`). */
  context: string;
  /** Viewport box `[w, s, e, n]`, as `viewportBbox()` returns it. */
  bbox: [number, number, number, number] | null;
  range: HistoryRange;
  /** Simplification tolerance in metres, as `historyEpsilon()` returns it. */
  epsilon?: number | null;
  provider?: string;
}

/** The simplification tolerance for a view: one screen pixel's ground distance
 * in metres at the view's centre latitude (Web Mercator shrinks a pixel by the
 * cosine of the latitude). Anything finer than a pixel cannot be seen, so this
 * drops only invisible detail.
 *
 * The pixel is taken at the deepest zoom of the current level, not the zoom
 * itself: history is refetched only when the level changes, so zooming in
 * within the level would otherwise stretch the tolerance to nearly two pixels.
 *
 * `extent` is the lon/lat `[w, s, e, n]` viewport; its centre latitude is the
 * Mercator midpoint of `s` and `n`, which is where the view is centred (the
 * plain average sits well south of it in a wide northern view). `null` when
 * the view gives no usable zoom or extent. */
export function historyEpsilon(
  zoom: number,
  extent: number[] | undefined
): number | null {
  if (!Number.isFinite(zoom) || !Array.isArray(extent) || extent.length !== 4) {
    return null;
  }
  const lat = mercatorMidLatitude(extent[1], extent[3]);
  if (!Number.isFinite(lat)) {
    return null;
  }
  const level = Math.floor(zoom) + 1;
  const metres =
    (MERCATOR_RESOLUTION_Z0 / Math.pow(2, level)) *
    Math.cos((lat * Math.PI) / 180);
  // three significant figures keep the query short; a tolerance that rounds
  // away to nothing is not one the API accepts
  const rounded = Number(metres.toPrecision(3));
  return rounded > 0 ? rounded : null;
}

/** The latitude halfway between `s` and `n` in Web Mercator, both clamped to
 * the projection's usable range. */
function mercatorMidLatitude(s: number, n: number): number {
  const mid = (mercatorY(s) + mercatorY(n)) / 2 / EARTH_RADIUS;
  return ((2 * Math.atan(Math.exp(mid)) - Math.PI / 2) * 180) / Math.PI;
}

/** Query string for one vessel's history in the viewport. `epsilon` sets the
 * detail for the view and `maxPoints` caps it, so zooming in refetches at
 * finer detail. `times` carries each point's recording time, which a tapped
 * segment's time span is read from. */
export function historyQuery(req: HistoryRequest): string {
  return queryString({
    context: req.context,
    ...rangeParams(req.range),
    bbox: req.bbox ? req.bbox.join(',') : undefined,
    epsilon: req.epsilon ?? undefined,
    maxPoints: HISTORY_MAX_POINTS,
    times: 'true',
    provider: req.provider
  });
}

/** Query string for a vessel's recorded span only: metadata, no geometry.
 * With a `range` it is the span and extent of what that range holds; without
 * one, of the whole record. */
export function historyMetaQuery(
  context: string,
  provider?: string,
  range: HistoryRange = HISTORY_ALL
): string {
  return queryString({
    context,
    ...rangeParams(range),
    geometry: 'false',
    provider
  });
}

/** Query string for `/tracks/contexts`: every context with any recorded track.
 * A listing across contexts needs a window, so it is opened at the epoch. */
export function historyContextsQuery(provider?: string): string {
  return queryString({ from: HISTORY_EPOCH, provider });
}

// ******** response parsing ********

/** One vessel's history as drawn on the map. `times[i][j]` is when
 * `lines[i][j]` was recorded; absent when the provider sent no times. */
export interface HistoryTrack {
  context: string;
  lines: Position[][];
  times?: string[][];
}

interface HistoryFeatureLike {
  geometry?: { type?: string; coordinates?: Position[][] } | null;
  properties?: {
    context?: string;
    providerId?: string;
    contextName?: string;
    from?: string;
    to?: string;
    bbox?: unknown;
    pointCount?: number;
    coordTimes?: string[][];
  };
}

const featuresOf = (fc: unknown): HistoryFeatureLike[] => {
  const f = (fc as { features?: unknown })?.features;
  return Array.isArray(f) ? (f as HistoryFeatureLike[]) : [];
};

/** The features of one provider: the preferred one when it answered, else the
 * first provider seen — so a track is never drawn twice. */
const oneProvider = (
  features: HistoryFeatureLike[],
  preferred?: string
): HistoryFeatureLike[] => {
  if (features.length === 0) {
    return [];
  }
  const pid = features.some((f) => f.properties?.providerId === preferred)
    ? preferred
    : features[0].properties?.providerId;
  return features.filter((f) => f.properties?.providerId === pid);
};

/** A single-context history response as a track, or undefined when it holds no
 * line. Recording times are kept only when they line up with the points. */
export function parseHistoryTrack(
  context: string,
  fc: unknown,
  preferredProvider?: string
): HistoryTrack | undefined {
  const lines: Position[][] = [];
  const times: string[][] = [];
  let timesAligned = true;
  oneProvider(featuresOf(fc), preferredProvider).forEach((f) => {
    const coords =
      f.geometry?.type === 'MultiLineString' &&
      Array.isArray(f.geometry.coordinates)
        ? f.geometry.coordinates
        : [];
    const ct = f.properties?.coordTimes;
    coords.forEach((line, i) => {
      if (!Array.isArray(line) || line.length === 0) {
        return;
      }
      lines.push(line);
      const t = Array.isArray(ct) ? ct[i] : undefined;
      if (Array.isArray(t) && t.length === line.length) {
        times.push(t);
      } else {
        timesAligned = false;
      }
    });
  });
  if (lines.length === 0) {
    return undefined;
  }
  return timesAligned ? { context, lines, times } : { context, lines };
}

/** The tracks of a multi-context response with their recording times, keyed
 * by context — one provider per context, as {@link parseHistoryTrack}. A
 * context whose times don't line up with its points is left out. */
export function parseTimedTracks(
  fc: unknown,
  preferredProvider?: string
): Map<string, { lines: Position[][]; times: string[][] }> {
  const byContext = new Map<string, HistoryFeatureLike[]>();
  featuresOf(fc).forEach((f) => {
    const ctx = f.properties?.context;
    if (ctx) {
      byContext.set(ctx, [...(byContext.get(ctx) ?? []), f]);
    }
  });
  const result = new Map<string, { lines: Position[][]; times: string[][] }>();
  byContext.forEach((features, ctx) => {
    const t = parseHistoryTrack(ctx, { features }, preferredProvider);
    if (t?.times) {
      result.set(ctx, { lines: t.lines, times: t.times });
    }
  });
  return result;
}

/** A vessel's recorded span from a `geometry=false` response. */
export interface HistorySpan {
  /** First and last recorded point, in ms. */
  from: number;
  to: number;
  /** The name the provider recorded (useful once the vessel has left AIS
   * range and the app no longer holds it). */
  name?: string;
  /** Where the recorded track lies, union-ed across the provider's features;
   * absent when the provider sent none. */
  bbox?: HistoryBbox;
}

/** A vessel's recorded span (ms), name and extent from a `geometry=false`
 * response. */
export function parseHistorySpan(
  fc: unknown,
  preferredProvider?: string
): HistorySpan | undefined {
  let from = Infinity;
  let to = -Infinity;
  let name: string | undefined;
  let bbox: HistoryBbox | undefined;
  oneProvider(featuresOf(fc), preferredProvider).forEach((f) => {
    const a = Date.parse(f.properties?.from ?? '');
    const b = Date.parse(f.properties?.to ?? '');
    if (Number.isFinite(a) && Number.isFinite(b)) {
      from = Math.min(from, a);
      to = Math.max(to, b);
    }
    name = name ?? f.properties?.contextName;
    const box = validBbox(f.properties?.bbox);
    if (box) {
      bbox = bbox ? unionBbox(bbox, box) : box;
    }
  });
  if (!Number.isFinite(from)) {
    return undefined;
  }
  return bbox ? { from, to, name, bbox } : { from, to, name };
}

// ******** extent: zooming to a recorded track ********

/** A box `[west, south, east, north]` in degrees. `west > east` crosses the
 * antimeridian and is read the short way round, as the Track API sends it:
 * `[175, -20, -175, -10]` is a box around Fiji, not a band round the world. */
export type HistoryBbox = [number, number, number, number];

/** A box as the Track API sent it, or undefined when it isn't one. */
export function validBbox(b: unknown): HistoryBbox | undefined {
  if (
    !Array.isArray(b) ||
    b.length !== 4 ||
    !b.every((v) => typeof v === 'number' && Number.isFinite(v))
  ) {
    return undefined;
  }
  const [w, s, e, n] = b as number[];
  const lonOk = (v: number) => v >= -180 && v <= 180;
  const latOk = (v: number) => v >= -90 && v <= 90;
  if (!lonOk(w) || !lonOk(e) || !latOk(s) || !latOk(n) || s > n) {
    return undefined;
  }
  return [w, s, e, n];
}

/** Degrees of longitude a box spans eastwards from its west edge, 0–360. */
function lonSpan(w: number, e: number): number {
  return e >= w ? e - w : e - w + 360;
}

/** `lon` wrapped into (-180, 180]. */
function wrapLon(lon: number): number {
  return lon > 180 ? lon - 360 : lon <= -180 ? lon + 360 : lon;
}

/** The smallest box holding both boxes. Longitudes are arcs on a circle, so
 * the union is the shorter of the two arcs that start at one box's west edge
 * and run east far enough to take in the other; it crosses the antimeridian
 * (`west > east`) when that is the short way round. */
export function unionBbox(a: HistoryBbox, b: HistoryBbox): HistoryBbox {
  const arc = (from: HistoryBbox, other: HistoryBbox) => {
    const offset = lonSpan(from[0], other[0]) % 360;
    return Math.max(
      lonSpan(from[0], from[2]),
      offset + lonSpan(other[0], other[2])
    );
  };
  const viaA = arc(a, b);
  const viaB = arc(b, a);
  const south = Math.min(a[1], b[1]);
  const north = Math.max(a[3], b[3]);
  const [west, span] = viaA <= viaB ? [a[0], viaA] : [b[0], viaB];
  if (span >= 360) {
    return [-180, south, 180, north];
  }
  const east = west + span > 180 ? west + span - 360 : west + span;
  return [west, south, east, north];
}

/** The union of several boxes; undefined when there are none. */
export function unionBboxes(boxes: HistoryBbox[]): HistoryBbox | undefined {
  return boxes.reduce<HistoryBbox | undefined>(
    (u, b) => (u ? unionBbox(u, b) : b),
    undefined
  );
}

/** Share of the map a fitted track fills, leaving a margin round its edge. */
const FIT_FILL = 0.85;

/** The map centre and zoom that fit a box into a map `size` pixels
 * (`[width, height]`) with a margin. The centre is the box's middle in Web
 * Mercator, taken the short way round when the box crosses the antimeridian,
 * so a track near Fiji is centred near 180° rather than on Greenwich. On a map
 * turned `rotation` radians (heading-up) the box is fitted as it lies on the
 * screen, turned with it. A box with no size (a single recorded point) gets
 * the maximum zoom. */
export function fitBbox(
  bbox: HistoryBbox,
  size: [number, number],
  zoomLimits: { min: number; max: number },
  rotation = 0
): { center: Position; zoom: number } {
  const [w, s, e, n] = bbox;
  const span = lonSpan(w, e);
  const center: Position = [wrapLon(w + span / 2), mercatorMidLatitude(s, n)];
  const width = ((span * Math.PI) / 180) * EARTH_RADIUS;
  const height = mercatorY(n) - mercatorY(s);
  const cos = Math.abs(Math.cos(rotation));
  const sin = Math.abs(Math.sin(rotation));
  const resolution = Math.max(
    (width * cos + height * sin) / Math.max(1, size[0] * FIT_FILL),
    (width * sin + height * cos) / Math.max(1, size[1] * FIT_FILL)
  );
  const zoom =
    resolution > 0
      ? Math.log2(MERCATOR_RESOLUTION_Z0 / resolution)
      : zoomLimits.max;
  return {
    center,
    zoom: Math.min(zoomLimits.max, Math.max(zoomLimits.min, zoom))
  };
}

/** Whether a box reaches into a map view: `view` is the lon/lat
 * `[w, s, e, n]` viewport, whose longitudes run past ±180 when the map shows
 * another world copy. The box is tried in the world copies either side too,
 * so a track just across the antimeridian from the view still counts. */
export function bboxInView(
  bbox: HistoryBbox,
  view: number[] | null | undefined
): boolean {
  if (!Array.isArray(view) || view.length !== 4) {
    return false;
  }
  const [vw, vs, ve, vn] = view;
  const [w, s, , n] = bbox;
  if (s > vn || n < vs) {
    return false;
  }
  if (ve - vw >= 360) {
    return true;
  }
  const east = w + lonSpan(w, bbox[2]);
  const shift = Math.round((vw + ve - w - east) / 2 / 360) * 360;
  return [-360, 0, 360].some(
    (k) => w + shift + k <= ve && east + shift + k >= vw
  );
}

/** The contexts listed by `/tracks/contexts`. */
export function parseHistoryContexts(result: unknown): Set<string> {
  return new Set(
    Array.isArray(result)
      ? result.filter((c): c is string => typeof c === 'string')
      : []
  );
}

// ******** range bar axis ********

/** Candidate spacings for the range bar, finest first. */
const AXIS_STEPS = [5 * MINUTE, 15 * MINUTE, HOUR, 6 * HOUR, DAY, 7 * DAY];
/** Most positions the bar offers; beyond this a drag can't hit them anyway. */
const AXIS_MAX_POSITIONS = 1000;

/** The range bar's axis: from the earliest recorded point to now, on the
 * finest step that keeps the bar to a usable number of positions. The start
 * is floored to the step so a handle at either end is on the grid. */
export function historyAxis(
  earliest: number | undefined,
  now: number
): { min: number; max: number; step: number } {
  const start = Math.min(earliest ?? now - DAY, now - HOUR);
  const span = now - start;
  const step =
    AXIS_STEPS.find((s) => span / s <= AXIS_MAX_POSITIONS) ??
    AXIS_STEPS[AXIS_STEPS.length - 1];
  const min = Math.floor(start / step) * step;
  return { min, max: min + Math.ceil((now - min) / step) * step, step };
}

/** The bar's handle positions for a range: an open end sits at that end of the
 * axis. */
export function rangeToLoop(
  range: HistoryRange,
  axis: { min: number; max: number }
): { min: number; max: number } {
  const clamp = (v: number) => Math.min(axis.max, Math.max(axis.min, v));
  return {
    min: range.from === null ? axis.min : clamp(range.from),
    max: range.to === null ? axis.max : clamp(range.to)
  };
}

/** The range the bar's handles select: a handle at an end of the axis leaves
 * that end open, so "to the end" keeps following now and "from the start"
 * keeps including the oldest record. */
export function loopToRange(
  loop: { min: number; max: number },
  axis: { min: number; max: number }
): HistoryRange {
  return {
    from: loop.min <= axis.min ? null : loop.min,
    to: loop.max >= axis.max ? null : loop.max
  };
}

/** The bar's handles kept at least one step apart. Handles that meet would
 * ask for `from` equal to `to`, which the Track API rejects; the end handle
 * moves on a step instead (or, at the end of the bar, the start moves back). */
export function minimumLoop(
  loop: { min: number; max: number },
  axis: { min: number; max: number; step: number }
): { min: number; max: number } {
  if (loop.max - loop.min >= axis.step) {
    return loop;
  }
  const max = Math.min(axis.max, loop.min + axis.step);
  return { min: Math.max(axis.min, max - axis.step), max };
}

// ******** tapped segment ********

/** Index of the vertex of `line` nearest `p` (lon/lat), with longitude scaled
 * by the cosine of latitude so east-west and north-south distances compare. */
export function nearestVertexIndex(line: Position[], p: Position): number {
  const k = Math.cos((p[1] * Math.PI) / 180);
  let best = -1;
  let bestD = Infinity;
  line.forEach((v, i) => {
    let dLon = Math.abs(v[0] - p[0]) % 360;
    dLon = dLon > 180 ? 360 - dLon : dLon;
    const d = (dLon * k) ** 2 + (v[1] - p[1]) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

/** "3 d 4 h", "2 h 15 min", "40 min", "< 1 min". */
export function durationLabel(ms: number): string {
  if (!Number.isFinite(ms) || ms < MINUTE) {
    return '< 1 min';
  }
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / HOUR);
  const m = Math.floor((ms % HOUR) / MINUTE);
  if (d > 0) {
    return h > 0 ? `${d} d ${h} h` : `${d} d`;
  }
  if (h > 0) {
    return m > 0 ? `${h} h ${m} min` : `${h} h`;
  }
  return `${m} min`;
}

/** The point of `line` nearest `p` (lon/lat): the segment it lies on (from
 * vertex `index`, a fraction `f` of the way to the next), and its squared
 * distance, in degrees of latitude. Longitude is scaled by the cosine of
 * latitude, and measured the short way round the antimeridian. */
export function nearestOnLine(
  line: Position[],
  p: Position
): { index: number; f: number; d: number } | undefined {
  if (line.length === 0) {
    return undefined;
  }
  const k = Math.cos((p[1] * Math.PI) / 180);
  // each vertex as (x, y) relative to p, x unwrapped towards p
  const xy = line.map((v) => {
    let dx = (v[0] - p[0]) % 360;
    dx = dx > 180 ? dx - 360 : dx < -180 ? dx + 360 : dx;
    return [dx * k, v[1] - p[1]];
  });
  let best = { index: 0, f: 0, d: xy[0][0] ** 2 + xy[0][1] ** 2 };
  for (let i = 0; i < xy.length - 1; i++) {
    const [ax, ay] = xy[i];
    const [bx, by] = xy[i + 1];
    const len2 = (bx - ax) ** 2 + (by - ay) ** 2;
    const f =
      len2 > 0
        ? Math.min(1, Math.max(0, -(ax * (bx - ax) + ay * (by - ay)) / len2))
        : 0;
    const d = (ax + f * (bx - ax)) ** 2 + (ay + f * (by - ay)) ** 2;
    if (d < best.d) {
      best = { index: i, f, d };
    }
  }
  return best;
}

/** A point's recording time; undefined for a point never stamped (e.g. part
 * of a local trail restored from an earlier session). */
export type PointTime = string | undefined;

/** A track as drawn, with each point's recording time where it has one. */
export interface TimedTrack {
  lines: Position[][];
  times: PointTime[][];
}

const timeMs = (t: PointTime) => (t ? Date.parse(t) : NaN);

/** What a tap on a line shows: when the timed stretch holding the tapped leg
 * starts and ends, and when the vessel was at the tapped point (interpolated
 * along that leg). The leg is found in the whole line first, so a tap on an
 * untimed leg is undefined — never answered with a nearby leg's time. */
export function segmentTimeInfo(
  line: Position[],
  times: PointTime[] | undefined,
  at: Position
):
  | { start: number; end: number; duration: number; atTime?: number }
  | undefined {
  if (!Array.isArray(times) || times.length !== line.length) {
    return undefined;
  }
  const near = nearestOnLine(line, at);
  if (!near) {
    return undefined;
  }
  const i = near.index;
  const j = Math.min(i + 1, line.length - 1);
  const a = timeMs(times[i]);
  const b = timeMs(times[j]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return undefined;
  }
  // widen to the run of timed points either side of the tapped leg
  let s = i;
  while (s > 0 && Number.isFinite(timeMs(times[s - 1]))) {
    s--;
  }
  let e = j;
  while (e < times.length - 1 && Number.isFinite(timeMs(times[e + 1]))) {
    e++;
  }
  const start = timeMs(times[s]);
  const end = timeMs(times[e]);
  return {
    start,
    end,
    duration: end - start,
    atTime: a + (b - a) * near.f
  };
}

/** {@link segmentTimeInfo} for a tap on a multi-segment track: the stretch
 * whose line passes nearest the tap — not the one with the nearest recorded
 * point, which on a sparse passage can be a different passage close by.
 * Lines carrying no per-point times at all are skipped. */
export function trackTimeInfo(
  lines: Position[][],
  times: PointTime[][] | undefined,
  at: Position
): ReturnType<typeof segmentTimeInfo> {
  if (!Array.isArray(times)) {
    return undefined;
  }
  let best = -1;
  let bestD = Infinity;
  lines.forEach((line, i) => {
    if (times[i]?.length !== line.length) {
      return;
    }
    const near = nearestOnLine(line, at);
    if (near && near.d < bestD) {
      bestD = near.d;
      best = i;
    }
  });
  return best < 0 ? undefined : segmentTimeInfo(lines[best], times[best], at);
}

/** Longest time between the end of one stretch of recording and the start of
 * the next for the two to read as one continuous passage. */
export const TRAIL_JOIN_GAP_MS = 10 * 60000;

/** Stretches of timed track `b` appended to `a`. `b`'s first stretch continues
 * `a`'s last one when it follows on within {@link TRAIL_JOIN_GAP_MS}, so a tap
 * reports the passage rather than where one request (or the local trail)
 * happened to start. */
export function joinStretches(a: TimedTrack, b: TimedTrack): TimedTrack {
  const lines = [...a.lines];
  const times = [...a.times];
  b.lines.forEach((line, i) => {
    const prev = times[times.length - 1];
    const gap = prev
      ? timeMs(b.times[i][0]) - timeMs(prev[prev.length - 1])
      : NaN;
    if (i === 0 && gap >= 0 && gap <= TRAIL_JOIN_GAP_MS) {
      lines[lines.length - 1] = lines[lines.length - 1].concat(line);
      times[times.length - 1] = prev.concat(b.times[i]);
    } else {
      lines.push(line);
      times.push(b.times[i]);
    }
  });
  return { lines, times };
}

/** When each point of the local trail was logged. A time belongs to the
 * logged sample — the position object — not to its coordinates, so a vessel
 * passing the same spot twice keeps both times, and a point rebuilt from
 * storage (a new object) simply has none. Weakly held: a point dropped from
 * the trail takes its time with it. */
export class TrailStamps {
  private stamps = new WeakMap<Position, string>();

  stamp(p: Position, time: string) {
    if (p) {
      this.stamps.set(p, time);
    }
  }

  timeOf(p: Position): PointTime {
    return p ? this.stamps.get(p) : undefined;
  }

  /** A trail as drawn, with each point's time where it was stamped. */
  timed(line: Position[]): TimedTrack {
    return line.length
      ? { lines: [line], times: [line.map((p) => this.timeOf(p))] }
      : { lines: [], times: [] };
  }
}

// ******** scrubbing: where a vessel was at a time ********

/** How many recorded points ahead of the scrubbed position the ghost vessel
 * is pointed at: far enough to smooth jitter, near enough to follow a turn. */
export const GHOST_HEADING_LOOKAHEAD = 2;

/** Initial great-circle bearing from `a` to `b`, in radians clockwise from
 * north ([0, 2π)), as vessel headings and OpenLayers icon rotation use. */
export function bearingBetween(a: Position, b: Position): number {
  const rad = Math.PI / 180;
  const f1 = a[1] * rad;
  const f2 = b[1] * rad;
  const dl = (b[0] - a[0]) * rad;
  const y = Math.sin(dl) * Math.cos(f2);
  const x =
    Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
  return (Math.atan2(y, x) + 2 * Math.PI) % (2 * Math.PI);
}

/** Where a vessel was at time `t` along its recorded track, and which way it
 * was heading: interpolated between the two recorded points either side of
 * `t`, and pointed at the recorded point {@link GHOST_HEADING_LOOKAHEAD} ahead
 * (or, at the end of a stretch of recording, from the same distance behind).
 * Undefined when `t` falls outside every recorded stretch — before the
 * record, after it, or in a gap. */
export function poseAt(
  lines: Position[][],
  times: string[][] | undefined,
  t: number
): { position: Position; heading: number } | undefined {
  if (!Array.isArray(times)) {
    return undefined;
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ts = times[i]?.map((v) => Date.parse(v));
    if (!ts || ts.length !== line.length || line.length === 0) {
      continue;
    }
    if (!(t >= ts[0] && t <= ts[ts.length - 1])) {
      continue;
    }
    // last recorded point at or before t
    let lo = 0;
    let hi = ts.length - 1;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (ts[mid] <= t) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    const a = line[lo];
    const b = line[Math.min(lo + 1, line.length - 1)];
    const span = ts[Math.min(lo + 1, ts.length - 1)] - ts[lo];
    const f = span > 0 ? (t - ts[lo]) / span : 0;
    // unwrap across the antimeridian before interpolating
    let bLon = b[0];
    if (bLon - a[0] > 180) bLon -= 360;
    if (a[0] - bLon > 180) bLon += 360;
    let lon = a[0] + (bLon - a[0]) * f;
    lon = ((((lon + 180) % 360) + 360) % 360) - 180;
    const position: Position = [lon, a[1] + (b[1] - a[1]) * f];

    const ahead = lo + GHOST_HEADING_LOOKAHEAD;
    const heading =
      ahead < line.length
        ? bearingBetween(position, line[ahead])
        : line.length > 1
          ? bearingBetween(
              line[Math.max(0, line.length - 1 - GHOST_HEADING_LOOKAHEAD)],
              line[line.length - 1]
            )
          : 0;
    return { position, heading };
  }
  return undefined;
}

/** The next playback time: one step on through the selected range, wrapping
 * back to its start after showing its end. Playback starts at the range start
 * from live, or from a scrub outside the range. */
export function nextPlaybackTime(
  current: number | null,
  loop: { min: number; max: number },
  step: number
): number {
  if (current === null || current < loop.min || current >= loop.max) {
    return loop.min;
  }
  return Math.min(current + step, loop.max);
}

/** One manual step of the scrubber, clamped to the bar; stepping to its end
 * (now) returns to live (null). Live steps back from the end. */
export function stepScrubTime(
  current: number | null,
  direction: -1 | 1,
  axis: { min: number; max: number; step: number }
): number | null {
  const next = Math.min(
    axis.max,
    Math.max(axis.min, (current ?? axis.max) + direction * axis.step)
  );
  return next >= axis.max ? null : next;
}

// ******** palette placement ********

/** A saved palette drag offset brought back on screen, relative to where the
 * palette opens (`left`, `top`), so its drag handle — the only way to move it —
 * can't be left past the viewport edge by a smaller window. */
export function clampPaletteOffset(
  offset: { x: number; y: number } | null | undefined,
  opensAt: { left: number; top: number },
  size: { width: number; header: number },
  viewport: { width: number; height: number }
): { x: number; y: number } | null {
  if (!offset) {
    return null;
  }
  const minX = -(opensAt.left - 8);
  const maxX = viewport.width - opensAt.left - size.width - 8;
  const maxY = Math.max(0, viewport.height - opensAt.top - size.header);
  return {
    x: Math.max(minX, Math.min(offset.x, maxX)),
    y: Math.max(-opensAt.top, Math.min(offset.y, maxY))
  };
}
