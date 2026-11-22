import { Collection, Map as OlMap } from 'ol';
import { Coordinate } from 'ol/coordinate';
import { FrameState, MapOptions } from 'ol/Map';
import MapEvent from 'ol/MapEvent';
import TileGrid from 'ol/tilegrid/TileGrid';
import BaseLayer from 'ol/layer/Base';
import LayerGroup from 'ol/layer/Group';
import Layer, { inView } from 'ol/layer/Layer';
import TileJSON from 'ol/source/TileJSON';
import TileSource from 'ol/source/Tile';
import UrlTile from 'ol/source/UrlTile';
import { DROP } from 'ol/structs/PriorityQueue';
import Tile from 'ol/Tile';
import TileState from 'ol/TileState';
import { getUid } from 'ol/util';

import {
  CHART_COVERAGE,
  CoverageEntry,
  coverageEntries,
  entriesAt,
  insideCoverage,
  isXyzGrid
} from './charts/chart-coverage';

/*
 * OpenLayers queues the tiles of every layer together and loads them nearest
 * the centre first, whichever layer they belong to. With charts stacked, the
 * one on top then fills in no sooner than the ones it covers, and a fast
 * satellite layer underneath shows first on every zoom. Loading the upper
 * charts' tiles first makes the chart on top appear first; the ones below
 * still load, for where it has no coverage.
 *
 * Only charts the Signal K server serves are ranked, and only static ones.
 * Every other tile layer loads after them: an online layer, such as
 * OpenSeaMap's seamarks over the base chart, the online base map beneath or
 * a radar overlay, comes in over the uplink, and a time-varying one queues a
 * new set of tiles on every step, so either would hold up the local charts.
 * Local tiles come quickly, so the others lose little.
 */

/*
 * Where an S-57 chart drawn fully opaque declares that it fills a tile
 * (`coverage`), the tiles of the layers beneath it there are not loaded at
 * all: they are set empty instead of queued, which OpenLayers draws as
 * nothing. Once that no longer holds, because the chart is made translucent,
 * hidden, moved down or zoomed past its coverage, the source's tiles are
 * rebuilt so they load.
 */

/**
 * A tile's priority (lower loads sooner) is, from most to least weight: how
 * many zoom levels it lies coarser than the level its source shows now (so a
 * preloaded placeholder comes after every layer's current tiles), the rank of
 * its chart, then its distance from the centre in tile pixels, up to about
 * 3 400 on a 4K screen. OpenLayers ranks by the absolute resolution instead,
 * which puts a chart on a finer grid, or one not overzoomed, ahead of the
 * chart above it.
 */
export const LEVEL_STEP = 65536;
export const CHART_RANK_STEP = 4096;
export const MAX_CHART_RANK = 10;
/** Behind every chart, the capped ones too, and still inside a level. */
export const UNRANKED = MAX_CHART_RANK + 1;

/**
 * Set on a chart layer whose tiles change over time, through a time
 * dimension or an auto-refresh: it keeps queueing new ones, so it is not
 * ranked.
 */
export const CHART_VARIES = 'chartVaries';

const servedHere = new WeakMap<UrlTile, { key: string; here: boolean }>();

/**
 * Whether a tile source loads from the server that serves Freeboard, the
 * Signal K server, where the local charts are. A TileJSON source keeps its
 * templates in its TileJSON, and a pmtiles chart's carry a `pmtiles://`
 * prefix.
 */
