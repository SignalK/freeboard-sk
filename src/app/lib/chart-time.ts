/**
 * Time-varying (temporal) chart helpers: the pure model behind a chart's
 * `time` dimension — which instant a chart starts at, how a tile URL is built
 * for an instant, and the timeline a time control scrubs over. No OpenLayers
 * or Angular here; applying an instant to a layer lives in
 * `modules/map/ol/lib/charts/chart-utils.ts`.
 *
 * Contract: the *Time-varying charts* chart-resource convention in
 * `docs/api/plotter-extensions-api.md`.
 */
import { ChartTimeDimension } from 'src/app/types';

/** Placeholder in a `time.url` template that takes the requested instant. */
export const CHART_TIME_PLACEHOLDER = '{time}';

/**
 * Number of frames a continuous timeline is divided into when the dimension
 * declares no `step`, so the scrub control still moves in sensible increments.
 */
const DEFAULT_TIMELINE_FRAMES = 60;

/** Smallest scrub step for a continuous timeline with no declared `step`. */
const MIN_TIMELINE_STEP_MS = 60000;

/**
 * Minimum auto-refresh cadence for a chart, in milliseconds. Time-varying
 * raster products (weather radar, satellite) update every few minutes, and
 * the Overlay refresh timer this replaced worked at 60 s granularity, so a
 * shorter interval would only re-request tiles the server has not changed.
 */
export const MIN_CHART_REFRESH_INTERVAL_MS = 60000;

/**
 * Maximum auto-refresh cadence, in milliseconds: the largest delay `setInterval`
 * accepts before its signed 32-bit timeout overflows and the timer fires almost
 * continuously. Clamping here stops a misconfigured provider from hammering its
 * own tile endpoint.
 */
export const MAX_CHART_REFRESH_INTERVAL_MS = 2147483647;

/**
 * Auto-refresh cadence to suggest for a time-varying chart whose interval has
 * not been set: a fresh frame every few minutes is the norm for radar and
 * satellite products, so *never* (the field's initial 0) is almost always the
 * wrong default for them (#808).
 */
export const DEFAULT_CHART_REFRESH_INTERVAL_MS = 300000;

/**
 * The auto-refresh interval to pre-fill for a chart that has just been
 * pointed at a time-varying layer: the dimension's own `step` when it declares
 * one (clamped like any interval), else
 * {@link DEFAULT_CHART_REFRESH_INTERVAL_MS}. Undefined for a chart with no
 * time dimension, which has nothing to suggest (#808).
 */
export function defaultChartRefreshIntervalMs(
  dim?: ChartTimeDimension
): number | undefined {
  if (!dim) {
    return undefined;
  }
  return (
    chartRefreshIntervalMs(dim.step) ??
    chartRefreshIntervalMs(DEFAULT_CHART_REFRESH_INTERVAL_MS)
  );
}

/**
 * Longest span a live dimension is described as "last …" rather than by its
 * dates: past a month the relative form stops being meaningful.
 */
const RELATIVE_SPAN_MAX_MS = 31 * 86400000;

/**
 * One-line description of a time dimension for a layer picker, e.g.
 * `Time-varying: every 5 min, last 12 h` for a live product or
 * `Time-varying: every 5 min, 1995-01-01 – 2026-12-31` for an archive, or
 * `Time-varying: 24 frames` for a discrete list. Empty when the dimension has
 * no usable range (the layer gets no Time control either) (#808).
 */
export function chartTimeSummary(dim?: ChartTimeDimension): string {
  const timeline = chartTimeline(dim);
  if (!timeline) {
    return '';
  }
  const parts: string[] = [];
  const first = timeline.frames
    ? chartTimeMs(timeline.frames[0])
    : timeline.min;
  const last = timeline.frames
    ? chartTimeMs(timeline.frames[timeline.frames.length - 1])
    : timeline.max;
  const span = last - first;
  if (timeline.frames) {
    parts.push(`${timeline.frames.length} frames`);
  } else if (
    typeof dim.step === 'number' &&
    Number.isFinite(dim.step) &&
    dim.step > 0
  ) {
    parts.push(`every ${formatDuration(dim.step)}`);
  }
  if (span > 0) {
    parts.push(
      dim.current && span <= RELATIVE_SPAN_MAX_MS
        ? `last ${formatDuration(span)}`
        : `${isoDate(first)} – ${isoDate(last)}`
    );
  }
  return parts.length ? `Time-varying: ${parts.join(', ')}` : 'Time-varying';
}

