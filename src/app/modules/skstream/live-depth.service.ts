/** Live depth layer data.
 *
 * Two sources, chosen by `mode`:
 *
 * - **history** — queries the Signal K History API for the own vessel's
 *   position and depth over a recent window and exposes the samples. The Track
 *   API is deliberately not used: on servers whose track provider does not
 *   co-record depth it costs seconds per query just to find a time span,
 *   whereas the History API returns position and depth together and cheaply.
 * - **tiles** — reads the LiveDepth plugin's gridded bathymetry tiles for the
 *   current view (a server-side store built from the whole record), and, using
 *   the same tile algorithm, extends them client-side from the live
 *   position/depth stream so the newest soundings appear before the server's
 *   next flush.
 *
 * The fetched/aggregated samples are published whole (not clipped to the
 * viewport), so the field is built from the data alone and panning and zooming
 * do not move it.
 */

import {
  computed,
  effect,
  inject,
  Injectable,
  signal,
  untracked
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SignalKClient } from 'signalk-client-angular';
import { Observable, Subscription, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SKStreamFacade } from './skstream.facade';
import {
  DEFAULT_MERGE_TOLERANCE,
  DEFAULT_SAFETY_DEPTH_M,
  DEFAULT_SHADE_LIMIT_M,
  DepthHistoryRow,
  DepthSample,
  historyValuesQuery,
  parseDepthSeries
} from './live-depth';
import {
  BASE_ZOOM,
  MIN_ZOOM,
  TransducerOffset,
  correctToTransducer,
  createMemoryTileStore,
  createTileAccumulator,
  cellsToSamples,
  decodeTileSamples,
  tileRangeForBbox,
  zoomForCellSize,
  type TileMeta
} from 'signalk-livedepth-tiles';

/** Settle time before a moved view or a changed window is fetched. */
export const LIVE_DEPTH_DEBOUNCE = 400;
/** Default interval between refreshes while the layer is shown. */
export const LIVE_DEPTH_POLL_MS = 15000;
/** Most samples a history query may return; a finer interval over a longer
 * window is clamped to this, to bound the response. */
export const LIVE_DEPTH_MAX_POINTS = 100000;
/** Default look-back window, in hours. */
export const DEFAULT_HISTORY_WINDOW_HOURS = 1;
/** Default sample interval, in seconds. */
export const DEFAULT_HISTORY_RESOLUTION_S = 0.1;
/** Signal K path depth is read from when none is configured. */
export const DEFAULT_DEPTH_PATH = 'environment.depth.belowTransducer';
/** Plugin id the tile source reads from — the LiveDepth plugin is the only
 * server-side module that serves these tiles. */
export const LIVEDEPTH_PLUGIN_ID = 'signalk-livedepth-plugin';
/** How often live soundings are folded into the client tile store. */
export const LIVE_TILE_FLUSH_MS = 1000;
/** Most tiles fetched for one view; a coarser level is used if a finer one
 * would need more. */
export const MAX_TILE_FETCHES = 24;

/** How the LiveDepth layer gets its data. */
export type LiveDepthMode = 'history' | 'tiles';

@Injectable({ providedIn: 'root' })
export class LiveDepthService {
  private signalk = inject(SignalKClient);
  private skstream = inject(SKStreamFacade);
  private http = inject(HttpClient);

