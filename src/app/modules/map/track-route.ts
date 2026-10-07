/** A route from a recorded track: the passage between the stops either side
 * of a tapped point, so a passage sailed (or watched another vessel make) can
 * be followed again. */

import { SimplifyAP } from 'simplify-ts';

import { Position } from 'src/app/types';
import {
  nearestOnLine,
  TimedTrack,
  TRAIL_JOIN_GAP_MS
} from 'src/app/modules/skstream/track-history';

/** How far a vessel may move and still count as stopped: an anchored boat
 * swings through a circle as wide as twice its rode. */
export const STOP_RADIUS_M = 200;
/** How long the own vessel stays put where a passage ends: an anchorage or a
 * berth, not a pause on the way. */
export const OWN_STOP_MS = 60 * 60000;
/** The same for another vessel: a ferry turns round at its terminal well
 * within the hour. */
export const OTHER_STOP_MS = 15 * 60000;
/** A shorter stay within a passage becomes a single point of the route, so it
 * does not zigzag through the swing circle. */
export const PAUSE_MS = 10 * 60000;
/** How far the route may stray from the recorded track. */
export const ROUTE_TOLERANCE_M = 10;

const METRES_PER_DEGREE = 111320;

interface TimedPoint {
  p: Position;
  t: number;
  line: number;
}

/** Longitude difference `b - a` in (-180, 180], across the antimeridian. */
function deltaLon(a: number, b: number): number {
  const d = ((((b - a) % 360) + 540) % 360) - 180;
  return d === -180 ? 180 : d;
}

/** `b` relative to `a`, in metres east and north. */
function offsetM(a: Position, b: Position): [number, number] {
  const k = Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180);
  return [
    deltaLon(a[0], b[0]) * k * METRES_PER_DEGREE,
    (b[1] - a[1]) * METRES_PER_DEGREE
  ];
}

const distM = (a: Position, b: Position) => Math.hypot(...offsetM(a, b));

/** Index ranges of `pts` where the vessel stayed within STOP_RADIUS_M of
 * where it arrived for at least `minMs`; in order, never overlapping. */
function stationaryRuns(pts: TimedPoint[], minMs: number): [number, number][] {
  const runs: [number, number][] = [];
  let i = 0;
  while (i < pts.length) {
    let j = i;
    while (
      j + 1 < pts.length &&
      distM(pts[i].p, pts[j + 1].p) <= STOP_RADIUS_M
    ) {
      j++;
    }
    if (pts[j].t - pts[i].t >= minMs) {
      runs.push([i, j]);
      i = j + 1;
    } else {
      i++;
    }
  }
  return runs;
}

/** Where a passage can begin or end: the points `a..b` of one stationary run,
 * or of several back to back. Runs back to back are a vessel creeping along
 * too slowly to count as under way, or swinging wider than STOP_RADIUS_M at
 * anchor, so they make one stop rather than a passage between each pair. A
 * passage leaves from the centre of the stop's `last` run and arrives at the
 * centre of its `first`, where the vessel stopped creeping. */
interface Stop {
  a: number;
  b: number;
  first: [number, number];
  last: [number, number];
}

function stopsOf(pts: TimedPoint[], minMs: number): Stop[] {
  const stops: Stop[] = [];
  for (const run of stationaryRuns(pts, minMs)) {
    const prev = stops[stops.length - 1];
    if (prev && prev.b + 1 === run[0]) {
      prev.b = run[1];
      prev.last = run;
    } else {
      stops.push({ a: run[0], b: run[1], first: run, last: run });
    }
  }
  return stops;
}

/** Where the vessel lay during a run: the mean of its positions, which for a
 * boat at anchor is near the anchor. */
function centre(pts: TimedPoint[], [a, b]: [number, number]): Position {
  const o = pts[a].p;
  let lon = 0;
  let lat = 0;
  for (let i = a; i <= b; i++) {
    lon += deltaLon(o[0], pts[i].p[0]);
    lat += pts[i].p[1] - o[1];
  }
  const n = b - a + 1;
  return [deltaLon(0, o[0] + lon / n), o[1] + lat / n];
}

/** The positions of `pts[a..b]`, each pause drawn into its centre. */
function collapsePauses(pts: TimedPoint[], a: number, b: number): Position[] {
  if (b < a) {
    return [];
  }
  const part = pts.slice(a, b + 1);
  const out: Position[] = [];
  let i = 0;
  for (const run of stationaryRuns(part, PAUSE_MS)) {
    for (; i < run[0]; i++) {
      out.push(part[i].p);
    }
    out.push(centre(part, run));
    i = run[1] + 1;
  }
  for (; i < part.length; i++) {
    out.push(part[i].p);
  }
  return out;
}

/** `path` thinned to the points that keep it within ROUTE_TOLERANCE_M of
 * itself (Douglas-Peucker, in metres). */
