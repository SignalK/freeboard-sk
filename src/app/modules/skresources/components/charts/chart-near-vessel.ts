import { FBChart, FBCharts, Position } from 'src/app/types';
import { GeoUtils } from 'src/app/lib/geoutils';

/** Longitude difference `b - a` in [-180, 180). */
const deltaLon = (a: number, b: number) =>
  ((((b - a) % 360) + 540) % 360) - 180;

/** The chart's bounds, [west, south, east, north], when it declares them. A
 *  box whose west edge lies east of its east edge crosses the antimeridian. */
function boundsOf(chart: FBChart): number[] | undefined {
  const b = chart[1].bounds;
  return Array.isArray(b) && b.length === 4 && b.every(Number.isFinite)
    ? b
    : undefined;
}

const withinLon = (lon: number, w: number, e: number) =>
  w <= e ? lon >= w && lon <= e : lon >= w || lon <= e;

/** Area of a bounds box in square degrees of latitude, for ranking only. */
function area([w, s, e, n]: number[]): number {
  const width = w <= e ? e - w : e - w + 360;
  return width * Math.cos((((s + n) / 2) * Math.PI) / 180) * (n - s);
}

/** Metres from `p` to the nearest point of a bounds box. */
function distanceTo(p: Position, [w, s, e, n]: number[]): number {
  const lat = Math.min(Math.max(p[1], s), n);
  const lon = withinLon(p[0], w, e)
    ? p[0]
    : Math.abs(deltaLon(p[0], w)) <= Math.abs(deltaLon(p[0], e))
      ? w
      : e;
  return GeoUtils.distanceTo(p, [lon, lat]);
}

/**
 * Charts ordered for a vessel at `position`: those whose bounds hold it
 * first, smallest area first (the approach or harbour chart before the
 * passage chart, and an overlay of the whole world last of them); then the
 * rest, nearest first; then charts without bounds. Charts that rank the same,
 * such as several sources for one area, keep their order in `charts`, and
 * without a usable position (e.g. an unset fixed position) all of them do.
 */
export function chartsNearPosition(
  charts: FBCharts,
  position: Position
): FBCharts {
  if (!Number.isFinite(position?.[0]) || !Number.isFinite(position?.[1])) {
    return charts.slice();
  }
  const rank = (chart: FBChart): [number, number] => {
    const b = boundsOf(chart);
    if (!b) {
      return [2, 0];
    }
    const [w, s, e, n] = b;
    return position[1] >= s && position[1] <= n && withinLon(position[0], w, e)
      ? [0, area(b)]
      : [1, distanceTo(position, b)];
  };
  return charts
    .map((chart) => ({ chart, rank: rank(chart) }))
    .sort((a, b) => a.rank[0] - b.rank[0] || a.rank[1] - b.rank[1])
    .map((r) => r.chart);
}
