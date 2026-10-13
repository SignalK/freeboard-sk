/** Live depth layer: pure helpers turning depth-at-position samples (v2 Track
 * API `properties`) into a safe, drawable aggregate.
 *
 * The overriding rule is safety: a rendered mark must never display deeper than
 * the shallowest sample it covers. Every aggregate therefore takes the
 * MINIMUM depth — never a mean, which would let a shoal vanish into deeper
 * water — and the layer draws shallower marks over deeper ones. Samples at or
 * below a shoal threshold are returned individually so a critical minimum is
 * never smeared to a cell centre.
 *
 * Pure functions (no Angular, no map) so they can be unit tested directly.
 */

import { Position } from 'src/app/types';
import { queryString } from './track-source';

/** A recorded depth at a position, depth in metres (canonical Signal K). */
export interface DepthSample {
  lon: number;
  lat: number;
  depth: number;
}

/** One grid cell of the aggregate. */
export interface DepthCell {
  /** Grid indices (Web Mercator cell coordinates), for neighbour lookup. */
  ix: number;
  iy: number;
  /** Cell centre (mean of the samples in it), lon/lat. */
  lon: number;
  lat: number;
  /** Shallowest depth among the cell's samples, in metres. */
  depth: number;
  /** How many samples fell in the cell. */
  count: number;
}

/** One drawn circle: a group of adjacent cells at a similar depth, merged. */
export interface DepthCluster {
  /** Circle centre (weighted centroid), lon/lat. */
  lon: number;
  lat: number;
  /** Shallowest depth in the group, in metres. */
  depth: number;
  /** Samples the group covers. */
  count: number;
  /** Spatial radius of the group, in metres (Web Mercator). */
  radiusMetres: number;
}

/** Depth (metres) the shading runs to by default: at this depth and beyond the
 * layer draws nothing, so the chart shows through. */
export const DEFAULT_SHADE_LIMIT_M = 10;

/** Default shoal threshold (metres): samples at or below this are marked
 * individually. Matches the S-57 renderer's default safety depth. */
export const DEFAULT_SAFETY_DEPTH_M = 3;

const EARTH_RADIUS = 6378137;
const MERCATOR_MAX_LAT = 85.05112878;
const RAD = Math.PI / 180;

/** Web Mercator easting (metres) of a longitude. */
function mercX(lon: number): number {
  return lon * RAD * EARTH_RADIUS;
}

/** Web Mercator northing (metres) of a latitude, clamped to the projection. */
function mercY(lat: number): number {
  const c = Math.max(-MERCATOR_MAX_LAT, Math.min(MERCATOR_MAX_LAT, lat));
  return EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + (c * RAD) / 2));
}

/** Longitude of a Web Mercator easting. */
function lonOf(x: number): number {
  return x / (RAD * EARTH_RADIUS);
}

/** Latitude of a Web Mercator northing. */
function latOf(y: number): number {
  return (2 * Math.atan(Math.exp(y / EARTH_RADIUS)) - Math.PI / 2) / RAD;
}

/** Depth tint, Navionics-like: a saturated azure at the surface, fading
 * through pale blue to white at the shade limit. Stops are `[t, r, g, b]` with
 * `t` the fraction from the surface (0) to the shade limit (1). */
const SHADE_RAMP: ReadonlyArray<readonly [number, number, number, number]> = [
  [0, 26, 132, 216],
  [0.3, 96, 178, 232],
  [0.55, 156, 209, 240],
  [0.78, 205, 232, 248],
  [1, 255, 255, 255]
];

/** Isobaths drawn between the surface and the shade limit. */
export const SHADE_CONTOUR_LEVELS = 6;

/** RGB at fraction `t` (0 = surface, 1 = the shade limit), sampling
 * {@link SHADE_RAMP}. */
