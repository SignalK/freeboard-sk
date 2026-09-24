/** Exporting a recorded track to GPX (#825 own vessel, #826 another vessel):
 * which range to export, the Track API query for it, and the track written
 * to the file (its segments, each point's recording time, and its name).
 *
 * Pure helpers (no Angular, no state) so they can be unit tested directly.
 */

import { Position } from 'src/app/types';
import {
  HistoryRange,
  joinStretches,
  PointTime,
  presetRange,
  rangeParams,
  TimedTrack
} from 'src/app/modules/skstream/track-history';
import { queryString } from 'src/app/modules/skstream/track-source';

/** What to export: the track as currently displayed, or a range fetched from
 * the Track API (v2 only). `history` is the range the Track history palette
 * is showing, offered only while that vessel's history is shown. */
export type TrackExportChoice =
  'displayed' | '7d' | '30d' | 'all' | 'history' | 'custom';

/** One track offered for export. */
export interface TrackExportSource {
  /** `self`, or an AIS vessel's context (`vessels.urn:mrn:…`). */
  context: string;
  /** Who the track belongs to, used in the list and the track's name. */
  label: string;
  /** The track as currently displayed, with recording times where known. */
  displayed: TimedTrack;
  /** Only the short tail gathered while Freeboard was open: no recorded
   * track is available for this vessel. */
  tailOnly?: boolean;
}

/** A track ready to be written: one GPX track, one segment per line. */
export interface GpxTrackData {
  name: string;
  lines: Position[][];
  times: PointTime[][];
}

/** The range a choice fetches, or null for the displayed track (nothing to
 * fetch). `history` and `custom` come from the caller; an incomplete custom
 * range is null too, and the dialog doesn't allow saving it. */
export function exportRange(
  choice: TrackExportChoice,
  now: number,
  opts: { history?: HistoryRange; custom?: HistoryRange } = {}
): HistoryRange | null {
  switch (choice) {
    case '7d':
    case '30d':
    case 'all':
      return presetRange(choice, now);
    case 'history':
      return opts.history ?? null;
    case 'custom':
      return validCustomRange(opts.custom) ? opts.custom : null;
    default:
      return null;
  }
}

/** A custom range needs both ends, in order. */
export function validCustomRange(range?: HistoryRange): boolean {
  return (
    !!range &&
    Number.isFinite(range.from) &&
    Number.isFinite(range.to) &&
    range.from < range.to
  );
}

/** Query string for one vessel's track over a range, at full resolution: no
 * `bbox` (which selects passages by the viewport), no `maxPoints` and no
 * `epsilon` (which thin the line for display). `times` carries each point's
 * recording time into the file. */
export function trackExportQuery(
  context: string,
  range: HistoryRange,
  provider?: string
): string {
  return queryString({
    context,
    ...rangeParams(range),
    times: 'true',
    provider
  });
}

const pointKey = (p: Position) => `${p[0]},${p[1]}`;

/** Recording times for a displayed track, from the timed track it was drawn
 * from. The displayed line can hold points the timed one doesn't (the live
 * tail since the last fetch) and can be split differently, so times are
 * matched by position, in order: a vessel that passes the same spot twice
 * takes the earlier time first. Unmatched points get no time. */
export function attachTimes(
  lines: Position[][],
  timed?: { lines: Position[][]; times: PointTime[][] } | null
): TimedTrack {
  const queue = new Map<string, PointTime[]>();
  timed?.lines.forEach((line, i) =>
    line.forEach((p, j) => {
      const t = timed.times[i]?.[j];
      if (t) {
        const k = pointKey(p);
        queue.set(k, [...(queue.get(k) ?? []), t]);
      }
    })
  );
  return {
    lines,
    times: lines.map((line) => line.map((p) => queue.get(pointKey(p))?.shift()))
  };
}

/** The own-vessel trail as displayed: the server trail, when it is the one
 * drawn, with the local trail carrying on from it; else the local trail.
 * The server trail's recorded (unsimplified) bands and times are used when
 * the v2 Track API sent them; a v1 server trail has no times. */
export function displayedOwnTrail(
  serverShown: boolean,
  serverTimed: { lines: Position[][]; times: string[][] } | null,
  serverLines: Position[][],
  local: TimedTrack
): TimedTrack {
  if (!serverShown) {
    return local;
  }
  const server: TimedTrack = serverTimed ?? {
    lines: serverLines,
    times: serverLines.map((l) => l.map((): PointTime => undefined))
  };
  return joinStretches(server, local);
}

