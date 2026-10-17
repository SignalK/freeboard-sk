import type {
  OverlayFeature,
  OverlayStyle,
  OverlayTileId,
  SkippedLayer
} from 'signalk-plotterext-bus/host';
import {
  analyzeLayer,
  globalStateValues,
  planSources,
  type LayerVerdict,
  type ResolvedUrl,
  type SourceVerdict,
  type StyleLayer
} from './data-overlay-style';

/**
 * The live state of one data overlay (capability `overlays.data`): its style
 * as changed by `overlay.setLayer`, its `global-state` values, the features of
 * its `geojson` sources, and which tiles must be fetched afresh. It outlives
 * the map layer that draws it, so changes made while the overlay is hidden or
 * suspended are kept and drawn when it is shown again.
 *
 * Map-independent: the map layer reads it and follows its change events.
 */

/** A change the map layer must apply. */
export type DataOverlayChange =
  /** These layers' paint, layout or filter changed. */
  | { kind: 'layers'; layers: string[] }
  /** `global-state` values changed. */
  | { kind: 'state' }
  /** A geojson source's features changed: all of them, or some by id. */
  | {
      kind: 'data';
      source: string;
      replace?: OverlayFeature[];
      upsert?: OverlayFeature[];
      remove?: (string | number)[];
    }
  /** Fetch these tiles (or the whole source) again, bypassing caches. */
  | { kind: 'refresh'; source: string; tiles?: OverlayTileId[] };

/** Why a live change was refused (an `error.data.reason`). */
export class DataOverlayRefusal extends Error {
  constructor(
    readonly reason: 'overlays.badRequest' | 'overlays.unsupported',
    message: string
  ) {
    super(message);
  }
}

/** Fetches a JSON document (a style or GeoJSON); `reload` bypasses the HTTP cache. */
export type FetchJson = (url: ResolvedUrl, reload: boolean) => Promise<unknown>;

