/** Bathymetric surface from a GPS+depth track: a shallow-biased depth raster
 * and a min-pooled level-of-detail pyramid for a WebGL renderer.
 *
 * The data is one vessel's track, not a survey, so a cell is only filled where
 * a sounding is within `coverageCells`; gaps stay NaN (no coverage) rather than
 * being invented. Interpolation is Inverse Distance Weighting, biased toward
 * the shallowest sample in range by `shallowBias` (1 = never deeper than that
 * sample) so a smoothed surface can never overstate depth.
 *
 * Pure functions (no Angular, no WebGL) so they can be unit tested directly.
 */

import { DepthSample } from './live-depth';

/** A regular depth raster in EPSG:3857 metres. */
export interface DepthField {
  width: number;
  height: number;
  /** [minX, minY, maxX, maxY] in metres. */
  extent: [number, number, number, number];
  /** Depth per cell in metres, row-major; NaN means no coverage. */
  depth: Float32Array;
}

export interface BathymetryOptions {
  /** Target cell size in metres (the grid is built at about this size). */
  cellMetres: number;
  /** How far a sounding reaches, in cells. Beyond it a cell is uncovered. */
  coverageCells?: number;
  /** How far a sounding reaches, in metres, overriding `coverageCells`. Use
   * this to bridge the gaps between track samples (set it to about the sample
   * spacing) so the traversed ribbon is continuous rather than disconnected
   * dots. */
  coverageMetres?: number;
  /** Floor for the coverage radius, in metres. A sounding stands for at least
   * this area, so an anchored vessel's jittered positions (clusters a fraction
   * of a metre apart) render as one patch rather than dozens of specks. */
  coverageMinMetres?: number;
  /** Distance-weighting power (2 is the usual IDW choice). */
  power?: number;
  /** 0 = pure IDW, 1 = never deeper than the shallowest sample in range. */
  shallowBias?: number;
  /** Hard cap on either grid dimension, to bound memory and time. */
  maxCells?: number;
}

export const DEFAULT_COVERAGE_CELLS = 2;
/** Floor for the coverage radius, in metres (see `coverageMinMetres`). */
export const DEFAULT_COVERAGE_MIN_M = 2;
export const DEFAULT_IDW_POWER = 2;
export const DEFAULT_SHALLOW_BIAS = 0.5;
export const DEFAULT_MAX_CELLS = 1024;

const EARTH_RADIUS = 6378137;
const MERCATOR_MAX_LAT = 85.05112878;
const RAD = Math.PI / 180;

const mercX = (lon: number) => lon * RAD * EARTH_RADIUS;
const mercY = (lat: number) =>
  EARTH_RADIUS *
  Math.log(
    Math.tan(
      Math.PI / 4 +
        (Math.max(-MERCATOR_MAX_LAT, Math.min(MERCATOR_MAX_LAT, lat)) * RAD) / 2
    )
  );

/** Median distance (metres) between consecutive samples, in the order given
 * (assumed to be along-track). 0 with fewer than two samples. A robust measure
 * of the track's sample spacing, used to size a coverage radius that bridges
 * the gaps so the traversed ribbon is continuous. */
export function medianConsecutiveGap(
  samples: readonly { lon: number; lat: number }[]
): number {
  if (samples.length < 2) {
    return 0;
  }
  const gaps: number[] = [];
  for (let i = 1; i < samples.length; i++) {
    const ax = mercX(samples[i - 1].lon);
    const ay = mercY(samples[i - 1].lat);
    gaps.push(
      Math.hypot(mercX(samples[i].lon) - ax, mercY(samples[i].lat) - ay)
    );
  }
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)];
}

/** Build a depth raster over `extent` (EPSG:3857 `[minX,minY,maxX,maxY]`) from
 * the samples, or null when there is nothing to draw or the grid is unusable. */
export function buildDepthField(
  samples: readonly DepthSample[],
  extent: readonly number[],
  options: BathymetryOptions
): DepthField | null {
  const cellMetres = options.cellMetres;
  if (
    !(cellMetres > 0) ||
    extent.length !== 4 ||
    !extent.every((v) => Number.isFinite(v)) ||
    extent[2] <= extent[0] ||
    extent[3] <= extent[1]
  ) {
    return null;
  }
  const power = options.power ?? DEFAULT_IDW_POWER;
  const shallowBias = Math.max(
    0,
    Math.min(1, options.shallowBias ?? DEFAULT_SHALLOW_BIAS)
  );
  const maxCells = options.maxCells ?? DEFAULT_MAX_CELLS;

  const width = Math.min(
    maxCells,
    Math.ceil((extent[2] - extent[0]) / cellMetres)
  );
  const height = Math.min(
    maxCells,
    Math.ceil((extent[3] - extent[1]) / cellMetres)
  );
  if (width <= 0 || height <= 0) {
    return null;
  }
  // Re-derive the extent from the (possibly capped) grid so cells stay square.
  const minX = extent[0];
  const minY = extent[1];
  const gridExtent: [number, number, number, number] = [
    minX,
    minY,
    minX + width * cellMetres,
    minY + height * cellMetres
  ];

  const depth = new Float32Array(width * height).fill(NaN);
  const wsum = new Float32Array(width * height);
  const wdsum = new Float32Array(width * height);
  const minSeen = new Float32Array(width * height).fill(Infinity);

  const coverageRadius = Math.max(
    cellMetres,
    options.coverageMinMetres ?? DEFAULT_COVERAGE_MIN_M,
    options.coverageMetres ??
      (options.coverageCells ?? DEFAULT_COVERAGE_CELLS) * cellMetres
  );
  const coverage2 = coverageRadius * coverageRadius;
  // Bound the per-sample splat; a huge radius would make the build quadratic.
  const radiusCells = Math.min(64, Math.ceil(coverageRadius / cellMetres));

  for (const s of samples) {
    if (
      !Number.isFinite(s.lon) ||
      !Number.isFinite(s.lat) ||
      !Number.isFinite(s.depth) ||
      s.depth < 0
    ) {
      continue;
    }
    const sx = mercX(s.lon);
    const sy = mercY(s.lat);
    const cx = Math.floor((sx - minX) / cellMetres);
    const cy = Math.floor((sy - minY) / cellMetres);
    for (let dy = -radiusCells; dy <= radiusCells; dy++) {
      const gy = cy + dy;
      if (gy < 0 || gy >= height) {
        continue;
      }
      const cellCenterY = minY + (gy + 0.5) * cellMetres;
      const ddy = cellCenterY - sy;
      for (let dx = -radiusCells; dx <= radiusCells; dx++) {
        const gx = cx + dx;
        if (gx < 0 || gx >= width) {
          continue;
        }
        const cellCenterX = minX + (gx + 0.5) * cellMetres;
        const ddx = cellCenterX - sx;
        const dist2 = ddx * ddx + ddy * ddy;
        if (dist2 > coverage2) {
          continue;
        }
        const idx = gy * width + gx;
        const w = 1 / (Math.pow(dist2, power / 2) + 1e-6);
        wsum[idx] += w;
        wdsum[idx] += w * s.depth;
        if (s.depth < minSeen[idx]) {
          minSeen[idx] = s.depth;
        }
      }
    }
  }

  for (let i = 0; i < depth.length; i++) {
    const w = wsum[i];
    if (w <= 0) {
      continue;
    }
    const idw = wdsum[i] / w;
    const shallowest = minSeen[i];
    // bias toward the shallowest sample in range, never deeper
    depth[i] =
      (1 - shallowBias) * idw + shallowBias * Math.min(idw, shallowest);
  }

  return { width, height, extent: gridExtent, depth };
}