function simplifyM(path: Position[]): Position[] {
  const xy = path.map((p) => offsetM(path[0], p));
  // SimplifyAP returns the very points it keeps, so each maps back by identity
  const index = new Map(xy.map((q, i) => [q, i]));
  return SimplifyAP(xy, ROUTE_TOLERANCE_M, true).map((q) => path[index.get(q)]);
}

/** The passage through a tapped point, as indices into the timed points. */
interface Passage {
  pts: TimedPoint[];
  start: number;
  end: number;
  startStop?: Stop;
  endStop?: Stop;
}

/** The passage of `track` that passes `at`, as {@link trackSectionRoute}
 * describes it. */
function findPassage(
  track: TimedTrack,
  at: Position,
  stopMs: number
): Passage | undefined {
  const pts: TimedPoint[] = [];
  const lines: Position[][] = [];
  track.lines.forEach((line, i) => {
    const timed: Position[] = [];
    line.forEach((p, j) => {
      const t = Date.parse(track.times[i]?.[j] ?? '');
      if (Number.isFinite(t)) {
        timed.push(p);
        pts.push({ p, t, line: lines.length });
      }
    });
    if (timed.length > 0) {
      lines.push(timed);
    }
  });
  if (pts.length < 2) {
    return undefined;
  }

  // the tapped point, as an index into pts
  let k = 0;
  let bestD = Infinity;
  let offset = 0;
  lines.forEach((line) => {
    const near = nearestOnLine(line, at);
    if (near && near.d < bestD) {
      bestD = near.d;
      k = offset + Math.min(near.index + Math.round(near.f), line.length - 1);
    }
    offset += line.length;
  });

  const stops = stopsOf(pts, stopMs);
  const stopAt = (i: number) => stops.find(({ a, b }) => a <= i && i <= b);
  let onStop = stopAt(k);
  if (onStop && onStop.b === pts.length - 1 && onStop.a > 0) {
    // no passage leaves the stop the track ends at: take the one arriving
    k = onStop.a - 1;
    onStop = stopAt(k);
  }
  let startStop: Stop | undefined =
    onStop ?? stops.filter(({ b }) => b < k).pop();
  let endStop: Stop | undefined = stops.find(
    ({ a }) => a > (onStop ? onStop.b : k)
  );
  let start = startStop ? startStop.b + 1 : 0;
  let end = endStop ? endStop.a - 1 : pts.length - 1;

  // a gap in the recording that the vessel moved across: what it did in
  // between is unknown, so the passage stops short of it. A gap is where the
  // recording broke into a new line, or, within one line (the local trail is
  // a single one), went quiet for longer than a stretch of it is joined
  // across. Only gaps between the stops count; a tap on a stop stands for
  // the start of the passage.
  const tapped = Math.min(Math.max(k, start), end);
  for (let g = Math.max(start, 1); g <= end + 1 && g < pts.length; g++) {
    if (
      (pts[g].line !== pts[g - 1].line ||
        pts[g].t - pts[g - 1].t > TRAIL_JOIN_GAP_MS) &&
      distM(pts[g - 1].p, pts[g].p) > STOP_RADIUS_M
    ) {
      if (g <= tapped) {
        start = g;
        startStop = undefined;
      } else {
        end = g - 1;
        endStop = undefined;
        break;
      }
    }
  }

  return { pts, start, end, startStop, endStop };
}

/**
 * The route along the passage of `track` that passes `at`: from the stop
 * before it to the stop after it, in the order it was recorded. A stop is a
 * place the vessel stayed put for `stopMs` (OWN_STOP_MS for the own vessel,
 * OTHER_STOP_MS for another) and the route starts or ends at its centre.
 * Without a stop on one side, the passage reaches the end of the track there,
 * or a gap in the recording that the vessel moved across. A tap on a stop
 * gives the passage leaving it, or the one arriving where the track ends
 * there. Only points with a recording time count.
 * Undefined when the passage holds fewer than two points.
 */
export function trackSectionRoute(
  track: TimedTrack,
  at: Position,
  stopMs: number
): Position[] | undefined {
  const passage = findPassage(track, at, stopMs);
  if (!passage) {
    return undefined;
  }
  const { pts, start, end, startStop, endStop } = passage;
  const path = [
    ...(startStop ? [centre(pts, startStop.last)] : []),
    ...collapsePauses(pts, start, end),
    ...(endStop ? [centre(pts, endStop.first)] : [])
  ];
  return path.length < 2 ? undefined : simplifyM(path);
}

/** When the passage {@link trackSectionRoute} makes a route of began and
 * ended, its stops either side included, in ms since the epoch. */
export function trackSectionSpan(
  track: TimedTrack,
  at: Position,
  stopMs: number
): { from: number; to: number } | undefined {
  const passage = findPassage(track, at, stopMs);
  if (!passage) {
    return undefined;
  }
  const { pts, start, end, startStop, endStop } = passage;
  return {
    from: pts[startStop ? startStop.last[0] : start].t,
    to: pts[endStop ? endStop.first[1] : end].t
  };
}