export function isServedHere(source: TileSource): boolean {
  if (!(source instanceof UrlTile)) {
    return false;
  }
  // A TileJSON document comes from wherever its chart points; OpenLayers
  // takes `tiles` that are no array without complaint.
  const tiles =
    source instanceof TileJSON ? source.getTileJSON()?.tiles : undefined;
  const urls = source.getUrls() ?? (Array.isArray(tiles) ? tiles : undefined);
  const key = urls?.join('\n') ?? '';
  let known = servedHere.get(source);
  if (known?.key !== key) {
    const here =
      !!urls?.length &&
      urls.every((url) => {
        try {
          const target = new URL(
            url.replace(/^pmtiles:\/\//, ''),
            location.href
          );
          return target.origin === location.origin;
        } catch {
          return false;
        }
      });
    known = { key, here };
    servedHere.set(source, known);
  }
  return known.here;
}

/** A tile source shown on the map and, when it is a ranked chart, its rank. */
export interface ShownTileSource {
  source: TileSource;
  rank?: number;
  /** Its grid and the level it shows at a view resolution, kept for the frame. */
  shownAt?: { view: number; grid: TileGrid; z: number };
}

/** Whether a frame wanted at least one tile from a source. */
function wantsAny(tiles: Record<string, unknown> | undefined): boolean {
  for (const _ in tiles) {
    return true;
  }
  return false;
}

/**
 * The tile sources of the visible layers, keyed by uid (the key the tile
 * queue uses), with a rank from the top for the static charts served here.
 * Ranks follow OpenLayers' drawing order: by z-index, then later in the tree
 * on top, a layer without a z-index taking its group's. A source shown by two
 * layers takes the upper one's place. With `wanted`, the tiles a frame
 * wanted by source, only charts it wanted tiles from are ranked: one outside
 * its zoom range or extent would otherwise push those below it towards the
 * cap. OpenLayers lists a source in range but outside its extent with no
 * tiles.
 */
export function shownTileSources(
  group: LayerGroup,
  wanted?: Record<string, Record<string, unknown>>
): Map<string, ShownTileSource> {
  const shown: {
    key: string;
    source: TileSource;
    chart: boolean;
    zIndex: number;
    order: number;
  }[] = [];
  const walk = (children: Collection<BaseLayer>, inherited: number) =>
    children.forEach((layer) => {
      if (!layer.getVisible()) {
        return;
      }
      const zIndex = layer.getZIndex() ?? inherited;
      if (layer instanceof LayerGroup) {
        walk(layer.getLayers(), zIndex);
      } else if (layer instanceof Layer) {
        const source = layer.getRenderSource();
        if (source instanceof TileSource) {
          const key = getUid(source);
          const chart =
            !layer.get(CHART_VARIES) &&
            isServedHere(source) &&
            (!wanted || wantsAny(wanted[key]));
          shown.push({ key, source, chart, zIndex, order: shown.length });
        }
      }
    });
  walk(group.getLayers(), group.getZIndex() ?? 0);
  shown.sort((a, b) => b.zIndex - a.zIndex || b.order - a.order);
  const byKey = new Map<string, ShownTileSource>();
  let rank = 0;
  for (const { key, source, chart } of shown) {
    const known = byKey.get(key);
    if (!known) {
      byKey.set(
        key,
        chart ? { source, rank: Math.min(rank++, MAX_CHART_RANK) } : { source }
      );
    } else if (chart && known.rank === undefined) {
      known.rank = Math.min(rank++, MAX_CHART_RANK);
    }
  }
  return byKey;
}

/**
 * How many levels of `grid` a tile at `tileResolution` lies coarser than
 * level `shownZ`, the one its source shows now, chosen as the renderers
 * choose it (`getZForResolution` with the source's `zDirection`). Past its
 * finest level a source shows that one, overzoomed, so its tiles there count
 * as current. Counted by level, not by resolution, since a grid of its own
 * need not halve the resolution from one level to the next.
 */
export function levelsCoarser(
  grid: TileGrid,
  shownZ: number,
  tileResolution: number
): number {
  return Math.max(0, shownZ - grid.getZForResolution(tileResolution));
}

/** A tile's priority from its level, its chart's rank and its distance. */
export function topFirstTilePriority(
  level: number,
  rank: number,
  distance: number
): number {
  return (
    level * LEVEL_STEP + Math.min(rank, UNRANKED) * CHART_RANK_STEP + distance
  );
}

/** The coverage entries that hide tiles of a source now. */
export interface HiddenBeneath {
  source: UrlTile;
  entries: CoverageEntry[];
}

/**
 * For each tile source drawn beneath a chart with coverage that a frame
 * draws fully opaque, the coverage entries that hold at the level that chart
 * shows. Only URL tile sources on an XYZ grid can be matched to coverage
 * tiles and rebuilt once uncovered. A source shown by two layers takes the
 * upper one's place.
 */
export function hiddenBeneath(frame: FrameState): Map<string, HiddenBeneath> {
  const hidden = new Map<string, HiddenBeneath>();
  const seen = new Set<string>();
  // OpenLayers draws by z-index, the later of two equal layers on top.
  const states = frame.layerStatesArray
    .map((state, order) => ({ state, order }))
    .sort(
      (a, b) =>
        (b.state.zIndex ?? 0) - (a.state.zIndex ?? 0) || b.order - a.order
    );
  const above: CoverageEntry[] = [];
  for (const { state } of states) {
    if (!inView(state, frame.viewState)) {
      continue;
    }
    const source = state.layer.getRenderSource();
    if (!(source instanceof TileSource)) {
      continue;
    }
    const key = getUid(source);
    const grid = source.getTileGridForProjection(frame.viewState.projection);
    if (!seen.has(key)) {
      seen.add(key);
      if (above.length > 0 && source instanceof UrlTile && isXyzGrid(grid)) {
        hidden.set(key, { source, entries: [...above] });
      }
    }
    const coverage = coverageEntries(state.layer.get(CHART_COVERAGE));
    if (coverage.length > 0 && state.opacity === 1) {
      above.push(
        ...entriesAt(
          coverage,
          grid.getZForResolution(frame.viewState.resolution, source.zDirection)
        )
      );
    }
  }
  return hidden;
}

/** A map that loads the tiles of its upper charts first. */
export class TopFirstMap extends OlMap {
  private frame?: FrameState;
  private shown?: {
    group: LayerGroup;
    revision: number;
    frame?: FrameState;
    byKey: Map<string, ShownTileSource>;
  };
  /** The sources beneath coverage in the last frame. */
  private hidden = new Map<string, HiddenBeneath>();
  /** The sources with tiles set empty, and the coverage entries hiding them. */
  private emptied = new Map<string, HiddenBeneath>();
  private uncoveredCount = 0;

  constructor(options?: MapOptions) {
    super(options);
    // The tiles a frame wanted tell which charts draw now.
    this.on('postrender', (e: MapEvent) => {
      this.frame = e.frameState ?? undefined;
      // Checked on every frame: an empty tile is never queued again, so a
      // change that uncovers it may queue nothing.
      this.hidden = this.frame?.layerStatesArray
        ? hiddenBeneath(this.frame)
        : new Map();
      this.restoreUncovered(this.hidden);
    });
  }

  override getTilePriority(
    tile: Tile,
    tileSourceKey: string,
    tileCenter: Coordinate,
    tileResolution: number
  ): number {
    const priority = super.getTilePriority(
      tile,
      tileSourceKey,
      tileCenter,
      tileResolution
    );
    if (priority === DROP) {
      return priority;
    }
    // Worked out again for each frame, and when the layer tree changes in
    // between: a z-index, a layer added or a source swapped.
    const group = this.getLayerGroup();
    const revision = group.getRevision();
    const frame = this.frame;
    if (
      this.shown?.group !== group ||
      this.shown.revision !== revision ||
      this.shown.frame !== frame
    ) {
      this.shown = {
        group,
        revision,
        frame,
        byKey: shownTileSources(group, frame?.wantedTiles)
      };
    }
    const hides = this.hidden.get(tileSourceKey);
    if (
      hides &&
      tile.getState() === TileState.IDLE &&
      insideCoverage(
        hides.entries,
        tile.tileCoord[0],
        tile.tileCoord[1],
        tile.tileCoord[2]
      )
    ) {
      tile.setState(TileState.EMPTY);
      this.emptied.set(tileSourceKey, hides);
      return DROP;
    }
    const shown = this.shown.byKey.get(tileSourceKey);
    // The view as the frame being prioritised saw it: by the time the queue
    // is reprioritised after it, a gesture may have moved the view on.
    const view = this.getView();
    const viewResolution =
      frame?.viewState.resolution ?? view.getResolution() ?? tileResolution;
    let level: number;
    if (shown) {
      if (shown.shownAt?.view !== viewResolution) {
        const grid = shown.source.getTileGridForProjection(
          frame?.viewState.projection ?? view.getProjection()
        );
        shown.shownAt = {
          view: viewResolution,
          grid,
          z: grid.getZForResolution(viewResolution, shown.source.zDirection)
        };
      }
      level = levelsCoarser(
        shown.shownAt.grid,
        shown.shownAt.z,
        tileResolution
      );
    } else {
      level = Math.max(
        0,
        Math.round(Math.log2(tileResolution / viewResolution))
      );
    }
    // OpenLayers' priority less its resolution term is the distance.
    const distance = priority - 65536 * Math.log(tileResolution);
    return topFirstTilePriority(level, shown?.rank ?? UNRANKED, distance);
  }

  /**
   * Rebuild the tiles of each source whose tiles were set empty under a
   * coverage entry that no longer hides them. An empty tile stays empty, so
   * a new source key makes OpenLayers create fresh ones; tiles that loaded
   * keep their URL and come back from the browser's cache.
   */
  private restoreUncovered(hidden: Map<string, HiddenBeneath>) {
    let restored = false;
    for (const [sourceKey, emptied] of this.emptied) {
      const now = new Set(hidden.get(sourceKey)?.entries);
      if (emptied.entries.every((entry) => now.has(entry))) {
        continue;
      }
      const source = emptied.source;
      source.setTileUrlFunction(
        source.getTileUrlFunction(),
        `${source.getKey().replace(/#\d+$/, '')}#${String(++this.uncoveredCount)}`
      );
      this.emptied.delete(sourceKey);
      restored = true;
    }
    if (restored) {
      this.render();
    }
  }
}
