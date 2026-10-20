import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  inject
} from '@angular/core';
import type { EventsKey } from 'ol/events';
import { unByKey } from 'ol/Observable';
import type BaseLayer from 'ol/layer/Base';
import LayerGroup from 'ol/layer/Group';
import TileLayer from 'ol/layer/Tile';
import WebGLTileLayer, {
  type Style as WebGLTileStyle
} from 'ol/layer/WebGLTile';
import VectorLayer from 'ol/layer/Vector';
import VectorTileLayer from 'ol/layer/VectorTile';
import ImageTileSource from 'ol/source/ImageTile';
import VectorSource from 'ol/source/Vector';
import VectorTileSource from 'ol/source/VectorTile';
import type VectorTile from 'ol/VectorTile';
import type { FeatureLike } from 'ol/Feature';
import TileState from 'ol/TileState';
import GeoJSON from 'ol/format/GeoJSON';
import MVT from 'ol/format/MVT';
import { createXYZ } from 'ol/tilegrid';
import { stylefunction, updateMapboxLayer } from 'ol-mapbox-style';
import type { OverlayFeature } from 'signalk-plotterext-bus/host';
import { MapComponent } from '../map.component';
import { ON_TWIN, type OnTwin, releaseTiles } from '../util';
import type {
  DataOverlayChange,
  DataOverlayModel
} from 'src/app/modules/plotterext/data-overlay-model';
import {
  parseReliefRamp,
  type ReliefRamp,
  type SourcePlan,
  type StyleLayer
} from 'src/app/modules/plotterext/data-overlay-style';
import {
  evaluatePaintNumber,
  fskFonts,
  mapLibreZoom,
  olStyleLayer,
  reliefColorExpression,
  resolutionRange
} from './style-to-ol';
import { TileFetcher } from './tile-fetcher';
import { DATA_OVERLAY_LAYER, type DataOverlayLayerTag } from './overlay-hits';

type TiledPlan = Extract<SourcePlan, { tiles: string[] }>;
type DemPlan = Extract<SourcePlan, { type: 'raster-dem' }>;

const VECTOR_TYPES = new Set(['fill', 'line', 'circle', 'symbol']);

/** One OpenLayers layer drawing one or more of the style's layers. */
interface Part {
  kind: 'color-relief' | 'raster' | 'vector';
  source: string;
  /** Style layer ids, in draw order; one for color-relief and raster. */
  layerIds: string[];
  olLayer: BaseLayer;
  /** vector: whether its features are selectable (`actions.overlay`). */
  interactive?: boolean;
  /** color-relief / raster: how it resamples, fixed per OL source. */
  interpolate?: boolean;
  /** color-relief: the ramp it draws with. */
  relief?: Relief;
}

/**
 * A color-relief layer's shader style, and its twins: copies of the layer
 * drawing it on another map (the split view's second pane). A WebGL layer's
 * style is not a layer property, so a twin cannot take it from the layer: it
 * gets it here.
 */
interface Relief {
  style: WebGLTileStyle;
  twins: Set<WebGLTileLayer>;
}

/** Gives each twin of a relief layer its ramp, now and whenever it changes. */
const followRelief =
  (relief: Relief): OnTwin =>
  (layer) => {
    const twin = layer as WebGLTileLayer;
    twin.setStyle(relief.style);
    relief.twins.add(twin);
    return () => relief.twins.delete(twin);
  };

/** Changing a tile source's key re-renders every tile; OL keeps it protected. */
const setSourceKey = (source: unknown, key: string) =>
  (source as { setKey(key: string): void }).setKey(key);

let emptyTiles: Record<number, HTMLCanvasElement> = {};

/** Makes each build's style id unique: ol-mapbox-style keys its caches by it. */
let glStyleSeq = 0;

/** A transparent tile: what Freeboard draws for a tile with no data. */
function emptyTile(size: number): HTMLCanvasElement {
  if (!emptyTiles[size]) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    emptyTiles = { ...emptyTiles, [size]: canvas };
  }
  return emptyTiles[size];
}

