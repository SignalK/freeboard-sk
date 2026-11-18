import { Collection, Map as OlMap } from 'ol';
import { Coordinate } from 'ol/coordinate';
import BaseLayer from 'ol/layer/Base';
import LayerGroup from 'ol/layer/Group';
import Layer from 'ol/layer/Layer';
import TileSource from 'ol/source/Tile';
import UrlTile from 'ol/source/UrlTile';
import { DROP } from 'ol/structs/PriorityQueue';
import Tile from 'ol/Tile';
import { getUid } from 'ol/util';

/*
 * OpenLayers queues the tiles of every layer together and loads them nearest
 * the centre first, whichever layer they belong to. With charts stacked, the
 * one on top then fills in no sooner than the ones it covers, and a fast
 * satellite layer underneath shows first on every zoom. Loading the upper
 * charts' tiles first makes the chart on top appear first; the ones below
 * still load, for where it has no coverage.
 *
 * Only charts the Signal K server serves take part. An online layer on top,
 * such as OpenSeaMap's seamarks over the base chart or a radar overlay, is
 * mostly transparent and comes in over the uplink, and a time-varying one
 * queues a new set of tiles on every step: ahead of the charts below, either
 * would hold them up. Such layers keep OpenLayers' own order.
 */

/**
 * OpenLayers' priority (lower loads sooner) is 65536·ln(resolution), a zoom
 * level apart by 65536·ln 2 ≈ 45 400, plus the distance from the centre in
 * tile pixels, up to about 3 400 on a 4K screen. A step per chart larger than
 * that, and capped inside a zoom level, so every chart's tiles at one zoom
 * still load before the coarser ones preloaded beneath them.
 */
export const CHART_RANK_STEP = 4096;
export const MAX_CHART_RANK = 10;

const servedHere = new WeakMap<UrlTile, { key: string; here: boolean }>();

/**
 * Whether a tile source loads from the server that serves Freeboard, the
 * Signal K server, where the local charts are.
 */
export function isServedHere(source: TileSource): boolean {
  if (!(source instanceof UrlTile)) {
    return false;
  }
  const urls = source.getUrls();
  const key = urls?.join('\n') ?? '';
  let known = servedHere.get(source);
  if (known?.key !== key) {
    const here =
      !!urls?.length &&
      urls.every((url) => {
        try {
          return new URL(url, location.href).origin === location.origin;
        } catch {
          return false;
        }
      });
    known = { key, here };
    servedHere.set(source, known);
  }
  return known.here;
}

/**
 * Each chart's place from the top among the charts served here, keyed by its
 * tile source's uid (the key the tile queue uses): by z-index, then later in
 * the tree on top, as OpenLayers draws them. A layer without a z-index takes
 * its group's. A source shown by two layers takes the upper one's place.
 */
export function chartRanks(group: LayerGroup): Map<string, number> {
  const charts: { key: string; zIndex: number; order: number }[] = [];
  const walk = (children: Collection<BaseLayer>, inherited: number) =>
    children.forEach((layer) => {
      const zIndex = layer.getZIndex() ?? inherited;
      if (layer instanceof LayerGroup) {
        walk(layer.getLayers(), zIndex);
      } else if (layer instanceof Layer) {
        const source = layer.getRenderSource();
        if (source instanceof TileSource && isServedHere(source)) {
          charts.push({ key: getUid(source), zIndex, order: charts.length });
        }
      }
    });
  walk(group.getLayers(), group.getZIndex() ?? 0);
  charts.sort((a, b) => b.zIndex - a.zIndex || b.order - a.order);
  const ranks = new Map<string, number>();
  for (const { key } of charts) {
    if (!ranks.has(key)) {
      ranks.set(key, ranks.size);
    }
  }
  return ranks;
}

/** A tile's priority, put behind those of the `rank` charts above it. */
export function topFirstTilePriority(priority: number, rank: number): number {
  return priority === DROP
    ? priority
    : priority + Math.min(rank, MAX_CHART_RANK) * CHART_RANK_STEP;
}

/** A map that loads the tiles of its upper charts first. */
export class TopFirstMap extends OlMap {
  private ranks?: {
    group: LayerGroup;
    revision: number;
    byKey: Map<string, number>;
  };

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
    // The group's revision moves with every change in the tree, a z-index
    // or a layer added included, so the ranks are worked out again only then.
    const group = this.getLayerGroup();
    const revision = group.getRevision();
    if (this.ranks?.group !== group || this.ranks.revision !== revision) {
      this.ranks = { group, revision, byKey: chartRanks(group) };
    }
    return topFirstTilePriority(
      priority,
      this.ranks.byKey.get(tileSourceKey) ?? 0
    );
  }
}
