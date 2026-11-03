/**
 * The wind field behind the animated wind-flow layer: a regular lon/lat grid
 * of wind vectors covering the view, sampled anywhere by bilinear
 * interpolation, plus the colour scale used to shade it.
 */

/** Grid spacings, in degrees. Each is a multiple of the one before, so the
 *  nodes of a coarse grid are also nodes of every finer one: zooming in
 *  reuses the cached nodes instead of asking for new ones. 0.25° is the
 *  resolution of the global models (GFS, ECMWF) behind the data. */
const GRID_STEPS = [0.25, 0.5, 1, 2, 4, 8, 16];

/** Where Web Mercator stops, atan(sinh(π)); nodes past it are never drawn. */
const MAX_LATITUDE = 85.0511287798;

const EARTH_RADIUS = 6378137;
const DEG = 180 / Math.PI;

/** A regular grid of nodes, `lon0`/`lat0` being its south-west node. Its
 *  longitudes are in render space: they continue past ±180 when the view
 *  shows another world copy, so they line up with what is on screen. */
export interface WindGrid {
  lon0: number;
  lat0: number;
  step: number;
  cols: number;
  rows: number;
}

export interface WindGridNode {
  latitude: number;
  /** Normalised to [-180, 180): what is sent to a data source. */
  longitude: number;
}

/** The grid covering a projected (EPSG:3857) view extent, with one node of
 *  margin on every side so the field is defined right up to the edges.
 *  Nodes are snapped to multiples of the step, so panning keeps the same
 *  nodes. `null` for an empty extent. */
export function windGridFor(
  extent: number[],
  maxColumns = 16
): WindGrid | null {
  const [minX, minY, maxX, maxY] = extent;
  if (!(maxX > minX) || !(maxY > minY)) {
    return null;
  }
  const west = mercatorXToLon(minX);
  const east = mercatorXToLon(maxX);
  const south = Math.max(-MAX_LATITUDE, mercatorYToLat(minY));
  const north = Math.min(MAX_LATITUDE, mercatorYToLat(maxY));
  if (!(north > south)) {
    return null;
  }

  const span = Math.max(east - west, north - south);
  const step =
    GRID_STEPS.find((s) => span / s <= maxColumns) ??
    GRID_STEPS[GRID_STEPS.length - 1];

  const lon0 = Math.floor(west / step) * step - step;
  const lon1 = Math.ceil(east / step) * step + step;
  const lat0 = Math.max(-90, Math.floor(south / step) * step - step);
  const lat1 = Math.min(90, Math.ceil(north / step) * step + step);
  return {
    lon0,
    lat0,
    step,
    cols: Math.round((lon1 - lon0) / step) + 1,
    rows: Math.round((lat1 - lat0) / step) + 1
  };
}

/** The grid's nodes, row by row from the south-west corner, in data space. */
export function windGridNodes(grid: WindGrid): WindGridNode[] {
  const nodes: WindGridNode[] = [];
  for (let row = 0; row < grid.rows; row++) {
    const latitude = round(grid.lat0 + row * grid.step);
    for (let col = 0; col < grid.cols; col++) {
      nodes.push({
        latitude,
        longitude: round(normaliseLon(grid.lon0 + col * grid.step))
      });
    }
  }
  return nodes;
}

/** Wind as reported (speed in m/s, direction it blows *from* in degrees) to
 *  the vector it flows along: `u` towards the east, `v` towards the north. */
export function windVector(
  speed: number,
  fromDegrees: number
): [number, number] {
  const a = fromDegrees / DEG;
  return [-speed * Math.sin(a), -speed * Math.cos(a)];
}

export class WindField {
  private readonly u: Float32Array;
  private readonly v: Float32Array;

  /** `values` lists one entry per node in `windGridNodes` order; `null` for a
   *  node with no data, which leaves the cells around it undefined. */
  constructor(
    readonly grid: WindGrid,
    values: ReadonlyArray<{ speed: number; direction: number } | null>
  ) {
    const count = grid.cols * grid.rows;
    this.u = new Float32Array(count).fill(NaN);
    this.v = new Float32Array(count).fill(NaN);
    for (let i = 0; i < count && i < values.length; i++) {
      const value = values[i];
      if (value) {
        [this.u[i], this.v[i]] = windVector(value.speed, value.direction);
      }
    }
  }

  /** The interpolated wind at a render-space position, written to `out` as
   *  `[u, v]` in m/s. Returns false outside the grid or next to a node
   *  without data. Takes an output array so it allocates nothing: it runs
   *  for every particle on every frame. */
  sample(lon: number, lat: number, out: number[]): boolean {
    const { lon0, lat0, step, cols, rows } = this.grid;
    const fx = (lon - lon0) / step;
    const fy = (lat - lat0) / step;
    const i = Math.floor(fx);
    const j = Math.floor(fy);
    if (i < 0 || j < 0 || i >= cols - 1 || j >= rows - 1) {
      return false;
    }
    const tx = fx - i;
    const ty = fy - j;
    let u = bicubic(this.u, cols, rows, i, j, tx, ty);
    let v = bicubic(this.v, cols, rows, i, j, tx, ty);
    if (Number.isNaN(u) || Number.isNaN(v)) {
      // A missing node further out: fall back to the four around the point.
      u = bilinear(this.u, cols, i, j, tx, ty);
      v = bilinear(this.v, cols, i, j, tx, ty);
      if (Number.isNaN(u) || Number.isNaN(v)) {
        return false;
      }
    }
    out[0] = u;
    out[1] = v;
    return true;
  }

