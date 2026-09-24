/** Recorded track history (#821): request building and response parsing for
 * browsing the whole recorded track of the own vessel or an AIS vessel.
 *
 * The v2 Track API keeps the own vessel's track indefinitely (tracks-plugin v3
 * default) and other vessels' for 30 days. A single-context query may omit the
 * time window, which returns that vessel's whole history; a `bbox` then
 * *selects* passages touching the viewport (it never clips them), and with no
 * `epsilon` the provider picks a simplification tolerance suited to the box, so
 * the viewport doubles as the level-of-detail control.
 *
 * Pure helpers (no Angular, no state) so they can be unit tested directly.
 * v2 only: the v1 routes have no equivalent.
 */

import { Position } from 'src/app/types';
import { queryString } from './track-source';

/** Points per history track, at every zoom level. */
export const HISTORY_MAX_POINTS = 5000;

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
  provider?: string;
}

/** Query string for one vessel's history in the viewport. No `epsilon`: with a
 * `bbox` the provider picks a tolerance for the box size, so zooming in
 * refetches at finer detail. `times` carries each point's recording time,
 * which a tapped segment's time span is read from. */
export function historyQuery(req: HistoryRequest): string {
  return queryString({
    context: req.context,
    ...rangeParams(req.range),
    bbox: req.bbox ? req.bbox.join(',') : undefined,
    maxPoints: HISTORY_MAX_POINTS,
    times: 'true',
    provider: req.provider
  });
}

/** Query string for a vessel's recorded span only: metadata, no geometry. */
export function historyMetaQuery(context: string, provider?: string): string {
  return queryString({ context, geometry: 'false', provider });
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

/** A vessel's recorded span (ms) from a `geometry=false` response, and the
 * name the provider recorded for it (useful once the vessel has left AIS
 * range and the app no longer holds it). */
export function parseHistorySpan(
  fc: unknown,
  preferredProvider?: string
): { from: number; to: number; name?: string } | undefined {
  let from = Infinity;
  let to = -Infinity;
  let name: string | undefined;
  oneProvider(featuresOf(fc), preferredProvider).forEach((f) => {
    const a = Date.parse(f.properties?.from ?? '');
    const b = Date.parse(f.properties?.to ?? '');
    if (Number.isFinite(a) && Number.isFinite(b)) {
      from = Math.min(from, a);
      to = Math.max(to, b);
    }
    name = name ?? f.properties?.contextName;
  });
  return Number.isFinite(from) ? { from, to, name } : undefined;
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

/** What a tapped stretch of recording shows: when it starts and ends, and
 * when the vessel was at the tapped point (interpolated along the recorded
 * leg nearest the tap). Undefined when the stretch carries no recording
 * times. */
export function segmentTimeInfo(
  line: Position[],
  times: string[] | undefined,
  at: Position
):
  | { start: number; end: number; duration: number; atTime?: number }
  | undefined {
  if (!Array.isArray(times) || times.length === 0) {
    return undefined;
  }
  const start = Date.parse(times[0]);
  const end = Date.parse(times[times.length - 1]);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return undefined;
  }
  const near = times.length === line.length ? nearestOnLine(line, at) : null;
  let atTime = NaN;
  if (near) {
    const a = Date.parse(times[near.index]);
    const b = Date.parse(times[Math.min(near.index + 1, times.length - 1)]);
    atTime = a + (b - a) * near.f;
  }
  return {
    start,
    end,
    duration: end - start,
    atTime: Number.isFinite(atTime) ? atTime : undefined
  };
}

/** {@link segmentTimeInfo} for a tap on a multi-segment track: the stretch
 * whose line passes nearest the tap — not the one with the nearest recorded
 * point, which on a sparse passage can be a different passage close by.
 * Stretches without recording times are skipped. */
export function trackTimeInfo(
  lines: Position[][],
  times: string[][] | undefined,
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

/** A trail as contiguous stretches of timed points, for answering a tap:
 * `timeOf` gives a point's time, or undefined for one never stamped (e.g. a
 * point restored from an earlier session), which splits the trail. */
export function timedRuns(
  line: Position[],
  timeOf: (p: Position) => string | undefined
): { lines: Position[][]; times: string[][] } {
  const lines: Position[][] = [];
  const times: string[][] = [];
  let run: Position[] = [];
  let runTimes: string[] = [];
  const close = () => {
    if (run.length) {
      lines.push(run);
      times.push(runTimes);
    }
    run = [];
    runTimes = [];
  };
  line.forEach((p) => {
    const t = timeOf(p);
    if (t && Number.isFinite(Date.parse(t))) {
      run.push(p);
      runTimes.push(t);
    } else {
      close();
    }
  });
  close();
  return { lines, times };
}

/** Longest time between the end of one stretch of recording and the start of
 * the next for the two to read as one continuous passage. */
export const TRAIL_JOIN_GAP_MS = 10 * 60000;

/** Stretches of timed track `b` appended to `a`. `b`'s first stretch continues
 * `a`'s last one when it follows on within {@link TRAIL_JOIN_GAP_MS}, so a tap
 * reports the passage rather than where one request (or the local trail)
 * happened to start. */
export function joinStretches(
  a: { lines: Position[][]; times: string[][] },
  b: { lines: Position[][]; times: string[][] }
): { lines: Position[][]; times: string[][] } {
  const lines = [...a.lines];
  const times = [...a.times];
  b.lines.forEach((line, i) => {
    const prev = times[times.length - 1];
    const gap = prev
      ? Date.parse(b.times[i][0]) - Date.parse(prev[prev.length - 1])
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

/** Key for a trail point's recorded time. */
export const trailPointKey = (p: Position) => `${p[0]},${p[1]}`;

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