/** A duration in the largest whole-ish unit that reads naturally. */
function formatDuration(ms: number): string {
  const units: Array<[number, string]> = [
    [86400000, 'd'],
    [3600000, 'h'],
    [60000, 'min'],
    [1000, 's']
  ];
  for (const [size, label] of units) {
    if (ms >= size) {
      const n = ms / size;
      return `${Number.isInteger(n) ? n : Number(n.toFixed(1))} ${label}`;
    }
  }
  return `${ms} ms`;
}

/** Calendar date (UTC) of an epoch instant, `YYYY-MM-DD`. */
function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * A chart's `refreshInterval` as a usable timer delay: clamped to
 * [{@link MIN_CHART_REFRESH_INTERVAL_MS}, {@link MAX_CHART_REFRESH_INTERVAL_MS}],
 * or undefined when absent, non-finite or non-positive (the chart never
 * auto-refreshes).
 */
export function chartRefreshIntervalMs(
  refreshInterval?: number
): number | undefined {
  if (
    typeof refreshInterval !== 'number' ||
    !Number.isFinite(refreshInterval) ||
    refreshInterval <= 0
  ) {
    return undefined;
  }
  return Math.min(
    Math.max(refreshInterval, MIN_CHART_REFRESH_INTERVAL_MS),
    MAX_CHART_REFRESH_INTERVAL_MS
  );
}

/** Milliseconds since the epoch for an ISO 8601 instant, or NaN when invalid. */
export function chartTimeMs(time?: string | null): number {
  return typeof time === 'string' && time.trim() ? Date.parse(time) : NaN;
}

/**
 * ISO 8601 as the contract means it: a calendar date, optionally with a time
 * (to the minute or beyond, fractional seconds allowed) that must then carry
 * a zone -- an unzoned time would be read in the client's zone and mean a
 * different frame on every boat. `Date.parse` alone would also take
 * "September 18, 2026" and slash dates, which are not ISO and would be passed
 * straight to a tile source.
 */
const ISO_8601_INSTANT =
  /^(\d{4})-(\d{2})-(\d{2})(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2}))?$/;

/**
 * True when `time` is an ISO 8601 instant naming a real date. `Date.parse`
 * rolls an impossible date over (Feb 30 → Mar 1) rather than rejecting it, so
 * the calendar date is checked against what was written -- in the instant's
 * own zone, which for a date-only value is UTC.
 */
export function isChartTimeInstant(time: unknown): time is string {
  if (typeof time !== 'string') {
    return false;
  }
  const m = ISO_8601_INSTANT.exec(time);
  if (!m) {
    return false;
  }
  const ms = chartTimeMs(time);
  if (!Number.isFinite(ms)) {
    return false;
  }
  // Shift into the written zone so the UTC getters read the written date.
  const zone = m[7] ?? 'Z';
  const offsetMin =
    zone === 'Z'
      ? 0
      : (zone[0] === '-' ? -1 : 1) *
        (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(-2)));
  const local = new Date(ms + offsetMin * 60000);
  return (
    local.getUTCFullYear() === Number(m[1]) &&
    local.getUTCMonth() + 1 === Number(m[2]) &&
    local.getUTCDate() === Number(m[3])
  );
}

/**
 * The instant a chart starts at when first shown. A source that serves a
 * live/latest frame (`current` true, or no time dimension at all) starts live
 * (`null`); a purely archival source starts at its newest frame — the one at
 * (or nearest before) now, since a declared `to` may run ahead of the frames
 * that actually exist.
 */
export function initialChartTime(dim?: ChartTimeDimension): string | null {
  if (!dim || dim.current !== false) {
    return null;
  }
  const timeline = chartTimeline(dim);
  return timeline
    ? chartTimelineInstant(timeline, chartTimelinePosition(timeline, null))
    : null;
}

/**
 * Tile URL for an instant from a `time.url` template: every `{time}` is
 * replaced with the URL-encoded ISO 8601 instant. A template without the
 * placeholder is returned unchanged (the provider's problem, but never a
 * broken URL).
 */
export function chartTimeTileUrl(template: string, time: string): string {
  return template.split(CHART_TIME_PLACEHOLDER).join(encodeURIComponent(time));
}