  /** Whether the layer is shown; drives fetching and polling. */
  readonly enabled = signal(false);
  /** Where the depth data comes from: the History API or LiveDepth tiles. */
  readonly mode = signal<LiveDepthMode>('history');
  /** Signal K path the depth is read from, in History mode. */
  readonly depthPath = signal(DEFAULT_DEPTH_PATH);
  /** The depth path the LiveDepth plugin records (from its `/bathymetry/meta`),
   * null until answered. In tile mode the server decides the path; the client
   * mirrors it so the live extension reads the same measurement. */
  readonly tileDepthPath = signal<string | null>(null);
  /** The depth path actually in use: the plugin's in tile mode, the setting in
   * History mode. Used to read the live stream and to look up display units. */
  readonly effectiveDepthPath = computed(() =>
    this.mode() === 'tiles'
      ? (this.tileDepthPath() ?? this.depthPath())
      : this.depthPath()
  );
  /** How far back to fetch, in hours. */
  readonly historyWindowHours = signal(DEFAULT_HISTORY_WINDOW_HOURS);
  /** Sample interval to ask for, in seconds (fractional allowed). */
  readonly historyResolutionS = signal(DEFAULT_HISTORY_RESOLUTION_S);
  /** Grid cell size / max circle radius, screen pixels. */
  readonly cellPx = signal(24);
  /** Samples at or below this depth (metres) are marked individually. */
  readonly safetyDepthMetres = signal(DEFAULT_SAFETY_DEPTH_M);
  /** Depth (metres) the shading runs to; deeper is left to the chart. */
  readonly shadeLimitMetres = signal(DEFAULT_SHADE_LIMIT_M);
  /** Depth (metres) between isobars; a contour is drawn at each multiple. */
  readonly contourIntervalMetres = signal(1);
  /** Samples deeper than this (metres) are not drawn. */
  readonly maxDepthMetres = signal(100);
  /** Fractional depth difference within which adjacent cells merge into one
   * circle (0.15 = 15%). */
  readonly mergeTolerance = signal(DEFAULT_MERGE_TOLERANCE);
  /** Layer opacity (0-1). */
  readonly opacity = signal(0.85);
  /** Refresh interval while shown. */
  readonly pollIntervalMs = signal(LIVE_DEPTH_POLL_MS);
  /** Bumped by {@link applyConfig}, so the layer can redraw on any setting
   * change even if a single input's value happens to be unchanged. */
  readonly revision = signal(0);
  /** Depth-at-position samples for the current view. */
  readonly samples = signal<DepthSample[]>([]);