/** Lines with fewer than two points are not a track segment. */
export function exportableLines(track: TimedTrack): TimedTrack {
  const keep = track.lines
    .map((line, i) => ({ line, times: track.times[i] ?? [] }))
    .filter((s) => s.line.length > 1);
  return { lines: keep.map((s) => s.line), times: keep.map((s) => s.times) };
}

/** Whether a track holds anything to export: a segment of two points. */
export function hasExportableTrack(lines: Position[][] | undefined): boolean {
  return Array.isArray(lines) && lines.some((l) => l?.length > 1);
}

/** Earliest and latest recording time of a track (ms), or undefined when no
 * point has a time. */
export function trackSpan(
  times: PointTime[][]
): { from: number; to: number } | undefined {
  let from = Infinity;
  let to = -Infinity;
  times.forEach((line) =>
    line.forEach((t) => {
      const ms = t ? Date.parse(t) : NaN;
      if (Number.isFinite(ms)) {
        from = Math.min(from, ms);
        to = Math.max(to, ms);
      }
    })
  );
  return Number.isFinite(from) ? { from, to } : undefined;
}

const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** A track's time span in local time: `2026-09-25 14:05–15:05` within a day,
 * `2026-09-18 14:05 – 2026-09-25 15:05` across days. */
export function spanLabel(span: { from: number; to: number }): string {
  const a = new Date(span.from);
  const b = new Date(span.to);
  return localDate(a) === localDate(b)
    ? `${localDate(a)} ${localTime(a)}–${localTime(b)}`
    : `${localDate(a)} ${localTime(a)} – ${localDate(b)} ${localTime(b)}`;
}

/** The exported track's name: who it belongs to and the span it covers, or,
 * with no recording times, when it was exported. */
export function exportTrackName(
  label: string,
  times: PointTime[][],
  now: number
): string {
  const span = trackSpan(times);
  if (span) {
    return `${label} ${spanLabel(span)}`;
  }
  const d = new Date(now);
  return `${label} (exported ${localDate(d)} ${localTime(d)})`;
}

/** A vessel's label: `NAME (MMSI)`, or whichever of the two it has, else the
 * last part of its context. */
export function vesselLabel(
  context: string,
  name?: string,
  mmsi?: string
): string {
  if (name && mmsi) {
    return `${name} (${mmsi})`;
  }
  return name || mmsi || context.split(':').pop();
}

/** The GPX track for a source and the track chosen for it. */
export function gpxTrack(
  label: string,
  track: TimedTrack,
  now: number
): GpxTrackData | undefined {
  const t = exportableLines(track);
  if (t.lines.length === 0) {
    return undefined;
  }
  return {
    name: exportTrackName(label, t.times, now),
    lines: t.lines,
    times: t.times
  };
}

/** Whether an AIS vessel's track is displayed: "Show all tracks" draws every
 * track from `minZoom`; otherwise only vessels picked with their TRACK
 * toggle, at any zoom. */
export function aisTrackDisplayed(opts: {
  showAll: boolean;
  picked: boolean;
  zoom: number;
  minZoom: number;
}): boolean {
  return opts.showAll ? opts.zoom >= opts.minZoom : opts.picked;
}

/** Whether a vessel's popover offers an export, and what it starts on: its
 * track while one is displayed with two points to save, else the Track
 * history range while its history is shown there; null offers none. */
export function vesselExportOffer(opts: {
  trackDisplayed: boolean;
  lines: Position[][] | undefined;
  historyShown: boolean;
}): TrackExportChoice | null {
  if (opts.trackDisplayed && hasExportableTrack(opts.lines)) {
    return 'displayed';
  }
  return opts.historyShown ? 'history' : null;
}

/** A track as the SK track resource SK2GPX packages: one segment per line,
 * and each point's recording time as `coordTimes` (the Track API's name for
 * it), nested to match the coordinates. */
export function gpxTrackResource(id: string, t: GpxTrackData) {
  return {
    feature: {
      type: 'Feature',
      id,
      geometry: { type: 'MultiLineString', coordinates: t.lines },
      properties: { name: t.name, coordTimes: t.times }
    }
  };
}