/**
 * The timeline a chart's time control scrubs over. Positions are frame
 * indexes into `frames` when the dimension lists explicit instants, otherwise
 * milliseconds since the epoch across `from`…`to` in `step` increments.
 */
export interface ChartTimeline {
  min: number;
  max: number;
  step: number;
  // Explicit instants, ascending, when the dimension lists `values`.
  frames?: string[];
}

/**
 * Build the timeline for a time dimension, or null when it describes no usable
 * range: neither valid `values` nor a valid `from` < `to`. Explicit `values`
 * win over a range when both are given, since they are the frames actually
 * offered.
 */
export function chartTimeline(dim?: ChartTimeDimension): ChartTimeline | null {
  if (!dim) {
    return null;
  }
  const frames = sortedInstants(dim.values);
  if (frames.length) {
    return { min: 0, max: frames.length - 1, step: 1, frames };
  }
  const from = chartTimeMs(dim.from);
  const to = chartTimeMs(dim.to);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
    return null;
  }
  const declared = dim.step;
  const step =
    typeof declared === 'number' && Number.isFinite(declared) && declared > 0
      ? declared
      : Math.max(
          MIN_TIMELINE_STEP_MS,
          Math.round((to - from) / DEFAULT_TIMELINE_FRAMES)
        );
  return { min: from, max: to, step };
}

/**
 * Timeline position of an instant: the nearest frame index on a discrete
 * timeline, or the instant itself (in ms) clamped to the range. `null` (live)
 * sits at now — clamped into the range, so on a timeline whose declared end
 * runs ahead of the present it is still the newest frame that can exist.
 */
export function chartTimelinePosition(
  timeline: ChartTimeline,
  time: string | null
): number {
  if (time === null) {
    return newestPositionAt(timeline, Date.now());
  }
  const ms = chartTimeMs(time);
  if (!Number.isFinite(ms)) {
    return timeline.max;
  }
  if (timeline.frames) {
    let nearest = 0;
    let distance = Infinity;
    timeline.frames.forEach((frame, index) => {
      const d = Math.abs(chartTimeMs(frame) - ms);
      if (d < distance) {
        distance = d;
        nearest = index;
      }
    });
    return nearest;
  }
  return Math.min(timeline.max, Math.max(timeline.min, ms));
}

/**
 * The ISO 8601 instant at a timeline position, clamped to the range and, on a
 * continuous timeline, snapped to the `from + n·step` grid: a service that
 * declares `from/to/step` typically serves exactly those instants and nothing
 * in between (WMS `nearestValue="0"`).
 */
export function chartTimelineInstant(
  timeline: ChartTimeline,
  position: number
): string {
  const clamped = Math.min(timeline.max, Math.max(timeline.min, position));
  if (timeline.frames) {
    return timeline.frames[Math.round(clamped)];
  }
  const { min, max, step } = timeline;
  const last = min + Math.floor((max - min) / step) * step;
  const snapped = Math.min(
    last,
    min + Math.round((clamped - min) / step) * step
  );
  return new Date(snapped).toISOString();
}

/**
 * The instant one step before (-1) or after (+1) the current one. Stepping
 * back from live lands on the newest frame; stepping forward off the end
 * returns to live when the source serves a live frame (`current`), otherwise
 * stays on the last frame.
 */
export function stepChartTime(
  timeline: ChartTimeline,
  time: string | null,
  direction: -1 | 1,
  current: boolean
): string | null {
  if (time === null) {
    return direction < 0 ? chartTimelineInstant(timeline, timeline.max) : null;
  }
  const next =
    chartTimelinePosition(timeline, time) + direction * timeline.step;
  if (next > timeline.max) {
    return current ? null : chartTimelineInstant(timeline, timeline.max);
  }
  return chartTimelineInstant(timeline, next);
}

/**
 * The head of a timeline: the position of the newest frame that can exist
 * now -- at or before the present, clamped into the range. It moves on as
 * frames are added: by the clock on a range whose declared `to` runs ahead of
 * the present, or when a re-read of the chart resource brings a longer
 * `values` list or a rolling `from`/`to` that has moved on.
 */
export function chartTimelineHead(timeline: ChartTimeline): number {
  return chartTimelinePosition(timeline, null);
}

/** The instant at the head of a timeline, in milliseconds since the epoch. */
export function chartTimelineHeadMs(timeline: ChartTimeline): number {
  return chartTimeMs(
    chartTimelineInstant(timeline, chartTimelineHead(timeline))
  );
}