export const fetchJson: FetchJson = async (url, reload) => {
  const res = await fetch(url.url, {
    credentials: url.credentials,
    cache: reload ? 'reload' : 'default'
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url.url}`);
  return res.json();
};

const GEOMETRY_TYPES = new Set([
  'Point',
  'MultiPoint',
  'LineString',
  'MultiLineString',
  'Polygon',
  'MultiPolygon',
  'GeometryCollection'
]);

const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

const isFeature = (v: unknown): v is OverlayFeature =>
  isObject(v) && v['type'] === 'Feature';

/** The features of a GeoJSON object, or null when it is not one. */
export function geojsonFeatures(data: unknown): OverlayFeature[] | null {
  if (!isObject(data)) return null;
  if (data['type'] === 'FeatureCollection' && Array.isArray(data['features'])) {
    return data['features'].filter(isFeature);
  }
  if (data['type'] === 'Feature') return [data as unknown as OverlayFeature];
  if (typeof data['type'] === 'string' && GEOMETRY_TYPES.has(data['type'])) {
    return [{ type: 'Feature', geometry: data, properties: {} }];
  }
  return null;
}

const validId = (v: unknown): v is string | number =>
  typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v));

interface GeoJsonState {
  url?: ResolvedUrl;
  /** Features by id; features without one get a private key. Null until a URL loads. */
  features: Map<string | number | symbol, OverlayFeature> | null;
  /** Bumped whenever the data is replaced, so a stale URL load is dropped. */
  generation: number;
  loading?: Promise<OverlayFeature[]>;
  /** Changes by id received before the URL loaded. */
  pending: { upsert?: OverlayFeature[]; remove?: (string | number)[] }[];
  /** The next load bypasses the HTTP cache. */
  reload: boolean;
}

interface TileFreshness {
  /** `z/x/y` of tiles to fetch afresh next time. */
  dirty: Set<string>;
  /** The whole source was refreshed: every tile not loaded since is stale. */
  all: boolean;
  loadedSinceAll: Set<string>;
}

const clone = <T>(v: T): T => structuredClone(v);
const tileKey = (z: number, x: number, y: number) => `${z}/${x}/${y}`;

export class DataOverlayModel {
  readonly sources: Record<string, SourceVerdict>;
  private readonly declared = new Map<string, StyleLayer>();
  private readonly current = new Map<string, StyleLayer>();
  private readonly verdicts = new Map<string, LayerVerdict>();
  private state: Record<string, unknown> = {};
  private readonly geojson = new Map<string, GeoJsonState>();
  private readonly freshness = new Map<string, TileFreshness>();
  private readonly listeners = new Set<(c: DataOverlayChange) => void>();

  constructor(
    readonly style: OverlayStyle,
    origin: string,
    private readonly load: FetchJson = fetchJson
  ) {
    this.sources = planSources(style, origin);
    for (const raw of style.layers as StyleLayer[]) {
      this.declared.set(raw.id, raw);
      this.current.set(raw.id, clone(raw));
      this.verdicts.set(raw.id, analyzeLayer(style, raw, this.sources));
    }
    for (const [id, plan] of Object.entries(this.sources)) {
      if ('error' in plan || plan.type !== 'geojson') continue;
      this.geojson.set(id, {
        url: plan.url,
        features: plan.url
          ? null
          : this.index(geojsonFeatures(plan.data) ?? []),
        generation: 0,
        pending: [],
        reload: false
      });
    }
  }

  /** The layers as currently styled, in draw order (first lowest). */
  layers(): StyleLayer[] {
    return [...this.current.values()];
  }

  layer(id: string): StyleLayer | undefined {
    return this.current.get(id);
  }

  isDrawn(id: string): boolean {
    return this.verdicts.get(id)?.drawable === true;
  }

  skippedLayers(): SkippedLayer[] {
    const out: SkippedLayer[] = [];
    for (const [id, v] of this.verdicts) {
      if (!v.drawable) {
        out.push({
          id,
          reason: v.reason,
          ...(v.detail ? { detail: v.detail } : {})
        });
      }
    }
    return out;
  }

  /** `global-state` values: the style's defaults overlaid with those set. */
  globalState(): Record<string, unknown> {
    return globalStateValues(this.style, this.state);
  }

  subscribe(fn: (change: DataOverlayChange) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(change: DataOverlayChange) {
    for (const fn of [...this.listeners]) fn(change);
  }

  private source(id: unknown): SourceVerdict {
    const plan = typeof id === 'string' ? this.sources[id] : undefined;
    if (!plan) {
      throw new DataOverlayRefusal(
        'overlays.badRequest',
        `The overlay's style has no source "${String(id)}"`
      );
    }
    return plan;
  }

  // ---------- overlay.setLayer ----------

  /**
   * Change one layer: each named paint/layout property replaces the current
   * one (null restores the declared value), `filter` replaces the filter
   * (null removes it). A result Freeboard cannot draw is refused with
   * `overlays.unsupported` and the layer is left as it was.
   */
  setLayer(params: {
    layer: unknown;
    paint?: unknown;
    layout?: unknown;
    filter?: unknown;
  }) {
    const id = params.layer;
    const declared = typeof id === 'string' ? this.declared.get(id) : undefined;
    if (!declared) {
      throw new DataOverlayRefusal(
        'overlays.badRequest',
        `The overlay's style has no layer "${String(id)}"`
      );
    }
    for (const part of ['paint', 'layout'] as const) {
      if (params[part] !== undefined && !isObject(params[part])) {
        throw new DataOverlayRefusal(
          'overlays.badRequest',
          `\`${part}\` must be an object of properties`
        );
      }
    }
    if (
      'filter' in params &&
      params.filter !== null &&
      !Array.isArray(params.filter)
    ) {
      throw new DataOverlayRefusal(
        'overlays.badRequest',
        '`filter` must be an array or null'
      );
    }
    const next = clone(this.current.get(declared.id) as StyleLayer);
    for (const part of ['paint', 'layout'] as const) {
      const changes = params[part] as Record<string, unknown> | undefined;
      if (!changes) continue;
      const props: Record<string, unknown> = { ...(next[part] ?? {}) };
      for (const [name, value] of Object.entries(changes)) {
        if (value !== null) props[name] = clone(value);
        else if (declared[part] && name in declared[part]) {
          props[name] = clone(declared[part][name]);
        } else delete props[name];
      }
      next[part] = props;
    }
    if ('filter' in params) {
      if (params.filter === null) delete next.filter;
      else next.filter = clone(params.filter);
    }
    const verdict = analyzeLayer(this.style, next, this.sources);
    if (!verdict.drawable) {
      throw new DataOverlayRefusal(
        'overlays.unsupported',
        `Layer "${declared.id}" would not be drawn: ${verdict.reason}` +
          (verdict.detail ? ` (${verdict.detail})` : '')
      );
    }
    this.current.set(declared.id, next);
    this.verdicts.set(declared.id, verdict);
    this.emit({ kind: 'layers', layers: [declared.id] });
  }

  // ---------- overlay.setState ----------

  /** Set `global-state` values; null restores a variable's default. */
  setState(values: unknown) {
    if (!isObject(values)) {
      throw new DataOverlayRefusal(
        'overlays.badRequest',
        '`values` must be an object of variable values'
      );
    }
    const next = { ...this.state };
    for (const [name, value] of Object.entries(values)) {
      if (value === null) delete next[name];
      else next[name] = clone(value);
    }
    this.state = next;
    this.emit({ kind: 'state' });
  }

  // ---------- overlay.setData ----------

  private geojsonSource(id: unknown): GeoJsonState {
    const plan = this.source(id);
    const state = this.geojson.get(id as string);
    if (!state) {
      throw new DataOverlayRefusal(
        'overlays.badRequest',
        `Source "${String(id)}" is not a usable geojson source` +
          ('error' in plan ? ` (${plan.error})` : '')
      );
    }
    return state;
  }

  private index(features: OverlayFeature[]) {
    const map = new Map<string | number | symbol, OverlayFeature>();
    for (const f of features) map.set(validId(f.id) ? f.id : Symbol(), f);
    return map;
  }

  /**
   * Replace every feature of a geojson source (`data`), or add, replace and
   * remove features by id (`upsert`, `remove`).
   */
  setData(params: {
    source: unknown;
    data?: unknown;
    upsert?: unknown;
    remove?: unknown;
  }) {
    const state = this.geojsonSource(params.source);
    const source = params.source as string;
    const hasData = params.data !== undefined;
    const hasDiff = params.upsert !== undefined || params.remove !== undefined;
    if (hasData === hasDiff) {
      throw new DataOverlayRefusal(
        'overlays.badRequest',
        hasData
          ? '`data` cannot be combined with `upsert` or `remove`'
          : 'Give `data`, or `upsert` and/or `remove`'
      );
    }
    if (hasData) {
      const features = geojsonFeatures(params.data);
      if (!features) {
        throw new DataOverlayRefusal(
          'overlays.badRequest',
          '`data` must be a GeoJSON object'
        );
      }
      const copy = clone(features);
      state.url = undefined;
      state.generation++;
      state.loading = undefined;
      state.pending = [];
      state.features = this.index(copy);
      this.emit({ kind: 'data', source, replace: copy });
      return;
    }
    const upsert = params.upsert ?? [];
    const remove = params.remove ?? [];
    if (
      !Array.isArray(upsert) ||
      !upsert.every((f) => isFeature(f) && validId(f.id))
    ) {
      throw new DataOverlayRefusal(
        'overlays.badRequest',
        '`upsert` must be a list of GeoJSON features, each with an `id`'
      );
    }
    if (!Array.isArray(remove) || !remove.every(validId)) {
      throw new DataOverlayRefusal(
        'overlays.badRequest',
        '`remove` must be a list of feature ids'
      );
    }
    const diff = {
      upsert: clone(upsert as OverlayFeature[]),
      remove: remove as (string | number)[]
    };
    // a load (or reload) to come would replace them: replay them on its data
    if (state.loading || !state.features) state.pending.push(diff);
    if (!state.features) return;
    this.applyDiff(state.features, diff);
    this.emit({ kind: 'data', source, ...diff });
  }

  private applyDiff(
    features: Map<string | number | symbol, OverlayFeature>,
    diff: { upsert?: OverlayFeature[]; remove?: (string | number)[] }
  ) {
    for (const id of diff.remove ?? []) features.delete(id);
    for (const f of diff.upsert ?? []) features.set(f.id as string | number, f);
  }

  /**
   * The current features of a geojson source, loading its URL the first time.
   * Resolves to an empty list when the URL cannot be loaded.
   */
  async features(source: string): Promise<OverlayFeature[]> {
    const state = this.geojson.get(source);
    if (!state) return [];
    if (state.features) return [...state.features.values()];
    return this.loadUrl(source, state);
  }

  private loadUrl(
    source: string,
    state: GeoJsonState
  ): Promise<OverlayFeature[]> {
    if (state.loading) return state.loading;
    const url = state.url as ResolvedUrl;
    const generation = state.generation;
    const reload = state.reload;
    state.reload = false;
    const loading = this.load(url, reload)
      .then((json) => geojsonFeatures(json) ?? [])
      .catch((err: unknown): null => {
        console.warn(`[plotterext] could not load ${url.url}:`, err);
        return null;
      })
      .then((features) => {
        // replaced or refreshed meanwhile: answer with what superseded it
        if (state.generation !== generation) return this.features(source);
        state.loading = undefined;
        // a failed reload keeps what was drawn, with the changes made meanwhile
        const map =
          features === null && state.features
            ? new Map(state.features)
            : this.index(features ?? []);
        for (const diff of state.pending) this.applyDiff(map, diff);
        state.pending = [];
        const first = !state.features;
        state.features = map;
        const all = [...map.values()];
        if (!first) this.emit({ kind: 'data', source, replace: all });
        return all;
      });
    state.loading = loading;
    return loading;
  }

  // ---------- overlay.refresh ----------

  /**
   * Fetch a source again, bypassing caches: only the listed tiles of a tiled
   * source, else all of it. A geojson source loaded from a URL reloads it.
   */
  refresh(params: { source: unknown; tiles?: unknown }) {
    const plan = this.source(params.source);
    const source = params.source as string;
    if ('error' in plan) {
      throw new DataOverlayRefusal(
        'overlays.badRequest',
        `Source "${source}" is not drawn (${plan.error})`
      );
    }
    const tiles = params.tiles;
    if (plan.type === 'geojson') {
      if (tiles !== undefined) {
        throw new DataOverlayRefusal(
          'overlays.badRequest',
          '`tiles` applies to tiled sources only'
        );
      }
      const state = this.geojson.get(source) as GeoJsonState;
      if (!state.url) return;
      state.generation++;
      state.loading = undefined;
      state.reload = true;
      // reload now if it was ever loaded; otherwise the first load is fresh
      if (state.features) void this.loadUrl(source, state);
      return;
    }
    if (tiles !== undefined && !this.validTiles(tiles)) {
      throw new DataOverlayRefusal(
        'overlays.badRequest',
        '`tiles` must be a list of [z, x, y] tiles that exist at zoom z'
      );
    }
    const fresh = this.tileFreshness(source);
    if (tiles === undefined) {
      fresh.all = true;
      fresh.dirty.clear();
      fresh.loadedSinceAll.clear();
    } else {
      for (const [z, x, y] of tiles as OverlayTileId[]) {
        const key = tileKey(z, x, y);
        fresh.dirty.add(key);
        fresh.loadedSinceAll.delete(key);
      }
    }
    this.emit({
      kind: 'refresh',
      source,
      ...(tiles !== undefined ? { tiles: clone(tiles as OverlayTileId[]) } : {})
    });
  }

  private validTiles(tiles: unknown): boolean {
    return (
      Array.isArray(tiles) &&
      tiles.every((t) => {
        if (
          !Array.isArray(t) ||
          t.length !== 3 ||
          !t.every((n) => Number.isInteger(n) && n >= 0)
        ) {
          return false;
        }
        const [z, x, y] = t as number[];
        return z <= 30 && x < 2 ** z && y < 2 ** z;
      })
    );
  }

  private tileFreshness(source: string): TileFreshness {
    let f = this.freshness.get(source);
    if (!f) {
      f = { dirty: new Set(), all: false, loadedSinceAll: new Set() };
      this.freshness.set(source, f);
    }
    return f;
  }

  /** Whether a tile must be fetched bypassing the HTTP cache. */
  needsReload(source: string, z: number, x: number, y: number): boolean {
    const f = this.freshness.get(source);
    if (!f) return false;
    const key = tileKey(z, x, y);
    return f.dirty.has(key) || (f.all && !f.loadedSinceAll.has(key));
  }

  /** A tile has been fetched; it is fresh until refreshed again. */
  markLoaded(source: string, z: number, x: number, y: number) {
    const f = this.freshness.get(source);
    if (!f) return;
    const key = tileKey(z, x, y);
    f.dirty.delete(key);
    if (f.all) f.loadedSinceAll.add(key);
  }
}