export function shadeColor(t: number): [number, number, number] {
  const c = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0));
  let lo = SHADE_RAMP[0];
  let hi = SHADE_RAMP[SHADE_RAMP.length - 1];
  for (let i = 0; i < SHADE_RAMP.length - 1; i++) {
    if (c >= SHADE_RAMP[i][0] && c <= SHADE_RAMP[i + 1][0]) {
      lo = SHADE_RAMP[i];
      hi = SHADE_RAMP[i + 1];
      break;
    }
  }
  const span = hi[0] - lo[0];
  const f = span > 0 ? (c - lo[0]) / span : 0;
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * f);
  return [lerp(lo[1], hi[1]), lerp(lo[2], hi[2]), lerp(lo[3], hi[3])];
}

/** RGB for a depth: azure at the surface, white at `shadeLimit` and beyond. */
export function depthColor(
  depth: number,
  shadeLimit: number
): [number, number, number] {
  const limit = shadeLimit > 0 ? shadeLimit : DEFAULT_SHADE_LIMIT_M;
  return shadeColor(depth / limit);
}

/** {@link depthColor} as a CSS `rgb()`/`rgba()` string. */
export function depthCss(depth: number, shadeLimit: number, alpha = 1): string {
  const [r, g, b] = depthColor(depth, shadeLimit);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Aggregate samples into a Web Mercator grid, keeping the SHALLOWEST depth in
 * each cell. `maxDepthMetres` drops samples deeper than the display range
 * (they can never form a cell's minimum anyway); a sample that idles in the
 * grid alone still carries its real depth. Samples with a non-finite or
 * negative depth are ignored — a negative reading is not water. */
export function aggregateMinDepth(
  samples: readonly DepthSample[],
  cellSizeMetres: number,
  maxDepthMetres = Infinity
): DepthCell[] {
  if (!(cellSizeMetres > 0)) {
    return [];
  }
  const cells = new Map<
    string,
    {
      ix: number;
      iy: number;
      sx: number;
      sy: number;
      n: number;
      depth: number;
    }
  >();
  for (const s of samples) {
    if (
      !Number.isFinite(s.lon) ||
      !Number.isFinite(s.lat) ||
      !Number.isFinite(s.depth) ||
      s.depth < 0 ||
      s.depth > maxDepthMetres
    ) {
      continue;
    }
    const x = mercX(s.lon);
    const y = mercY(s.lat);
    const ix = Math.floor(x / cellSizeMetres);
    const iy = Math.floor(y / cellSizeMetres);
    const key = `${ix},${iy}`;
    const c = cells.get(key);
    if (c) {
      c.sx += x;
      c.sy += y;
      c.n++;
      if (s.depth < c.depth) {
        c.depth = s.depth;
      }
    } else {
      cells.set(key, { ix, iy, sx: x, sy: y, n: 1, depth: s.depth });
    }
  }
  const out: DepthCell[] = [];
  cells.forEach((c) => {
    out.push({
      ix: c.ix,
      iy: c.iy,
      lon: lonOf(c.sx / c.n),
      lat: latOf(c.sy / c.n),
      depth: c.depth,
      count: c.n
    });
  });
  return out;
}

/** Cells ordered deepest first, so a shallow cell drawn later paints over a
 * deeper one that overlaps it — a shoal is never occluded. */
export function orderDeepToShallow<T extends { depth: number }>(
  cells: readonly T[]
): T[] {
  return [...cells].sort((a, b) => b.depth - a.depth);
}

/** Samples at or below `safetyDepthMetres`, drawn individually on top of the
 * aggregate so a critical minimum keeps its exact position and depth. */
export function selectShoals(
  samples: readonly DepthSample[],
  safetyDepthMetres: number
): DepthSample[] {
  return samples.filter(
    (s) =>
      Number.isFinite(s.depth) && s.depth >= 0 && s.depth <= safetyDepthMetres
  );
}

/** Share of the anchor's depth two samples may differ by and still merge.
 * Depth readings are noisy, so exact equality merges almost nothing. */
export const DEFAULT_MERGE_TOLERANCE = 0.15;

/** How far a merged group may grow from its shallowest cell, in cells. Bounds
 * a circle's size so a uniform-depth passage does not become one giant blob. */
export const MERGE_MAX_RADIUS_CELLS = 2.5;

/** Merge adjacent grid cells whose depths are within `tolerance` of the
 * group's shallowest cell, into one circle per group. The shallowest cell is
 * the anchor and comparisons are always against the anchor (not the previous
 * neighbour), so depths cannot chain up to merge a wide range; and a group is
 * not allowed to grow beyond `maxRadiusCells` from its anchor, so a long
 * uniform run becomes a row of modest circles rather than one huge one. */
export function mergeDepthCells(
  cells: readonly DepthCell[],
  cellSizeMetres: number,
  toleranceOrMaxRadius: number = DEFAULT_MERGE_TOLERANCE,
  maxRadiusCells: number = MERGE_MAX_RADIUS_CELLS
): DepthCluster[] {
  if (cells.length === 0 || !(cellSizeMetres > 0)) {
    return [];
  }
  const tolerance = Math.max(0, toleranceOrMaxRadius);
  const maxRadius = Math.max(cellSizeMetres, maxRadiusCells * cellSizeMetres);
  const byKey = new Map<string, DepthCell>();
  cells.forEach((c) => byKey.set(`${c.ix},${c.iy}`, c));
  const visited = new Set<string>();
  const ordered = [...cells].sort((a, b) => a.depth - b.depth);
  const neighbours = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1]
  ];
  const clusters: DepthCluster[] = [];

  for (const start of ordered) {
    if (visited.has(`${start.ix},${start.iy}`)) {
      continue;
    }
    const anchor = start.depth;
    const ax = mercX(start.lon);
    const ay = mercY(start.lat);
    const members: DepthCell[] = [];
    const queue: DepthCell[] = [start];
    visited.add(`${start.ix},${start.iy}`);

    while (queue.length) {
      const cell = queue.pop();
      members.push(cell);
      for (const [dx, dy] of neighbours) {
        const key = `${cell.ix + dx},${cell.iy + dy}`;
        const nb = byKey.get(key);
        if (!nb || visited.has(key)) {
          continue;
        }
        // anchor-relative, not neighbour-to-neighbour, so depth cannot drift
        if (nb.depth - anchor > Math.max(tolerance * anchor, 0.1)) {
          continue;
        }
        if (Math.hypot(mercX(nb.lon) - ax, mercY(nb.lat) - ay) > maxRadius) {
          continue;
        }
        visited.add(key);
        queue.push(nb);
      }
    }

    let cx = 0;
    let cy = 0;
    let total = 0;
    let minDepth = Infinity;
    members.forEach((m) => {
      cx += mercX(m.lon) * m.count;
      cy += mercY(m.lat) * m.count;
      total += m.count;
      if (m.depth < minDepth) {
        minDepth = m.depth;
      }
    });
    cx /= total;
    cy /= total;
    let radius = 0;
    members.forEach((m) => {
      radius = Math.max(
        radius,
        Math.hypot(mercX(m.lon) - cx, mercY(m.lat) - cy)
      );
    });
    clusters.push({
      lon: lonOf(cx),
      lat: latOf(cy),
      depth: minDepth,
      count: total,
      radiusMetres: Math.min(maxRadius, radius + cellSizeMetres / 2)
    });
  }
  return clusters;
}