/**
 * Where a selected instant moves to as the head advances: it keeps its offset
 * from the head, so a chart on the newest frame stays on the newest frame and
 * one an hour behind stays an hour behind as new frames arrive. `head` is the
 * head's instant (ms) as last seen. The offset is measured in time and the
 * result lands on a frame of the timeline as it is *now*, so a re-read
 * `values` list that has since dropped the selected frame still puts the
 * selection the same distance behind the new head, on the nearest listed
 * frame. Returns `time` itself (the same string) while the head has not
 * moved, so the caller can tell nothing needs re-requesting.
 */
export function chartTimeFollowingHead(
  timeline: ChartTimeline,
  time: string,
  head: number
): { time: string; head: number } {
  const headMs = chartTimelineHeadMs(timeline);
  if (!(headMs > head)) {
    return { time, head };
  }
  const ms = chartTimeMs(time);
  if (!Number.isFinite(ms)) {
    return { time, head: headMs };
  }
  const moved = new Date(ms + headMs - head).toISOString();
  return {
    time: chartTimelineInstant(
      timeline,
      chartTimelinePosition(timeline, moved)
    ),
    head: headMs
  };
}

/**
 * The next frame during playback: one step on, wrapping to the start past the
 * end. Playback runs over `window` (positions on the timeline) when given —
 * the frames a control is showing — else the whole timeline. From live, or an
 * instant outside the window, it starts at the window's first frame.
 */
export function nextChartPlaybackTime(
  timeline: ChartTimeline,
  time: string | null,
  window: { min: number; max: number } = timeline
): string {
  if (time === null) {
    return chartTimelineInstant(timeline, window.min);
  }
  const at = chartTimelinePosition(timeline, time);
  const next = at + timeline.step;
  return chartTimelineInstant(
    timeline,
    at < window.min || next > window.max ? window.min : next
  );
}

/**
 * A chart `time` block derived from a WMS / WMTS capabilities time dimension
 * (as `parseTimeDimension` in `maplib.worker.ts` yields it). What the service
 * serves with no TIME parameter is its declared default (`current` here, as
 * the parser names it): that frame counts as live only when the default is
 * absent or symbolic (`current` / `present`), or is the newest instant of the
 * range — a service whose default is some fixed past instant (IEM NEXRAD
 * defaults to a day in 2006) has no live frame to offer, so the chart is
 * archival and always addressed by instant. Returns undefined when the
 * dimension has no usable range.
 */
export function chartTimeFromCapabilities(dim?: {
  from?: string | null;
  to?: string | null;
  interval?: number;
  values?: string[];
  current?: string | null;
}): ChartTimeDimension | undefined {
  if (!dim) {
    return undefined;
  }
  const result: ChartTimeDimension = { current: true };
  if (isChartTimeInstant(dim.from)) {
    result.from = dim.from;
  }
  if (isChartTimeInstant(dim.to)) {
    result.to = dim.to;
  }
  if (
    typeof dim.interval === 'number' &&
    Number.isFinite(dim.interval) &&
    dim.interval > 0
  ) {
    result.step = dim.interval;
  }
  const values = sortedInstants(dim.values);
  if (values.length) {
    result.values = values;
  }
  const timeline = chartTimeline(result);
  if (!timeline) {
    return undefined;
  }
  if (isChartTimeInstant(dim.current)) {
    const newest = chartTimeMs(chartTimelineInstant(timeline, timeline.max));
    result.current = chartTimeMs(dim.current) >= newest;
  }
  return result;
}

/**
 * Position of the newest frame at or before `ms` — never a frame still to
 * come — clamped into the timeline.
 */
function newestPositionAt(timeline: ChartTimeline, ms: number): number {
  if (timeline.frames) {
    let index = 0;
    timeline.frames.forEach((frame, i) => {
      if (chartTimeMs(frame) <= ms) {
        index = i;
      }
    });
    return index;
  }
  const { min, max, step } = timeline;
  const floored = min + Math.floor((ms - min) / step) * step;
  return Math.min(max, Math.max(min, floored));
}

/** Valid instants from a `values` list, ascending. */
function sortedInstants(values?: string[]): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .filter(isChartTimeInstant)
    .sort((a, b) => chartTimeMs(a) - chartTimeMs(b));
}
