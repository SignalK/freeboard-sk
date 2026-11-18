import { describe, expect, it } from 'vitest';
import { FrameState } from 'ol/Map';
import LayerGroup from 'ol/layer/Group';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorSource from 'ol/source/Vector';
import VectorTileSource from 'ol/source/VectorTile';
import XYZ from 'ol/source/XYZ';
import { DROP } from 'ol/structs/PriorityQueue';
import Tile from 'ol/Tile';
import { getUid } from 'ol/util';
import {
  chartRanks,
  isServedHere,
  MAX_CHART_RANK,
  TopFirstMap,
  topFirstTilePriority
} from './top-first-map';

// A chart the Signal K server serves, as the local chart providers do.
const tiles = (zIndex?: number) =>
  new TileLayer({ source: new XYZ({ url: 'x/{z}/{x}/{y}' }), zIndex });
const online = (zIndex?: number) =>
  new TileLayer({
    source: new XYZ({ url: 'https://tiles.example.org/{z}/{x}/{y}.png' }),
    zIndex
  });
const keyOf = (layer: TileLayer | VectorTileLayer) => getUid(layer.getSource());

// OpenLayers' own priority: 65536·ln(resolution) plus the distance from the
// centre in pixels.
const olPriority = (resolution: number, pixels: number) =>
  65536 * Math.log(resolution) + pixels;

describe('chartRanks', () => {
  it('ranks charts from the top by z-index, leaving other layers out', () => {
    const satellite = tiles(10);
    const s57 = new VectorTileLayer({
      source: new VectorTileSource({ url: 'v/{z}/{x}/{y}' }),
      zIndex: 20
    });
    const group = new LayerGroup({
      layers: [
        s57,
        satellite,
        new VectorLayer({ source: new VectorSource(), zIndex: 30 })
      ]
    });
    const ranks = chartRanks(group);
    expect(ranks.get(keyOf(s57))).toBe(0);
    expect(ranks.get(keyOf(satellite))).toBe(1);
    expect(ranks.size).toBe(2);
  });

  it('puts the later of two equal layers on top, as OpenLayers draws them', () => {
    const first = tiles(10);
    const second = tiles(10);
    const ranks = chartRanks(new LayerGroup({ layers: [first, second] }));
    expect(ranks.get(keyOf(second))).toBe(0);
    expect(ranks.get(keyOf(first))).toBe(1);
  });

  it("gives a layer without a z-index its group's", () => {
    const inGroup = tiles();
    const below = tiles(10);
    const above = tiles(20);
    const ranks = chartRanks(
      new LayerGroup({
        layers: [
          above,
          below,
          new LayerGroup({ layers: [inGroup], zIndex: 15 })
        ]
      })
    );
    expect(ranks.get(keyOf(above))).toBe(0);
    expect(ranks.get(keyOf(inGroup))).toBe(1);
    expect(ranks.get(keyOf(below))).toBe(2);
  });

  it('leaves online layers out, so the chart below an overlay ranks first', () => {
    const seamarks = online(30);
    const chart = tiles(20);
    const satellite = tiles(10);
    const ranks = chartRanks(
      new LayerGroup({ layers: [satellite, chart, seamarks] })
    );
    expect(ranks.has(keyOf(seamarks))).toBe(false);
    expect(ranks.get(keyOf(chart))).toBe(0);
    expect(ranks.get(keyOf(satellite))).toBe(1);
  });

  it('gives a source shown by two layers the upper place', () => {
    const shared = new XYZ({ url: 'x/{z}/{x}/{y}' });
    const middle = tiles(20);
    const ranks = chartRanks(
      new LayerGroup({
        layers: [
          new TileLayer({ source: shared, zIndex: 30 }),
          middle,
          new TileLayer({ source: shared, zIndex: 10 })
        ]
      })
    );
    expect(ranks.get(getUid(shared))).toBe(0);
    expect(ranks.get(keyOf(middle))).toBe(1);
  });
});

describe('isServedHere', () => {
  it('tells tiles from this server from online ones', () => {
    expect(
      isServedHere(new XYZ({ url: '/signalk/v1/api/x/{z}/{x}/{y}' }))
    ).toBe(true);
    expect(
      isServedHere(new XYZ({ url: `${location.origin}/charts/{z}/{x}/{y}` }))
    ).toBe(true);
    expect(
      isServedHere(new XYZ({ url: 'https://tiles.example.org/{z}/{x}/{y}' }))
    ).toBe(false);
  });

  it('follows a source pointed elsewhere', () => {
    const source = new XYZ({ url: '/charts/{z}/{x}/{y}' });
    expect(isServedHere(source)).toBe(true);
    source.setUrl('https://tiles.example.org/{z}/{x}/{y}');
    expect(isServedHere(source)).toBe(false);
  });
});

describe('topFirstTilePriority', () => {
  const resolution = 2.4;

  it('loads the top chart before the next one, across a 4K screen', () => {
    const topAtCorner = topFirstTilePriority(olPriority(resolution, 3400), 0);
    const nextAtCentre = topFirstTilePriority(olPriority(resolution, 0), 1);
    expect(topAtCorner).toBeLessThan(nextAtCentre);
  });

  it("loads every layer's tiles at a zoom before coarser ones preloaded", () => {
    const lowestAtCorner = topFirstTilePriority(
      olPriority(resolution, 3400),
      MAX_CHART_RANK + 10
    );
    const topPreloaded = topFirstTilePriority(olPriority(resolution * 2, 0), 0);
    expect(lowestAtCorner).toBeLessThan(topPreloaded);
  });

  it('keeps a dropped tile dropped', () => {
    expect(topFirstTilePriority(DROP, 3)).toBe(DROP);
  });
});

describe('TopFirstMap', () => {
  // A frame that wants one tile from each source, centred on the tiles.
  const frameWanting = (keys: string[]) =>
    ({
      viewState: { center: [0, 0] },
      wantedTiles: Object.fromEntries(keys.map((k) => [k, { tile: true }]))
    }) as unknown as FrameState;
  const tile = { getKey: () => 'tile' } as unknown as Tile;

  it('queues the upper layer first, and follows a change of order', () => {
    const map = new TopFirstMap();
    const satellite = tiles(10);
    const chart = tiles(20);
    map.addLayer(satellite);
    map.addLayer(chart);
    (map as unknown as { frameState_: FrameState }).frameState_ = frameWanting([
      keyOf(satellite),
      keyOf(chart)
    ]);
    const priority = (layer: TileLayer) =>
      map.getTilePriority(tile, keyOf(layer), [0, 0], 2.4);

    expect(priority(chart)).toBeLessThan(priority(satellite));
    satellite.setZIndex(30);
    expect(priority(satellite)).toBeLessThan(priority(chart));
  });

  it('drops a tile no frame wants', () => {
    const map = new TopFirstMap();
    const layer = tiles(10);
    map.addLayer(layer);
    (map as unknown as { frameState_: FrameState }).frameState_ = frameWanting(
      []
    );
    expect(map.getTilePriority(tile, keyOf(layer), [0, 0], 2.4)).toBe(DROP);
  });
});