/**
 * One data overlay (capability `overlays.data`): the layers of an extension's
 * MapLibre style drawn with OpenLayers, inside one layer group at the
 * overlay's z-index, faded by the overlay's opacity.
 *
 * - `color-relief` → a WebGL tile layer decoding the `raster-dem` tiles and
 *   colouring them with the ramp in the shader. A new ramp (`overlay.setLayer`)
 *   swaps the shader and keeps the tiles. A copy of the layer on another map
 *   (the split view's second pane) is given each ramp too.
 * - `raster` → a canvas tile layer.
 * - `fill` / `line` / `circle` / `symbol` → a vector (geojson) or vector-tile
 *   layer per run of consecutive layers on one source, styled by
 *   ol-mapbox-style. ol-mapbox-style cannot evaluate `global-state`, so each
 *   run's layers are handed over with `global-state` already replaced by its
 *   value, and handed over again when a value changes. A run never mixes
 *   selectable layers with others (capability `actions.overlay`), so a click
 *   can tell them apart by the OL layer it hit, which says so in its
 *   {@link DATA_OVERLAY_LAYER} property.
 *
 * Tiles are fetched by a {@link TileFetcher} per source, which keeps them in
 * memory: refreshing some tiles bumps the OL source key, so OL re-renders
 * every tile (keeping the old ones on screen meanwhile) while only the
 * refreshed ones are fetched again.
 *
 * The component exists only while the overlay is shown and within the
 * budget, so a hidden overlay draws nothing and fetches nothing. Its
 * {@link DataOverlayModel} holds every change, so remounting draws the
 * current state.
 */