  /** The same as `sample`, from a projected (EPSG:3857) coordinate. */
  sampleAt(x: number, y: number, out: number[]): boolean {
    return this.sample(mercatorXToLon(x), mercatorYToLat(y), out);
  }
}

/** Colour stops of the speed scale, in m/s. */
export const WIND_COLOR_STOPS: ReadonlyArray<
  readonly [number, readonly [number, number, number]]
> = [
  [0, [84, 103, 171]],
  [2.5, [62, 135, 196]],
  [5, [56, 174, 186]],
  [7.5, [72, 190, 132]],
  [10, [137, 204, 82]],
  [12.5, [222, 214, 70]],
  [15, [240, 168, 58]],
  [18, [232, 108, 56]],
  [21, [212, 60, 80]],
  [25, [176, 42, 128]],
  [30, [122, 50, 160]],
  [36, [208, 196, 230]]
];

/** The top of the colour scale, in m/s. */
export const WIND_COLOR_MAX = WIND_COLOR_STOPS[WIND_COLOR_STOPS.length - 1][0];

/** The colour of a wind speed (m/s) as `[r, g, b]`, written to `out`. */
export function windColor(speed: number, out: number[]): number[] {
  const stops = WIND_COLOR_STOPS;
  if (!(speed > stops[0][0])) {
    [out[0], out[1], out[2]] = stops[0][1];
    return out;
  }
  for (let i = 1; i < stops.length; i++) {
    const [s1, c1] = stops[i];
    if (speed <= s1) {
      const [s0, c0] = stops[i - 1];
      const t = (speed - s0) / (s1 - s0);
      out[0] = Math.round(c0[0] + (c1[0] - c0[0]) * t);
      out[1] = Math.round(c0[1] + (c1[1] - c0[1]) * t);
      out[2] = Math.round(c0[2] + (c1[2] - c0[2]) * t);
      return out;
    }
  }
  [out[0], out[1], out[2]] = stops[stops.length - 1][1];
  return out;
}

export function mercatorXToLon(x: number) {
  return (x / EARTH_RADIUS) * DEG;
}

export function mercatorYToLat(y: number) {
  return Math.atan(Math.sinh(y / EARTH_RADIUS)) * DEG;
}

/** Catmull-Rom interpolation over the 4×4 nodes around a cell, the edge
 *  nodes repeated at the border of the grid, and held within the cell's
 *  corners. A grid spaced a few degrees apart is coarse on screen: bilinear
 *  interpolation shows it as diamonds, where this curve stays smooth across
 *  cells. */
function bicubic(
  a: Float32Array,
  cols: number,
  rows: number,
  i: number,
  j: number,
  tx: number,
  ty: number
) {
  const wx = catmullRom(tx, WX);
  const wy = catmullRom(ty, WY);
  const k = j * cols + i;
  const lo = Math.min(a[k], a[k + 1], a[k + cols], a[k + cols + 1]);
  const hi = Math.max(a[k], a[k + 1], a[k + cols], a[k + cols + 1]);
  let sum = 0;
  for (let n = 0; n < 4; n++) {
    const row = Math.min(rows - 1, Math.max(0, j - 1 + n)) * cols;
    let line = 0;
    for (let m = 0; m < 4; m++) {
      line += wx[m] * a[row + Math.min(cols - 1, Math.max(0, i - 1 + m))];
    }
    sum += wy[n] * line;
  }
  // The curve overshoots next to a sharp change: between two calm nodes
  // beside a strong one it would even reverse the wind. Keep it within the
  // cell's own corners.
  return Math.min(hi, Math.max(lo, sum));
}

// Weight buffers reused by every sample: it runs per particle per frame.
const WX = [0, 0, 0, 0];
const WY = [0, 0, 0, 0];

/** The Catmull-Rom weights of the four nodes, into `w`, for a position `t`
 *  in [0, 1) between the middle two. */
function catmullRom(t: number, w: number[]) {
  const t2 = t * t;
  const t3 = t2 * t;
  w[0] = (-t3 + 2 * t2 - t) / 2;
  w[1] = (3 * t3 - 5 * t2 + 2) / 2;
  w[2] = (-3 * t3 + 4 * t2 + t) / 2;
  w[3] = (t3 - t2) / 2;
  return w;
}

function bilinear(
  a: Float32Array,
  cols: number,
  i: number,
  j: number,
  tx: number,
  ty: number
) {
  const k = j * cols + i;
  const south = a[k] + (a[k + 1] - a[k]) * tx;
  const north = a[k + cols] + (a[k + cols + 1] - a[k + cols]) * tx;
  return south + (north - south) * ty;
}

function normaliseLon(lon: number) {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

function round(n: number) {
  return Number(n.toFixed(4));
}