  // the history series last fetched; published whole so the field is
  // view-independent
  private series: DepthHistoryRow[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;
  private poller: ReturnType<typeof setInterval> | undefined;
  // latest response wins: an older answer never replaces a newer one
  private generation = 0;
  // the path/window/interval the series came from
  private sourceKey = '';
  private sourceEpoch = 0;

  // ******** tile source ********
  // The viewport the layer wants tiles for, and the field's target ground cell
  // size, both reported by the layer as it redraws.
  private viewBbox: [number, number, number, number] | null = null;
  private viewCellMetres = 0;
  private tileMeta: TileMeta | null = null;
  /** Offset from the position the server reports to the transducer, from the
   * plugin's meta; null when the plugin does not correct. Applied to our own
   * soundings so they match the (already-corrected) server tiles. */
  private transducer: TransducerOffset | null = null;
  private tileSamples: DepthSample[] = [];
  private lastTileZoom = 0;
  // Client-side mirror of the server store: the same base-level accumulation
  // and min-pooled ancestors, built from the live stream.
  private clientStore = createMemoryTileStore();
  private clientAccumulator = createTileAccumulator(this.clientStore);
  private liveDirty = false;
  private liveFlushTimer: ReturnType<typeof setInterval> | undefined;
  private liveSub: Subscription | undefined;

  constructor() {
    // Changing the path, window or interval invalidates the held series: it
    // describes the old query.
    effect(() => {
      const key = `${this.depthPath()}|${this.historyWindowHours()}|${this.historyResolutionS()}`;
      untracked(() => {
        if (key !== this.sourceKey) {
          this.sourceKey = key;
          this.sourceEpoch++;
          this.clear();
          if (this.enabled()) {
            this.schedule();
          }
        }
      });
    });
  }

  setEnabled(on: boolean) {
    if (this.enabled() === on) {
      return;
    }
    this.enabled.set(on);
    if (on) {
      this.startPoll();
      this.startLive();
      this.schedule();
    } else {
      this.stopPoll();
      this.stopLive();
      this.clear();
    }
  }

  setDepthPath(path: string) {
    if (path && path !== this.depthPath()) {
      this.depthPath.set(path);
    }
  }

  setMode(mode: LiveDepthMode) {
    if (mode === this.mode()) {
      return;
    }
    this.mode.set(mode);
    this.clear();
    if (mode === 'tiles') {
      this.startLive();
    } else {
      this.stopLive();
    }
    if (this.enabled()) {
      this.schedule();
    }
  }

  /** The layer reports the view it wants tiles for (lon/lat bbox and the
   * field's target ground cell size, in metres) as it redraws. */
  setView(bbox: readonly number[], cellMetres: number) {
    if (bbox.length !== 4 || !(cellMetres > 0)) {
      return;
    }
    const next = [bbox[0], bbox[1], bbox[2], bbox[3]] as [
      number,
      number,
      number,
      number
    ];
    // The layer pads the box well beyond the view, so a small pan stays within
    // the fetched tiles; only re-fetch once it has moved a good part of a box.
    const span = Math.max(next[2] - next[0], next[3] - next[1]);
    const moved =
      !this.viewBbox ||
      next.some((v, i) => Math.abs(v - this.viewBbox![i]) > span * 0.25);
    const finer =
      Math.abs(cellMetres - this.viewCellMetres) / cellMetres > 0.01;
    this.viewBbox = next;
    this.viewCellMetres = cellMetres;
    if ((moved || finer) && this.enabled() && this.mode() === 'tiles') {
      this.schedule();
    }
  }

  /** Apply the persisted LiveDepth settings from the app config. */
  applyConfig(cfg: {
    enabled: boolean;
    mode?: string;
    source: string;
    historyWindow: number;
    historyResolution: number;
    safetyDepth: number;
    shadeLimit: number;
    contourInterval: number;
    maxDepth: number;
    cellPx: number;
    opacity: number;
    mergeTolerance: number;
  }) {
    this.setDepthPath(cfg.source);
    this.setMode(cfg.mode === 'tiles' ? 'tiles' : 'history');
    this.historyWindowHours.set(
      cfg.historyWindow > 0 ? cfg.historyWindow : DEFAULT_HISTORY_WINDOW_HOURS
    );
    this.historyResolutionS.set(
      cfg.historyResolution > 0
        ? cfg.historyResolution
        : DEFAULT_HISTORY_RESOLUTION_S
    );
    this.cellPx.set(cfg.cellPx);
    this.safetyDepthMetres.set(cfg.safetyDepth);
    this.shadeLimitMetres.set(cfg.shadeLimit);
    this.contourIntervalMetres.set(
      cfg.contourInterval > 0 ? cfg.contourInterval : 1
    );
    this.maxDepthMetres.set(cfg.maxDepth);
    this.opacity.set(cfg.opacity);
    this.mergeTolerance.set(cfg.mergeTolerance / 100);
    this.setEnabled(cfg.enabled);
    this.revision.update((n) => n + 1);
  }

  /** Drop everything held and supersede any request in flight. */
  clear() {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.generation++;
    this.series = [];
    this.tileSamples = [];
    this.tileMeta = null;
    this.transducer = null;
    this.clientStore.clear();
    this.clientAccumulator = createTileAccumulator(this.clientStore);
    this.liveDirty = false;
    if (this.samples().length !== 0) {
      this.samples.set([]);
    }
  }

  private startPoll() {
    this.stopPoll();
    this.poller = setInterval(() => {
      if (!document.hidden) {
        this.schedule();
      }
    }, this.pollIntervalMs());
  }

  private stopPoll() {
    clearInterval(this.poller);
    this.poller = undefined;
  }

  private schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.fetch(), LIVE_DEPTH_DEBOUNCE);
  }

  private fetch() {
    if (!this.enabled()) {
      return;
    }
    if (this.mode() === 'tiles') {
      this.fetchTiles();
      return;
    }
    // History mode still needs the plugin's meta for the transducer offset.
    this.withMeta(() => {
      if (this.enabled() && this.mode() === 'history') {
        this.fetchHistory();
      }
    });
  }

  /** Run `fn` once the plugin's meta is loaded — immediately if it already is,
   * or if there is no plugin to ask. */
  private withMeta(fn: () => void) {
    if (this.tileMeta) {
      fn();
      return;
    }
    const url = this.pluginUrl('/bathymetry/meta');
    if (!url) {
      fn();
      return;
    }
    this.http.get<TileMeta>(url, { withCredentials: true }).subscribe({
      next: (meta) => {
        this.applyMeta(meta);
        fn();
      },
      error: () => fn()
    });
  }

  private applyMeta(meta: TileMeta) {
    this.tileMeta = meta;
    if (meta.depthPath) {
      this.tileDepthPath.set(meta.depthPath);
    }
    this.transducer = meta.transducer ?? null;
  }

  // ******** history source ********

  private fetchHistory() {
    const path = this.depthPath();
    const windowMs = this.historyWindowHours() * 3600000;
    const to = Date.now();
    const resolutionS = Math.max(
      this.historyResolutionS(),
      windowMs / 1000 / LIVE_DEPTH_MAX_POINTS
    );
    if (resolutionS !== this.historyResolutionS()) {
      console.warn(
        `Live depth: sample interval raised to ${resolutionS.toFixed(2)}s to keep the ` +
          `window within ${LIVE_DEPTH_MAX_POINTS} points.`
      );
    }
    const query = historyValuesQuery({
      depthPath: path,
      from: to - windowMs,
      to,
      resolution: Number(resolutionS.toPrecision(3))
    });
    const req = this.signalk.api.get(2, `/history/values?${query}`);
    if (!req) {
      return;
    }
    const token = ++this.generation;
    const epoch = this.sourceEpoch;
    req.subscribe({
      next: (result) => {
        if (token !== this.generation || epoch !== this.sourceEpoch) {
          return;
        }
        this.series = parseDepthSeries(result, path);
        this.publish();
      },
      error: () => {
        if (token === this.generation) {
          console.warn('Live depth: history request failed');
        }
      }
    });
  }

  /** Publish the whole fetched series. It is not clipped to the viewport: the
   * field is built from the data alone, so panning and zooming do not change it
   * (and the absolute-depth isobars stay put). */
  private publish() {
    const samples: DepthSample[] = [];
    this.series.forEach((row) => {
      if (row.position) {
        const { lon, lat } = this.correct(
          row.position[0],
          row.position[1],
          row.heading
        );
        samples.push({ lon, lat, depth: row.depth });
      }
    });
    this.samples.set(samples);
  }

  /** Shift a sounding from the position the server reports to the transducer,
   * when the plugin told us to correct. */
  private correct(lon: number, lat: number, heading: number | undefined) {
    return this.transducer
      ? correctToTransducer({ lon, lat }, heading, this.transducer)
      : { lon, lat };
  }

  // ******** tile source ********

  private fetchTiles() {
    if (this.mode() !== 'tiles') {
      return;
    }
    const bbox = this.viewBbox;
    if (!bbox || !(this.viewCellMetres > 0)) {
      return;
    }
    const metaUrl = this.pluginUrl('/bathymetry/meta');
    if (!metaUrl) {
      return;
    }
    const token = ++this.generation;
    const metaReq = this.tileMeta
      ? of(this.tileMeta)
      : this.http.get<TileMeta>(metaUrl, { withCredentials: true });
    metaReq.subscribe({
      next: (meta) => {
        if (token !== this.generation) {
          return;
        }
        this.applyMeta(meta);
        this.loadTileRange(meta, bbox, token);
      },
      error: () => {
        if (token === this.generation) {
          console.warn('Live depth: LiveDepth plugin not reachable');
        }
      }
    });
  }

  private loadTileRange(
    meta: TileMeta,
    bbox: [number, number, number, number],
    token: number
  ) {
    const zoom = this.chooseZoom(bbox, meta);
    this.lastTileZoom = zoom;
    const range = this.tileRange(bbox, zoom);
    if (!range) {
      // The view is larger than the coarsest level can cover in a bounded
      // number of requests; draw nothing rather than fire thousands of them.
      this.tileSamples = [];
      this.publishTiles();
      return;
    }
    const { xs, ys } = range;
    const requests: Observable<DepthSample[]>[] = [];
    for (const x of xs) {
      for (const y of ys) {
        const url = this.pluginUrl(`/bathymetry/tiles/${zoom}/${x}/${y}`);
        if (!url) {
          continue;
        }
        requests.push(
          this.http
            .get(url, { responseType: 'arraybuffer', withCredentials: true })
            .pipe(
              map((buf) =>
                decodeTileSamples(
                  zoom,
                  x,
                  y,
                  new Uint8Array(buf as ArrayBuffer)
                )
              ),
              // A tile with no soundings is a 404; treat it as empty.
              catchError(() => of([] as DepthSample[]))
            )
        );
      }
    }
    if (requests.length === 0) {
      this.tileSamples = [];
      this.publishTiles();
      return;
    }
    forkJoin(requests).subscribe({
      next: (all) => {
        if (token !== this.generation) {
          return;
        }
        this.tileSamples = all.flat();
        this.publishTiles();
      }
    });
  }

  /** The finest served level whose cells are no coarser than the field wants,
   * stepped coarser until the view needs no more than {@link MAX_TILE_FETCHES}
   * tiles. */
  private chooseZoom(bbox: readonly number[], meta: TileMeta): number {
    const min = meta.minZoom ?? MIN_ZOOM;
    const base = meta.baseZoom ?? BASE_ZOOM;
    let zoom = zoomForCellSize(this.viewCellMetres, min, base);
    while (zoom > min) {
      const { xs, ys } = tileRangeForBbox(bbox, zoom);
      if (xs.length * ys.length <= MAX_TILE_FETCHES) {
        break;
      }
      zoom--;
    }
    return zoom;
  }

  /** The tiles covering the view at `zoom`, or null when that would be more
   * than {@link MAX_TILE_FETCHES}. A zoomed-out view can need thousands of
   * tiles at the coarsest served level; fetching (or even iterating) that many
   * locks the tab up, so the layer shows nothing instead. */
  private tileRange(
    bbox: readonly number[],
    zoom: number
  ): { xs: number[]; ys: number[] } | null {
    const { xs, ys } = tileRangeForBbox(bbox, zoom);
    return xs.length * ys.length <= MAX_TILE_FETCHES ? { xs, ys } : null;
  }

  /** Publish the server tiles plus the client-side live extension, read at the
   * same level so the two line up. */
  private publishTiles() {
    const samples = [...this.tileSamples];
    const bbox = this.viewBbox;
    const range =
      bbox && this.lastTileZoom
        ? this.tileRange(bbox, this.lastTileZoom)
        : null;
    if (range) {
      for (const x of range.xs) {
        for (const y of range.ys) {
          const cells = this.clientStore.read(this.lastTileZoom, x, y);
          if (cells && cells.size) {
            samples.push(...cellsToSamples(this.lastTileZoom, x, y, cells));
          }
        }
      }
    }
    this.samples.set(samples);
  }

  private pluginUrl(path: string): string | null {
    const endpoints = this.signalk.server?.endpoints as
      Record<string, Record<string, string>> | undefined;
    const http = endpoints?.['v1']?.['signalk-http'];
    if (!http) {
      return null;
    }
    let origin: string;
    try {
      origin = new URL(http).origin;
    } catch {
      return null;
    }
    return `${origin}/plugins/${LIVEDEPTH_PLUGIN_ID}${path}`;
  }

  // ******** live stream (tile source) ********

  /** Extend the client tile store from the own vessel's live position and
   * depth, which arrive over the app's existing Signal K stream (the worker
   * subscribes to `environment.depth.*` and keeps it on the vessel). Only used
   * by the tile source; the history source reads recorded data instead. */
  private startLive() {
    if (this.liveSub || this.mode() !== 'tiles' || !this.enabled()) {
      return;
    }
    this.liveSub = this.skstream.vessels$().subscribe(() => this.sampleLive());
    this.liveFlushTimer = setInterval(
      () => this.flushLive(),
      LIVE_TILE_FLUSH_MS
    );
  }

  private stopLive() {
    this.liveSub?.unsubscribe();
    this.liveSub = undefined;
    clearInterval(this.liveFlushTimer);
    this.liveFlushTimer = undefined;
  }

  /** Fold the latest own-vessel fix into the client tile store. */
  private sampleLive() {
    const self = this.skstream.selfVessel;
    const position = self?.position;
    const depth = self?.properties?.[this.effectiveDepthPath()];
    if (
      !position ||
      position.length < 2 ||
      typeof depth !== 'number' ||
      !Number.isFinite(depth)
    ) {
      return;
    }
    const { lon, lat } = this.correct(
      position[0],
      position[1],
      self?.headingTrue
    );
    this.clientAccumulator.add({ lon, lat, depth });
    this.liveDirty = true;
  }

  private flushLive() {
    if (!this.liveDirty) {
      return;
    }
    this.liveDirty = false;
    this.clientAccumulator.flush();
    if (this.mode() === 'tiles' && this.enabled()) {
      this.publishTiles();
    }
  }
}
