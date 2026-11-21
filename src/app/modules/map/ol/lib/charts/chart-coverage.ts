import TileGrid from 'ol/tilegrid/TileGrid';

import { ChartCoverage } from 'src/app/types';

/*
 * A chart resource's `coverage` lists, per range of zooms, the Web Mercator
 * tiles the chart fills entirely, a parent standing for its four children
 * (signalk-charts-provider-simple's `docs/chart-coverage.md`). Drawn fully
 * opaque at such a zoom, the chart hides every chart beneath it there, so
 * their tiles need not be loaded.
 */

/** The chart layer property that holds the chart's `coverage`. */
export const CHART_COVERAGE = 'chartCoverage';

/** One coverage entry, its tiles ready to look up. */
export interface CoverageEntry {
  minzoom: number;
  maxzoom: number;
  tiles: Set<string>;
}

const TILE = /^\d{1,2}\/\d{1,10}\/\d{1,10}$/;
const HALF_WORLD = 20037508.342789244;

const indexes = new WeakMap<object, CoverageEntry[]>();

/**
 * The entries of a chart's `coverage`, from its resource; entries that are
 * not as the format describes are left out.
 */
export function coverageEntries(coverage: unknown): CoverageEntry[] {
  if (!Array.isArray(coverage)) {
    return [];
  }
  let entries = indexes.get(coverage);
  if (!entries) {
    entries = [];
    for (const entry of coverage as Partial<ChartCoverage[number]>[]) {
      if (
        typeof entry?.minzoom !== 'number' ||
        (entry.maxzoom !== undefined && typeof entry.maxzoom !== 'number') ||
        !Array.isArray(entry.tiles)
      ) {
        continue;
      }
      const tiles = entry.tiles.filter(
        (t): t is string => typeof t === 'string' && TILE.test(t)
      );
      if (tiles.length > 0) {
        entries.push({
          minzoom: entry.minzoom,
          maxzoom: entry.maxzoom ?? Infinity,
          tiles: new Set(tiles)
        });
      }
    }
    indexes.set(coverage, entries);
  }
  return entries;
}

/** The entries that hold while the chart shows its tiles of level `z`. */
export function entriesAt(
  entries: readonly CoverageEntry[],
  z: number
): CoverageEntry[] {
  return entries.filter((e) => z >= e.minzoom && z <= e.maxzoom);
}

/**
 * Whether XYZ tile `z/x/y` lies inside a tile one of `entries` lists: the
 * tile itself or one of its ancestors. `x` may count from a world copy.
 */
export function insideCoverage(
  entries: readonly CoverageEntry[],
  z: number,
  x: number,
  y: number
): boolean {
  const n = 2 ** z;
  const column = ((x % n) + n) % n;
  for (let level = z; level >= 0; level--) {
    const shift = z - level;
    const key = `${String(level)}/${String(column >> shift)}/${String(y >> shift)}`;
    if (entries.some((e) => e.tiles.has(key))) {
      return true;
    }
  }
  return false;
}

const xyzGrids = new WeakMap<TileGrid, boolean>();

/**
 * Whether a tile grid numbers its tiles as Web Mercator XYZ tiles, as
 * coverage does: the origin at the top left of the world, each level half
 * the resolution of the one before, one tile covering the world at level 0.
 */
export function isXyzGrid(grid: TileGrid): boolean {
  let known = xyzGrids.get(grid);
  if (known === undefined) {
    known = true;
    for (let z = grid.getMinZoom(); z <= grid.getMaxZoom() && known; z++) {
      const origin = grid.getOrigin(z);
      const size = grid.getTileSize(z);
      const width = Array.isArray(size) ? size[0] : size;
      const height = Array.isArray(size) ? size[1] : size;
      const span = (2 * HALF_WORLD) / 2 ** z;
      known =
        nearly(origin[0], -HALF_WORLD) &&
        nearly(origin[1], HALF_WORLD) &&
        nearly(grid.getResolution(z) * width, span) &&
        nearly(grid.getResolution(z) * height, span);
    }
    xyzGrids.set(grid, known);
  }
  return known;
}

function nearly(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.abs(b) * 1e-9 + 1e-6;
}
