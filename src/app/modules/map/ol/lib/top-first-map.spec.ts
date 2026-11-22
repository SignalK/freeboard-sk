import { describe, expect, it } from 'vitest';
import { View } from 'ol';
import { FrameState } from 'ol/Map';
import MapEvent from 'ol/MapEvent';
import { get as getProjection } from 'ol/proj';
import Projection from 'ol/proj/Projection';
import TileGrid from 'ol/tilegrid/TileGrid';
import { createXYZ } from 'ol/tilegrid';
import LayerGroup from 'ol/layer/Group';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorSource from 'ol/source/Vector';
import VectorTileSource from 'ol/source/VectorTile';
import TileJSON from 'ol/source/TileJSON';
import XYZ from 'ol/source/XYZ';
import { DROP } from 'ol/structs/PriorityQueue';
import Tile from 'ol/Tile';
import TileState from 'ol/TileState';
import { getUid } from 'ol/util';
import { CHART_COVERAGE } from './charts/chart-coverage';
import {
  CHART_RANK_STEP,
  CHART_VARIES,
  hiddenBeneath,
  isServedHere,
  levelsCoarser,
  LEVEL_STEP,
  MAX_CHART_RANK,
  shownTileSources,
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

const mercator = getProjection('EPSG:3857') as Projection;
const resolutionAt = (z: number) => createXYZ().getResolution(z);

// The ranks of the charts among a group's tile sources.
const chartRanks = (
  group: LayerGroup,
  wanted?: Record<string, Record<string, unknown>>
) =>
  new Map(
    [...shownTileSources(group, wanted)]
      .filter(([, shown]) => shown.rank !== undefined)
      .map(([key, shown]) => [key, shown.rank])
  );

describe('shownTileSources', () => {
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

  it('leaves out hidden layers, those in hidden groups, and time-varying charts', () => {
    const shared = new XYZ({ url: 'x/{z}/{x}/{y}' });
    const hidden = new TileLayer({
      source: shared,
      zIndex: 40,
      visible: false
    });
    const inHiddenGroup = tiles(35);
    const radar = tiles(30);
    radar.set(CHART_VARIES, true);
    const chart = tiles(20);
    const ranks = chartRanks(
      new LayerGroup({
        layers: [
          new TileLayer({ source: shared, zIndex: 10 }),
          chart,
          radar,
          new LayerGroup({ layers: [inHiddenGroup], visible: false }),
          hidden
        ]
      })
    );
    expect(ranks.get(keyOf(chart))).toBe(0);
    expect(ranks.get(getUid(shared))).toBe(1);
    expect(ranks.has(keyOf(radar))).toBe(false);
    expect(ranks.has(keyOf(inHiddenGroup))).toBe(false);
  });
});

describe('shownTileSources, given the sources a frame wanted', () => {
  it('ranks only the charts that draw now', () => {
    const regional = Array.from({ length: 12 }, (_, i) => tiles(30 + i));
    const harbour = tiles(20);
    const overview = tiles(10);
    // In zoom range but outside its bounds, a regional chart is listed with
    // no tiles; out of zoom range it is not listed at all.
    const wanted: Record<string, Record<string, boolean>> = Object.fromEntries(
      regional.slice(0, 6).map((layer) => [keyOf(layer), {}])
    );
    wanted[keyOf(harbour)] = { tile: true };
    wanted[keyOf(overview)] = { tile: true };
    const ranks = chartRanks(
      new LayerGroup({ layers: [overview, harbour, ...regional] }),
      wanted
    );
    expect(ranks.get(keyOf(harbour))).toBe(0);
    expect(ranks.get(keyOf(overview))).toBe(1);
    expect(ranks.size).toBe(2);
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

  it('reads the templates of TileJSON and pmtiles sources', () => {
    const tileJson = new TileJSON({
      tileJSON: { tiles: ['/signalk/v1/api/c/{z}/{x}/{y}'] }
    });
    expect(isServedHere(tileJson)).toBe(true);
    const pmtiles = new XYZ({ url: 'pmtiles:///charts/c.pmtiles/{z}/{x}/{y}' });
    expect(isServedHere(pmtiles)).toBe(true);
  });

  it('takes a TileJSON whose tiles are no list as not served here', () => {
    const broken = new TileJSON({
      tileJSON: {
        tiles: '/signalk/v1/api/c/{z}/{x}/{y}' as unknown as string[]
      }
    });
    expect(isServedHere(broken)).toBe(false);
  });

  it('follows a source pointed elsewhere', () => {
    const source = new XYZ({ url: '/charts/{z}/{x}/{y}' });
    expect(isServedHere(source)).toBe(true);
    source.setUrl('https://tiles.example.org/{z}/{x}/{y}');
    expect(isServedHere(source)).toBe(false);
  });
});

describe('topFirstTilePriority', () => {
  it('loads the top chart before the next one, across a 4K screen', () => {
    expect(topFirstTilePriority(0, 0, 3400)).toBeLessThan(
      topFirstTilePriority(0, 1, 0)
    );
  });

  it("loads every layer's current tiles before coarser ones preloaded", () => {
    expect(topFirstTilePriority(0, MAX_CHART_RANK + 10, 3400)).toBeLessThan(
      topFirstTilePriority(1, 0, 0)
    );
  });
});

describe('levelsCoarser', () => {
  const xyz = (maxZoom?: number) => new XYZ({ url: 'x/{z}/{x}/{y}', maxZoom });
  // The levels as the map counts them for a source at a view resolution.
  const levels = (source: XYZ, viewResolution: number, tile: number) => {
    const grid = source.getTileGridForProjection(mercator);
    const shownZ = grid.getZForResolution(viewResolution, source.zDirection);
    return levelsCoarser(grid, shownZ, tile);
  };

  it('counts the levels between a tile and the level shown', () => {
    expect(levels(xyz(), resolutionAt(12), resolutionAt(12))).toBe(0);
    expect(levels(xyz(), resolutionAt(12), resolutionAt(11))).toBe(1);
  });

  it("takes a source's finest level as current once the map is zoomed past it", () => {
    expect(levels(xyz(14), resolutionAt(16), resolutionAt(14))).toBe(0);
  });

  it('takes the level a grid of its own shows as current', () => {
    // WMTS-like scales, between the standard ones.
    const own = createXYZ()
      .getResolutions()
      .map((r) => r * 1.2);
    const source = new XYZ({
      url: 'x/{z}/{x}/{y}',
      tileGrid: new TileGrid({ extent: mercator.getExtent(), resolutions: own })
    });
    expect(levels(source, resolutionAt(12), own[12])).toBe(0);
  });

  it('counts by level on a grid that does not halve the resolution', () => {
    const resolutions = [1000, 800, 640, 512];
    const source = new XYZ({
      url: 'x/{z}/{x}/{y}',
      tileGrid: new TileGrid({ extent: mercator.getExtent(), resolutions })
    });
    expect(levels(source, 800, 1000)).toBe(1);
    expect(levels(source, 640, 1000)).toBe(2);
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
  // A map on which a frame wanted tiles from `layers`, as rendering leaves it.
  const mapWanting = (layers: TileLayer[], view?: View) => {
    const map = new TopFirstMap(view ? { view } : undefined);
    layers.forEach((layer) => map.addLayer(layer));
    const frame = frameWanting(layers.map(keyOf));
    (map as unknown as { frameState_: FrameState }).frameState_ = frame;
    map.dispatchEvent(new MapEvent('postrender', map, frame));
    return map;
  };

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

  it('queues an online layer after the local charts, the one below them too', () => {
    const map = new TopFirstMap();
    const base = online(0);
    const satellite = tiles(10);
    const chart = tiles(20);
    [base, satellite, chart].forEach((layer) => map.addLayer(layer));
    (map as unknown as { frameState_: FrameState }).frameState_ = frameWanting(
      [base, satellite, chart].map(keyOf)
    );
    const priority = (layer: TileLayer) =>
      map.getTilePriority(tile, keyOf(layer), [0, 0], 2.4);
    expect(priority(chart)).toBeLessThan(priority(satellite));
    expect(priority(satellite)).toBeLessThan(priority(base));
  });

  it('queues an online layer after an eleventh local chart too', () => {
    const charts = Array.from({ length: 11 }, (_, i) => tiles(10 + i));
    const seamarks = online(30);
    const map = mapWanting([...charts, seamarks]);
    const eleventh = map.getTilePriority(
      tile,
      keyOf(charts[0]),
      [100 * 2.4, 0],
      2.4
    );
    const onlineTile = map.getTilePriority(tile, keyOf(seamarks), [0, 0], 2.4);
    expect(eleventh).toBeLessThan(onlineTile);
  });

  it('ranks the charts the last frame drew, not those out of range', () => {
    const regional = Array.from({ length: 12 }, (_, i) => tiles(30 + i));
    const harbour = tiles(20);
    const overview = tiles(10);
    const map = mapWanting([overview, harbour]);
    regional.forEach((layer) => map.addLayer(layer));
    const priority = (layer: TileLayer) =>
      map.getTilePriority(tile, keyOf(layer), [0, 0], 2.4);
    expect(priority(overview) - priority(harbour)).toBeCloseTo(
      CHART_RANK_STEP,
      6
    );
  });

  it('queues the upper chart first although the one below is on a finer grid', () => {
    const own = createXYZ()
      .getResolutions()
      .map((r) => r * 1.2);
    const upper = new TileLayer({
      source: new XYZ({
        url: 'x/{z}/{x}/{y}',
        tileGrid: new TileGrid({
          extent: mercator.getExtent(),
          resolutions: own
        })
      }),
      zIndex: 20
    });
    const lower = tiles(10);
    const map = mapWanting(
      [lower, upper],
      new View({ resolution: resolutionAt(12) * 1.1 })
    );
    const upperTile = map.getTilePriority(tile, keyOf(upper), [0, 0], own[12]);
    const lowerTile = map.getTilePriority(
      tile,
      keyOf(lower),
      [0, 0],
      resolutionAt(12)
    );
    expect(upperTile).toBeLessThan(lowerTile);
  });

  it('queues the upper chart first when the map is zoomed past its finest level', () => {
    const upper = new TileLayer({
      source: new XYZ({ url: 'x/{z}/{x}/{y}', maxZoom: 14 }),
      zIndex: 20
    });
    const lower = tiles(10);
    const map = mapWanting(
      [lower, upper],
      new View({ resolution: resolutionAt(16) })
    );
    const upperTile = map.getTilePriority(
      tile,
      keyOf(upper),
      [0, 0],
      resolutionAt(14)
    );
    const lowerTile = map.getTilePriority(
      tile,
      keyOf(lower),
      [0, 0],
      resolutionAt(16)
    );
    expect(upperTile).toBeLessThan(lowerTile);
  });

  it("puts a tile at its level, its chart's rank and its distance", () => {
    const upper = tiles(20);
    const lower = tiles(10);
    const map = mapWanting(
      [lower, upper],
      new View({ resolution: resolutionAt(12) })
    );
    const at = resolutionAt(11);
    // 100 tile pixels east of the centre, one level coarser than shown.
    const priority = map.getTilePriority(tile, keyOf(lower), [100 * at, 0], at);
    expect(priority).toBeCloseTo(LEVEL_STEP + CHART_RANK_STEP + 100, 6);
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

// An S-57 chart filling 10/315/381 from z9 to z12, and z13/2485/3060 on.
const coverage = [
  { minzoom: 9, maxzoom: 12, tiles: ['10/315/381'] },
  { minzoom: 12, tiles: ['13/2485/3060'] }
];
const s57 = (zIndex: number) => {
  const layer = tiles(zIndex);
  layer.set(CHART_COVERAGE, coverage);
  return layer;
};
// The frame of a map drawn at level `z`, as OpenLayers hands it on.
const frameAt = (group: LayerGroup, z: number, wanted = {}) =>
  ({
    viewState: {
      center: [0, 0],
      resolution: resolutionAt(z),
      zoom: z,
      projection: mercator,
      rotation: 0
    },
    layerStatesArray: group.getLayerStatesArray(),
    wantedTiles: wanted
  }) as unknown as FrameState;

describe('hiddenBeneath', () => {
  it('hides the sources beneath an opaque chart with coverage, at its zooms', () => {
    const satellite = tiles(10);
    const chart = s57(20);
    const seamarks = online(30);
    const group = new LayerGroup({ layers: [satellite, chart, seamarks] });

    const at11 = hiddenBeneath(frameAt(group, 11));
    expect([...at11.keys()]).toEqual([keyOf(satellite)]);
    expect(at11.get(keyOf(satellite))?.entries.map((e) => e.minzoom)).toEqual([
      9
    ]);
    expect(
      hiddenBeneath(frameAt(group, 14))
        .get(keyOf(satellite))
        ?.entries.map((e) => e.minzoom)
    ).toEqual([12]);
    expect(hiddenBeneath(frameAt(group, 8)).size).toBe(0);
  });

  it('hides nothing beneath a translucent, hidden or out-of-range chart', () => {
    const satellite = tiles(10);
    const chart = s57(20);
    const group = new LayerGroup({ layers: [satellite, chart] });
    chart.setOpacity(0.8);
    expect(hiddenBeneath(frameAt(group, 11)).size).toBe(0);
    chart.setOpacity(1);
    chart.setVisible(false);
    expect(hiddenBeneath(frameAt(group, 11)).size).toBe(0);
    chart.setVisible(true);
    chart.setMaxZoom(10);
    expect(hiddenBeneath(frameAt(group, 11)).size).toBe(0);
  });

  it('leaves a source on a grid of its own alone', () => {
    const own = new TileLayer({
      source: new XYZ({
        url: 'x/{z}/{x}/{y}',
        tileGrid: new TileGrid({
          extent: mercator.getExtent(),
          resolutions: createXYZ()
            .getResolutions()
            .map((r) => r * 1.2)
        })
      }),
      zIndex: 10
    });
    const group = new LayerGroup({ layers: [own, s57(20)] });
    expect(hiddenBeneath(frameAt(group, 11)).size).toBe(0);
  });
});

describe('TopFirstMap under coverage', () => {
  // A map that drew a frame at `z` wanting `tile` from `lower`.
  const drawn = (map: TopFirstMap, z: number, lower: TileLayer, tile: Tile) => {
    const frame = frameAt(map.getLayerGroup(), z, {
      [keyOf(lower)]: { [tile.getKey()]: true }
    });
    (map as unknown as { frameState_: FrameState }).frameState_ = frame;
    map.dispatchEvent(new MapEvent('postrender', map, frame));
  };
  const tileOf = (layer: TileLayer, z: number, x: number, y: number) =>
    (layer.getSource() as XYZ).getTile(z, x, y, 1, mercator);

  it('sets a covered tile empty instead of loading it, and rebuilds it once uncovered', () => {
    const satellite = tiles(10);
    const chart = s57(20);
    const map = new TopFirstMap();
    [satellite, chart].forEach((layer) => map.addLayer(layer));
    const covered = tileOf(satellite, 12, 315 * 4 + 1, 381 * 4 + 2);

    drawn(map, 12, satellite, covered);
    expect(
      map.getTilePriority(covered, keyOf(satellite), [0, 0], resolutionAt(12))
    ).toBe(DROP);
    expect(covered.getState()).toBe(TileState.EMPTY);

    const before = satellite.getSource()?.getKey();
    chart.setOpacity(0.5);
    drawn(map, 12, satellite, covered);
    map.getTilePriority(covered, keyOf(satellite), [0, 0], resolutionAt(12));
    expect(satellite.getSource()?.getKey()).not.toBe(before);
    const rebuilt = tileOf(satellite, 12, 315 * 4 + 1, 381 * 4 + 2);
    drawn(map, 12, satellite, rebuilt);
    expect(
      map.getTilePriority(rebuilt, keyOf(satellite), [0, 0], resolutionAt(12))
    ).not.toBe(DROP);
    expect(rebuilt.getState()).toBe(TileState.IDLE);
  });

  it('keeps the source as it is while the same coverage hides it', () => {
    const satellite = tiles(10);
    const map = new TopFirstMap();
    [satellite, s57(20)].forEach((layer) => map.addLayer(layer));
    const before = satellite.getSource()?.getKey();
    const covered = tileOf(satellite, 12, 315 * 4, 381 * 4);
    // At z12 a second entry holds as well.
    drawn(map, 11, satellite, covered);
    map.getTilePriority(covered, keyOf(satellite), [0, 0], resolutionAt(12));
    drawn(map, 12, satellite, covered);
    map.getTilePriority(covered, keyOf(satellite), [0, 0], resolutionAt(12));
    expect(satellite.getSource()?.getKey()).toBe(before);
  });

  it('loads a tile outside the coverage as before', () => {
    const satellite = tiles(10);
    const map = new TopFirstMap();
    [satellite, s57(20)].forEach((layer) => map.addLayer(layer));
    const open = tileOf(satellite, 12, 316 * 4, 381 * 4);
    drawn(map, 12, satellite, open);
    expect(
      map.getTilePriority(open, keyOf(satellite), [0, 0], resolutionAt(12))
    ).not.toBe(DROP);
    expect(open.getState()).toBe(TileState.IDLE);
  });

  it('rebuilds the tiles when the map is zoomed past the coverage', () => {
    const satellite = tiles(10);
    const map = new TopFirstMap();
    [satellite, s57(20)].forEach((layer) => map.addLayer(layer));
    // Listed for z9 to z12 only: at z13 the chart fills 13/2485/3060 alone.
    const covered = tileOf(satellite, 11, 315 * 2, 381 * 2);
    drawn(map, 11, satellite, covered);
    map.getTilePriority(covered, keyOf(satellite), [0, 0], resolutionAt(11));
    expect(covered.getState()).toBe(TileState.EMPTY);
    const before = satellite.getSource()?.getKey();
    drawn(map, 13, satellite, covered);
    map.getTilePriority(covered, keyOf(satellite), [0, 0], resolutionAt(11));
    expect(satellite.getSource()?.getKey()).not.toBe(before);
  });
});