@Component({
  selector: 'ol-map > fb-data-overlay',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class DataOverlayComponent implements OnInit, OnChanges, OnDestroy {
  /** `<extension>/<overlay id>` */
  @Input() overlayKey: string;
  @Input() model: DataOverlayModel;
  @Input() zIndex: number;
  @Input() opacity = 1;
  @Input() minZoom: number | undefined;
  @Input() maxZoom: number | undefined;
  /** Whether the overlay's features are selectable (`actions.overlay`). */
  @Input() interactive = false;
  /** The style layers whose features are selectable; all when unset. */
  @Input() interactiveLayers: string[] | undefined;

  private mapComponent = inject(MapComponent);

  private group: LayerGroup | null = null;
  private parts: Part[] = [];
  private drawnSignature = '';
  /**
   * The vector layers as ol-mapbox-style draws them, one object per build.
   * Changes go through `updateMapboxLayer`, which replaces a layer in it and
   * clears only that layer's compiled expressions: a new style object per
   * change would grow ol-mapbox-style's module-level caches with every change
   * rather than once per build.
   */
  private glStyle: {
    id: string;
    version: 8;
    sources: Record<string, unknown>;
    layers: StyleLayer[];
  } | null = null;
  /** Properties already reported as dropped, so each is warned about once. */
  private readonly warned = new Set<string>();
  /** Tiled sources whose OL key is bumped on the next frame. */
  private readonly rekey = new Set<string>();
  private rekeyFrame: number | null = null;
  private readonly fetchers = new Map<string, TileFetcher>();
  private readonly geojsonSources = new Map<string, VectorSource>();
  private readonly vectorTileSources = new Map<string, VectorTileSource>();
  /** Per tiled source: the key last given to its OL sources. */
  private readonly sourceKeys = new Map<string, number>();
  /** Per vector-tile source: refresh counts, part of each OL source-tile key. */
  private readonly tileRevisions = new Map<
    string,
    { all: number; tiles: Map<string, number> }
  >();
  private readonly geojson = new GeoJSON({
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857'
  });
  private unsubscribe: (() => void) | null = null;
  private listenerKeys: EventsKey[] = [];

  constructor() {
    inject(ChangeDetectorRef).detach();
  }

  ngOnInit() {
    const map = this.mapComponent.getMap();
    if (!map || !this.model) return;
    this.group = new LayerGroup({
      zIndex: this.zIndex,
      opacity: this.clampOpacity(this.opacity)
    });
    this.applyZoomRange();
    map.addLayer(this.group);
    this.build();
    this.unsubscribe = this.model.subscribe((c) => this.onChange(c));
    this.listenerKeys.push(map.on('moveend', () => this.applyOpacities()));
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.group) return;
    // the extension's style was reloaded: start over from its new model
    if (changes['model']) {
      this.ngOnDestroy();
      this.ngOnInit();
      return;
    }
    if (changes['opacity']) {
      this.group.setOpacity(this.clampOpacity(this.opacity));
    }
    if (changes['zIndex']) this.group.setZIndex(this.zIndex);
    if (changes['minZoom'] || changes['maxZoom']) this.applyZoomRange();
    if (changes['interactive'] || changes['interactiveLayers']) this.build();
  }

  ngOnDestroy() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    unByKey(this.listenerKeys);
    this.listenerKeys = [];
    if (this.rekeyFrame !== null) cancelAnimationFrame(this.rekeyFrame);
    this.rekeyFrame = null;
    this.rekey.clear();
    this.clearParts();
    this.glStyle = null;
    const map = this.mapComponent.getMap();
    if (this.group && map) {
      map.removeLayer(this.group);
      map.render();
    }
    this.group?.dispose();
    this.group = null;
    for (const s of this.geojsonSources.values()) s.dispose();
    for (const s of this.vectorTileSources.values()) s.dispose();
    this.geojsonSources.clear();
    this.vectorTileSources.clear();
    this.fetchers.clear();
    this.tileRevisions.clear();
    this.sourceKeys.clear();
  }

  private clampOpacity(v: number) {
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
  }

  /** The manifest's zoom range, inclusive at both ends like an image overlay's. */
  private applyZoomRange() {
    this.group?.setMinZoom(
      this.minZoom !== undefined ? this.minZoom - 1e-9 : -Infinity
    );
    this.group?.setMaxZoom(this.maxZoom ?? Infinity);
  }

  private mlZoom(): number {
    const res = this.mapComponent.getMap()?.getView().getResolution();
    return res ? mapLibreZoom(res) : 0;
  }

  // ---------- building ----------

  private drawnLayers(): StyleLayer[] {
    return this.model.layers().filter((l) => this.model.isDrawn(l.id));
  }

  /** Whether a style layer's features are selectable. */
  private selectable(layerId: string): boolean {
    return (
      this.interactive &&
      (!this.interactiveLayers || this.interactiveLayers.includes(layerId))
    );
  }

  /** (Re)create the OL layers for the style's drawn layers; sources are kept. */
  private build() {
    this.clearParts();
    const drawn = this.drawnLayers();
    this.drawnSignature = drawn.map((l) => l.id).join('\n');
    for (const layer of drawn) {
      const last = this.parts[this.parts.length - 1];
      const interactive = this.selectable(layer.id);
      if (
        VECTOR_TYPES.has(layer.type) &&
        last?.kind === 'vector' &&
        last.source === layer.source &&
        last.interactive === interactive
      ) {
        last.layerIds.push(layer.id);
        continue;
      }
      const part = this.createPart(layer, interactive);
      if (part) this.parts.push(part);
    }
    const vectorParts = this.parts.filter((p) => p.kind === 'vector');
    this.glStyle = {
      // ol-mapbox-style numbers a style without an id, and numbers the first
      // one 0, which it then renumbers as unset, losing that style's saved
      // stylefunction args; updateMapboxLayer would then silently not restyle
      id: `fsk-data-overlay-${++glStyleSeq}`,
      version: 8,
      sources: Object.fromEntries(
        vectorParts.map((p) => [p.source, this.model.style.sources[p.source]])
      ),
      layers: vectorParts.flatMap((p) =>
        p.layerIds.map((id) => this.olLayer(id))
      )
    };
    this.group?.set('mapbox-style', this.glStyle);
    for (const part of this.parts) {
      this.group?.getLayers().push(part.olLayer);
      if (part.kind === 'vector') {
        stylefunction(
          part.olLayer as VectorLayer | VectorTileLayer,
          this.glStyle,
          part.layerIds,
          undefined,
          undefined,
          undefined,
          fskFonts
        );
      } else this.applyPart(part);
    }
  }

  private clearParts() {
    for (const part of this.parts) {
      this.group?.getLayers().remove(part.olLayer);
      releaseTiles(part.olLayer);
      part.olLayer.dispose();
    }
    this.parts = [];
  }

  private plan(sourceId: string): SourcePlan | null {
    const plan = this.model.sources[sourceId];
    return plan && !('error' in plan) ? plan : null;
  }

  private createPart(layer: StyleLayer, interactive: boolean): Part | null {
    const source = layer.source as string;
    const plan = this.plan(source);
    if (!plan) return null;
    if (layer.type === 'color-relief' || layer.type === 'raster') {
      const interpolate = this.interpolates(layer);
      const tileSource = this.imageSource(
        source,
        plan as TiledPlan,
        interpolate
      );
      const relief: Relief | undefined =
        layer.type === 'color-relief'
          ? { style: { color: [0, 0, 0, 0] }, twins: new Set() }
          : undefined;
      const olLayer = relief
        ? new WebGLTileLayer({
            source: tileSource,
            style: relief.style,
            properties: { [ON_TWIN]: followRelief(relief) }
          })
        : new TileLayer({ source: tileSource });
      return {
        kind: layer.type,
        source,
        layerIds: [layer.id],
        olLayer,
        interpolate,
        relief
      };
    }
    const declutter = this.overlayKey;
    const tag: DataOverlayLayerTag = {
      overlayKey: this.overlayKey,
      source,
      interactive,
      promoteId: (
        this.model.style.sources[source] as { promoteId?: unknown } | undefined
      )?.promoteId
    };
    const properties = { [DATA_OVERLAY_LAYER]: tag };
    const olLayer =
      plan.type === 'geojson'
        ? new VectorLayer({
            source: this.geojsonSource(source),
            declutter,
            properties
          })
        : new VectorTileLayer({
            source: this.vectorTileSource(source, plan as TiledPlan),
            declutter,
            properties,
            // nothing is drawn below the source's minzoom (OL would underzoom)
            ...resolutionRange((plan as TiledPlan).minzoom, undefined)
          });
    return {
      kind: 'vector',
      source,
      layerIds: [layer.id],
      olLayer,
      interactive
    };
  }

  private interpolates(layer: StyleLayer): boolean {
    const v =
      layer.type === 'color-relief'
        ? layer.paint?.['resampling']
        : layer.paint?.['raster-resampling'];
    return v !== 'nearest';
  }

  private fetcher(sourceId: string, plan: TiledPlan): TileFetcher {
    let f = this.fetchers.get(sourceId);
    if (!f) {
      f = new TileFetcher(this.model, sourceId, plan);
      this.fetchers.set(sourceId, f);
    }
    return f;
  }

  private imageSource(
    sourceId: string,
    plan: TiledPlan,
    interpolate: boolean
  ): ImageTileSource {
    const fetcher = this.fetcher(sourceId, plan);
    const tileSize = (plan as DemPlan).tileSize;
    const source = new ImageTileSource({
      loader: async (z, x, y) =>
        (await fetcher.image(z, x, y)) ?? emptyTile(tileSize),
      tileSize,
      maxZoom: plan.maxzoom,
      projection: 'EPSG:3857',
      wrapX: true,
      transition: 0,
      interpolate
    });
    setSourceKey(source, String(this.sourceKeys.get(sourceId) ?? 0));
    return source;
  }

  private geojsonSource(sourceId: string): VectorSource {
    let source = this.geojsonSources.get(sourceId);
    if (!source) {
      const created = new VectorSource({ wrapX: true });
      source = created;
      this.geojsonSources.set(sourceId, created);
      this.model.features(sourceId).then((features) => {
        if (this.geojsonSources.get(sourceId) !== created) return;
        created.clear(true);
        created.addFeatures(this.readFeatures(features));
      });
    }
    return source;
  }

  private readFeatures(features: OverlayFeature[]) {
    return features.flatMap((f) => {
      try {
        return [this.geojson.readFeature(f)].flat();
      } catch {
        return [];
      }
    });
  }

  private vectorTileSource(
    sourceId: string,
    plan: TiledPlan
  ): VectorTileSource {
    let source = this.vectorTileSources.get(sourceId);
    if (source) return source;
    const fetcher = this.fetcher(sourceId, plan);
    const revisions = { all: 0, tiles: new Map<string, number>() };
    this.tileRevisions.set(sourceId, revisions);
    source = new VectorTileSource({
      format: new MVT(),
      tileGrid: createXYZ({ tileSize: 512, maxZoom: plan.maxzoom }),
      wrapX: true,
      // the key OL caches a source tile by: a refreshed tile gets a new one,
      // so it is fetched again while every other tile is reused
      tileUrlFunction: ([z, x, y]) => {
        const k = `${z}/${x}/${y}`;
        return `${k}#${revisions.all}.${revisions.tiles.get(k) ?? 0}`;
      },
      tileLoadFunction: (tile) => {
        const vt = tile as VectorTile<FeatureLike>;
        vt.setLoader((extent, _resolution, projection) => {
          const [z, x, y] = vt.getTileCoord();
          fetcher
            .fetch(z, x, y)
            .then(async (blob) =>
              vt.setFeatures(
                blob
                  ? (vt.getFormat().readFeatures(await blob.arrayBuffer(), {
                      extent,
                      featureProjection: projection
                    }) as FeatureLike[])
                  : []
              )
            )
            .catch(() => vt.setState(TileState.ERROR));
        });
      }
    });
    this.vectorTileSources.set(sourceId, source);
    return source;
  }

  // ---------- styling ----------

  private applyPart(part: Part) {
    if (part.kind === 'vector') {
      for (const id of part.layerIds) this.restyleVector(id);
      return;
    }
    const layer = this.model.layer(part.layerIds[0]) as StyleLayer;
    const plan = this.plan(part.source) as TiledPlan;
    const olLayer = part.olLayer as TileLayer | WebGLTileLayer;
    olLayer.setVisible(layer.layout?.['visibility'] !== 'none');
    const range = resolutionRange(
      Math.max(layer.minzoom ?? 0, plan.minzoom),
      layer.maxzoom
    );
    olLayer.setMinResolution(range.minResolution ?? 0);
    olLayer.setMaxResolution(range.maxResolution ?? Infinity);
    if (part.relief) {
      const ramp = parseReliefRamp(layer.paint?.['color-relief-color']);
      part.relief.style = {
        color: reliefColorExpression(
          ramp as ReliefRamp,
          (plan as DemPlan).encoding
        )
      };
      (olLayer as WebGLTileLayer).setStyle(part.relief.style);
      for (const twin of part.relief.twins) twin.setStyle(part.relief.style);
    }
    this.applyOpacity(part);
  }

  /** color-relief / raster opacity, which may follow zoom or global state. */
  private applyOpacity(part: Part) {
    if (part.kind === 'vector') return;
    const layer = this.model.layer(part.layerIds[0]) as StyleLayer;
    const property =
      part.kind === 'color-relief' ? 'color-relief-opacity' : 'raster-opacity';
    part.olLayer.setOpacity(
      this.clampOpacity(
        evaluatePaintNumber(
          part.kind,
          property,
          layer.paint?.[property],
          this.mlZoom(),
          this.model.globalState()
        )
      )
    );
  }

  private applyOpacities() {
    for (const part of this.parts) this.applyOpacity(part);
  }

  /** A vector layer resolved for ol-mapbox-style, warning once per dropped property. */
  private olLayer(id: string): StyleLayer {
    const { layer, dropped } = olStyleLayer(
      this.model.layer(id) as StyleLayer,
      this.model.globalState()
    );
    for (const name of dropped) {
      if (this.warned.has(`${id} ${name}`)) continue;
      this.warned.add(`${id} ${name}`);
      console.warn(
        `[plotterext] ${this.overlayKey}: layer "${id}" draws ${name} at its default; ` +
          'a global-state value does not fit it'
      );
    }
    return layer;
  }

  private restyleVector(id: string) {
    if (this.group) updateMapboxLayer(this.group, this.olLayer(id));
  }

  // ---------- live changes ----------

  private onChange(change: DataOverlayChange) {
    switch (change.kind) {
      case 'layers':
        this.onLayersChanged(change.layers);
        break;
      case 'state':
        for (const part of this.parts) {
          if (part.kind === 'vector') this.applyPart(part);
        }
        this.applyOpacities();
        break;
      case 'data':
        this.onDataChanged(change);
        break;
      case 'refresh':
        this.onRefresh(change.source, change.tiles);
        break;
    }
  }

  private onLayersChanged(ids: string[]) {
    const signature = this.drawnLayers()
      .map((l) => l.id)
      .join('\n');
    const resampled = this.parts.some(
      (p) =>
        p.kind !== 'vector' &&
        ids.includes(p.layerIds[0]) &&
        p.interpolate !==
          this.interpolates(this.model.layer(p.layerIds[0]) as StyleLayer)
    );
    if (signature !== this.drawnSignature || resampled) {
      this.build();
      return;
    }
    for (const part of this.parts) {
      if (part.layerIds.some((id) => ids.includes(id))) this.applyPart(part);
    }
  }

  private onDataChanged(change: Extract<DataOverlayChange, { kind: 'data' }>) {
    const source = this.geojsonSources.get(change.source);
    if (!source) return;
    if (change.replace) {
      source.clear(true);
      source.addFeatures(this.readFeatures(change.replace));
      return;
    }
    for (const id of change.remove ?? []) {
      const f = source.getFeatureById(id);
      if (f) source.removeFeature(f);
    }
    for (const feature of change.upsert ?? []) {
      const old = source.getFeatureById(feature.id as string | number);
      if (old) source.removeFeature(old);
      source.addFeatures(this.readFeatures([feature]));
    }
  }

  private onRefresh(sourceId: string, tiles?: [number, number, number][]) {
    const fetcher = this.fetchers.get(sourceId);
    if (!fetcher) return;
    fetcher.invalidate(tiles);
    const revisions = this.tileRevisions.get(sourceId);
    if (revisions && tiles) {
      for (const [z, x, y] of tiles) {
        const k = `${z}/${x}/${y}`;
        revisions.tiles.set(k, (revisions.tiles.get(k) ?? 0) + 1);
      }
    } else if (revisions) {
      // every source-tile key changes, so every tile is fetched again
      revisions.all++;
      revisions.tiles.clear();
    }
    // a burst of refreshes re-renders once
    this.rekey.add(sourceId);
    this.rekeyFrame ??= requestAnimationFrame(() => this.applyRekeys());
  }

  /** Bump the OL key of every refreshed source, so OL asks for its tiles again. */
  private applyRekeys() {
    this.rekeyFrame = null;
    for (const sourceId of this.rekey) {
      const key = String((this.sourceKeys.get(sourceId) ?? 0) + 1);
      this.sourceKeys.set(sourceId, Number(key));
      const vts = this.vectorTileSources.get(sourceId);
      if (vts) setSourceKey(vts, key);
      for (const part of this.parts) {
        if (part.kind !== 'vector' && part.source === sourceId) {
          setSourceKey((part.olLayer as TileLayer).getSource(), key);
        }
      }
    }
    this.rekey.clear();
  }
}