/** Aggregate, merge similar-depth neighbours and order deep → shallow, ready
 * to draw. */
export function depthClusters(
  samples: readonly DepthSample[],
  cellSizeMetres: number,
  tolerance: number = DEFAULT_MERGE_TOLERANCE,
  maxDepthMetres = Infinity,
  maxRadiusCells: number = MERGE_MAX_RADIUS_CELLS
): DepthCluster[] {
  return orderDeepToShallow(
    mergeDepthCells(
      aggregateMinDepth(samples, cellSizeMetres, maxDepthMetres),
      cellSizeMetres,
      tolerance,
      maxRadiusCells
    )
  );
}

// ******** History API ********
//
// The History API supplies the depth series (position and depth together) over
// a recent time window; the Track API is not used, as on servers whose track
// provider does not co-record depth it costs seconds per query just to find a
// time span. Each depth sample carries its own position.

/** Aggregation requested for depth in the History API: the SHALLOWEST sample.
 * At native resolution (no `resolution`) each bucket is one recorded sample, so
 * this is an identity; it only matters if a provider buckets unasked, where it
 * keeps the shallowest value rather than an average. */
export const DEPTH_HISTORY_METHOD = 'min';

/** Query for the depth series with the position of each sample. An explicit
 * `resolution` (seconds, fractional allowed) is honoured by the provider; when
 * it is omitted most providers auto-downsample to a few hundred points, so the
 * caller should always pass the finest interval it wants. `context` defaults to
 * the server's own vessel. */
export function historyValuesQuery(opts: {
  depthPath: string;
  from: number;
  to: number;
  resolution?: number;
  context?: string;
}): string {
  return queryString({
    context: opts.context,
    paths: `navigation.position,${opts.depthPath}:${DEPTH_HISTORY_METHOD},navigation.headingTrue:average`,
    from: new Date(opts.from).toISOString(),
    to: new Date(opts.to).toISOString(),
    resolution: opts.resolution
  });
}

/** One depth sample from the History API, with its recorded position. */
export interface DepthHistoryRow {
  time: number;
  depth: number;
  position?: Position;
  /** True heading (radians) at the sample, to place it at the transducer. */
  heading?: number;
}

/** A `[lon, lat]` from either array or `{latitude, longitude}` form. */
function toPosition(value: unknown): Position | undefined {
  if (Array.isArray(value) && value.length >= 2) {
    const [lon, lat] = value as number[];
    if (Number.isFinite(lon) && Number.isFinite(lat)) {
      return [lon, lat];
    }
    return undefined;
  }
  if (value && typeof value === 'object') {
    const v = value as { latitude?: unknown; longitude?: unknown };
    if (typeof v.latitude === 'number' && typeof v.longitude === 'number') {
      return [v.longitude, v.latitude];
    }
  }
  return undefined;
}

/** Depth rows from a History API `values` response, matched to `depthPath`.
 * The `position` column is attached when the response carried one; rows with a
 * null, non-number or negative depth are skipped. */
export function parseDepthSeries(
  result: unknown,
  depthPath: string
): DepthHistoryRow[] {
  const values = (result as { values?: Array<{ path?: string }> })?.values;
  const data = (result as { data?: unknown[] })?.data;
  if (!Array.isArray(values) || !Array.isArray(data)) {
    return [];
  }
  const depthCol = values.findIndex((v) => v?.path === depthPath);
  if (depthCol < 0) {
    return [];
  }
  const posCol = values.findIndex((v) => v?.path === 'navigation.position');
  const headingCol = values.findIndex(
    (v) => v?.path === 'navigation.headingTrue'
  );
  const rows: DepthHistoryRow[] = [];
  for (const row of data) {
    if (!Array.isArray(row)) {
      continue;
    }
    const time = Date.parse(String(row[0]));
    const depth = row[depthCol + 1];
    if (
      !Number.isFinite(time) ||
      typeof depth !== 'number' ||
      !Number.isFinite(depth) ||
      depth < 0
    ) {
      continue;
    }
    const rec: DepthHistoryRow = { time, depth };
    if (posCol >= 0) {
      const position = toPosition(row[posCol + 1]);
      if (position) {
        rec.position = position;
      }
    }
    if (headingCol >= 0) {
      const heading = row[headingCol + 1];
      if (typeof heading === 'number' && Number.isFinite(heading)) {
        rec.heading = heading;
      }
    }
    rows.push(rec);
  }
  return rows;
}
