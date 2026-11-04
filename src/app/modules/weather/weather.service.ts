import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import {
  catchError,
  finalize,
  map,
  shareReplay,
  tap,
  timeout
} from 'rxjs/operators';
import { SignalKClient } from 'signalk-client-angular';

import { WindGridNode } from './wind-field';

export interface WeatherWindSample {
  latitude: number;
  longitude: number;
  speed: number; // wind speed in m/s (Signal K native)
  direction: number; // direction wind blows from, in radians (Signal K native)
}

export interface OceanCurrentSample {
  latitude: number;
  longitude: number;
  velocity: number;
  direction: number;
}

interface OpenMeteoMarineItem {
  error?: boolean;
  current?: {
    ocean_current_velocity?: number;
    ocean_current_direction?: number;
  };
}

interface OpenMeteoForecastItem {
  error?: boolean;
  current?: {
    time?: string;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
  };
}

/** Wind at a grid node: speed in m/s, direction it blows from in degrees. */
export interface WindGridValue {
  speed: number;
  direction: number;
}

export interface WindGridResult {
  /** One entry per requested node; `null` where no wind is known. */
  values: Array<WindGridValue | null>;
  /** When the model data is valid (ms since epoch), if known. */
  time?: number;
}

interface WindGridEntry {
  at: number;
  value: WindGridValue | null;
  time?: number;
}

interface OceanCurrentValue {
  velocity: number;
  direction: number;
}

interface WindValue {
  speed: number;
  direction: number;
}

interface SkObservationWind {
  speedTrue?: number;
  directionTrue?: number;
}

interface SkObservation {
  wind?: SkObservationWind;
}

@Injectable({ providedIn: 'root' })
export class WeatherService {
  // Wind and ocean-current requests are resolved against a fixed 0.1°
  // geographic lattice (~11 km — about the resolution of the models behind
  // them, so finer sampling can only return duplicate data) with a per-cell
  // cache. Display code asks for arbitrary points; only lattice cells never
  // seen (or expired) reach the network. Both sources are rate-limited: the
  // public Open-Meteo endpoint for currents, and whatever upstream service the
  // Signal K Weather API provider calls for wind. `null` marks a cell with no
  // data (e.g. land) so it is not re-requested every pan.
  private readonly cellDeg = 0.1;
  private readonly cacheMax = 512;
  private readonly currentsCacheTtlMs = 30 * 60 * 1000;
  private currentsCache = new Map<
    string,
    { at: number; value: OceanCurrentValue | null }
  >();
  private readonly windCacheTtlMs = 10 * 60 * 1000;
  private windCache = new Map<
    string,
    { at: number; value: WindValue | null }
  >();
  // One shared request per cell while it is in flight. It runs to completion
  // even if the caller unsubscribes (the wind layer's switchMap cancels on
  // every new move), so a cell that was asked for still lands in the cache
  // and the next refresh doesn't request it again. `undefined` = failed.
  private windInflight = new Map<
    string,
    Observable<WindValue | null | undefined>
  >();
  // The wind-flow grid, keyed by node. Open-Meteo refreshes its current
  // conditions every 15 minutes, so a node is kept for 30.
  private readonly windGridTtlMs = 30 * 60 * 1000;
  private readonly windGridCacheMax = 4096;
  // Open-Meteo takes many locations per request; keep each URL well inside
  // what servers and proxies accept.
  private readonly windGridBatch = 200;
  private readonly windGridTimeoutMs = 15000;
  private windGridCache = new Map<string, WindGridEntry>();
  // The request each node is waiting on. It runs to completion even if the
  // caller unsubscribes (the layer's switchMap cancels on every new move),
  // and a later call wanting the same node waits on it instead of asking
  // again.
  private windGridInflight = new Map<string, Observable<void>>();

  constructor(
    private http: HttpClient,
    private sk: SignalKClient
  ) {}

  /** Wind for each display point, from the Signal K Weather API.
   *
   *  The API takes one position per request, so the grid the wind layer draws
   *  used to cost one request per point on every pan or zoom, and on every
   *  move of a map that follows the vessel. Points are now resolved to their
   *  0.1° lattice cell like currents: cells with a fresh cached value are
   *  served locally, and each missing cell is requested once, at its
   *  canonical centre, so a provider-side cache can also hit. Concurrent
   *  callers share a cell's in-flight request. A failed request caches
   *  nothing, so it is retried on the next refresh. */
  getWindSamples(
    points: Array<{ latitude: number; longitude: number }>
  ): Observable<WeatherWindSample[]> {
    if (points.length === 0) {
      return of([]);
    }

    const now = Date.now();
    const cellKeys = points.map((p) => this.cellKey(p));
    // Values for this call, kept apart from the cache: storing fetched cells
    // can evict others from a full cache, and a cell this result needs must
    // not disappear before the samples are built.
    const values = new Map<string, WindValue | null>();
    const missing: string[] = [];
    cellKeys.forEach((key) => {
      if (values.has(key) || missing.includes(key)) {
        return;
      }
      const entry = this.windCache.get(key);
      if (entry && now - entry.at < this.windCacheTtlMs) {
        values.set(key, entry.value);
      } else {
        missing.push(key);
      }
    });

    if (missing.length === 0) {
      return of(this.buildWindSamples(points, cellKeys, values));
    }

    return forkJoin(missing.map((key) => this.windCell(key))).pipe(
      map((fetched) => {
        fetched.forEach((value, i) => {
          if (value !== undefined) {
            values.set(missing[i], value);
          }
        });
        return this.buildWindSamples(points, cellKeys, values);
      })
    );
  }

  /** The wind for one lattice cell, from the in-flight request for that cell
   *  if there is one. Emits the cell's value, `null` for no wind there, or
   *  `undefined` when the request failed. */
  private windCell(key: string): Observable<WindValue | null | undefined> {
    const pending = this.windInflight.get(key);
    if (pending) {
      return pending;
    }
    const center = this.cellCenter(key);
    const request = this.sk.api
      .get(
        2,
        `/weather/observations?lat=${center.latitude.toFixed(4)}` +
          `&lon=${center.longitude.toFixed(4)}`
      )
      .pipe(
        map((response) => {
          const obs = (response as SkObservation[] | undefined)?.[0];
          const speed = obs?.wind?.speedTrue;
          const direction = obs?.wind?.directionTrue;
          return typeof speed === 'number' && typeof direction === 'number'
            ? { speed, direction }
            : null;
        }),
        tap((value) => this.cacheCell(this.windCache, key, value)),
        catchError(() => of(undefined)),
        finalize(() => this.windInflight.delete(key)),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    this.windInflight.set(key, request);
    return request;
  }

  /** One sample per display point, valued from its lattice cell; points whose
   *  cell has no wind (or failed to load) yield no sample. */
  private buildWindSamples(
    points: Array<{ latitude: number; longitude: number }>,
    cellKeys: string[],
    values: Map<string, WindValue | null>
  ): WeatherWindSample[] {
    const samples: WeatherWindSample[] = [];
    points.forEach((point, i) => {
      const value = values.get(cellKeys[i]);
      if (value) {
        samples.push({
          latitude: point.latitude,
          longitude: point.longitude,
          speed: value.speed,
          direction: value.direction
        });
      }
    });
    return samples;
  }

  /** Stopgap: currents not yet exposed by the SK Weather API — proxy the public
   *  Open-Meteo Marine API from the browser, transparently to the display code.
   *  Once the SK Weather API grows current support this whole retrieval layer
   *  moves server-side and only this method's internals change.
   *
   *  Each display point is resolved to its 0.1° lattice cell; cells with a
   *  fresh cached value (including "no data") are served locally and only the
   *  missing cells are fetched — one batched request at canonical cell-center
   *  coordinates, so every request ever made is for the same stable
   *  coordinate set regardless of pan or zoom. */
  getOceanCurrentSamples(
    points: Array<{ latitude: number; longitude: number }>
  ): Observable<OceanCurrentSample[]> {
    if (points.length === 0) {
      return of([]);
    }

    const now = Date.now();
    const cellKeys = points.map((p) => this.cellKey(p));
    const missing = new Map<string, { latitude: number; longitude: number }>();
    cellKeys.forEach((key) => {
      if (missing.has(key)) {
        return;
      }
      const entry = this.currentsCache.get(key);
      if (!entry || now - entry.at >= this.currentsCacheTtlMs) {
        missing.set(key, this.cellCenter(key));
      }
    });

    if (missing.size === 0) {
      return of(this.buildCurrentSamples(points, cellKeys));
    }

    const cells = Array.from(missing.entries());
    const latitudes = cells.map(([, c]) => c.latitude.toFixed(4)).join(',');
    const longitudes = cells.map(([, c]) => c.longitude.toFixed(4)).join(',');
    const url =
      'https://marine-api.open-meteo.com/v1/marine' +
      `?latitude=${latitudes}` +
      `&longitude=${longitudes}` +
      '&current=ocean_current_velocity,ocean_current_direction';

    return this.http.get<OpenMeteoMarineItem | OpenMeteoMarineItem[]>(url).pipe(
      map((response) => (Array.isArray(response) ? response : [response])),
      tap((items) => {
        // Response order mirrors request order. A rate-limit/error body
        // (error flag, or a count mismatch) must cache NOTHING — otherwise a
        // transient failure would be pinned as "no data" for the whole TTL.
        if (items.length !== cells.length || items.some((i) => i?.error)) {
          return;
        }
        items.forEach((item, i) => {
          const velocity = item?.current?.ocean_current_velocity;
          const direction = item?.current?.ocean_current_direction;
          this.cacheCell(
            this.currentsCache,
            cells[i][0],
            typeof velocity === 'number' && typeof direction === 'number'
              ? { velocity, direction }
              : null
          );
        });
      }),
      map(() => this.buildCurrentSamples(points, cellKeys)),
      // Still render whatever is already cached when the fetch fails.
      catchError(() => of(this.buildCurrentSamples(points, cellKeys)))
    );
  }

  /** Wind at each node of the wind-flow grid, from the public Open-Meteo
   *  forecast API.
   *
   *  The Signal K Weather API answers one position per request, which is
   *  fine for a handful of barbs but not for a grid of a few hundred nodes.
   *  Open-Meteo answers them all in one request, needs no key, and its
   *  default `best_match` model blends the best regional models available
   *  (AROME, ICON-D2, HRRR...) with the global ones.
   *
   *  Nodes are cached for 30 minutes. Only the nodes not in the cache are
   *  fetched, so a pan, or a zoom out to a coarser grid, costs little or
   *  nothing. A failed or rate-limited response caches nothing, and the
   *  result still carries whatever was cached. */
  getWindGrid(nodes: WindGridNode[]): Observable<WindGridResult> {
    const now = Date.now();
    const keys = nodes.map((n) => `${n.latitude},${n.longitude}`);
    const missing = new Map<string, WindGridNode>();
    keys.forEach((key, i) => {
      const entry = this.windGridCache.get(key);
      if (!entry || now - entry.at >= this.windGridTtlMs) {
        missing.set(key, nodes[i]);
      }
    });

    const build = (): WindGridResult => {
      let time: number | undefined;
      const values = keys.map((key) => {
        const entry = this.windGridCache.get(key);
        if (entry?.time !== undefined && (time ?? 0) < entry.time) {
          time = entry.time;
        }
        return entry?.value ?? null;
      });
      return { values, time };
    };

    if (missing.size === 0) {
      return of(build());
    }

    const waits = new Set<Observable<void>>();
    const toFetch: Array<[string, WindGridNode]> = [];
    missing.forEach((node, key) => {
      const pending = this.windGridInflight.get(key);
      if (pending) {
        waits.add(pending);
      } else {
        toFetch.push([key, node]);
      }
    });
    for (let i = 0; i < toFetch.length; i += this.windGridBatch) {
      waits.add(this.fetchWindBatch(toFetch.slice(i, i + this.windGridBatch)));
    }
    return forkJoin(Array.from(waits)).pipe(map(() => build()));
  }

  private fetchWindBatch(
    batch: Array<[string, WindGridNode]>
  ): Observable<void> {
    const url =
      'https://api.open-meteo.com/v1/forecast' +
      `?latitude=${batch.map(([, n]) => n.latitude).join(',')}` +
      `&longitude=${batch.map(([, n]) => n.longitude).join(',')}` +
      '&current=wind_speed_10m,wind_direction_10m' +
      '&wind_speed_unit=ms&timezone=GMT';
    const request: Observable<void> = this.http
      .get<OpenMeteoForecastItem | OpenMeteoForecastItem[]>(url)
      .pipe(
        map((response) => (Array.isArray(response) ? response : [response])),
        tap((items) => {
          // Response order mirrors request order; an error body or a count
          // mismatch must not be pinned as "no wind" for the whole TTL.
          if (items.length !== batch.length || items.some((i) => i?.error)) {
            return;
          }
          items.forEach((item, i) => {
            const speed = item?.current?.wind_speed_10m;
            const direction = item?.current?.wind_direction_10m;
            const time = item?.current?.time
              ? Date.parse(`${item.current.time}Z`)
              : NaN;
            this.cacheWindNode(batch[i][0], {
              at: Date.now(),
              value:
                typeof speed === 'number' && typeof direction === 'number'
                  ? { speed, direction }
                  : null,
              time: Number.isNaN(time) ? undefined : time
            });
          });
        }),
        map(() => undefined),
        // A stalled request would hold its nodes in flight, and every later
        // call wanting one of them would wait on it.
        timeout(this.windGridTimeoutMs),
        catchError(() => of(undefined)),
        finalize(() =>
          batch.forEach(([key]) => {
            if (this.windGridInflight.get(key) === request) {
              this.windGridInflight.delete(key);
            }
          })
        ),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    batch.forEach(([key]) => this.windGridInflight.set(key, request));
    return request;
  }

  private cacheWindNode(key: string, entry: WindGridEntry) {
    this.windGridCache.delete(key);
    if (this.windGridCache.size >= this.windGridCacheMax) {
      const oldest = this.windGridCache.keys().next().value;
      if (oldest !== undefined) {
        this.windGridCache.delete(oldest);
      }
    }
    this.windGridCache.set(key, entry);
  }

  /** One sample per display point, valued from its lattice cell; points whose
   *  cell has no data (land, or not yet fetched) yield no sample. */
  private buildCurrentSamples(
    points: Array<{ latitude: number; longitude: number }>,
    cellKeys: string[]
  ): OceanCurrentSample[] {
    const samples: OceanCurrentSample[] = [];
    points.forEach((point, i) => {
      const value = this.currentsCache.get(cellKeys[i])?.value;
      if (value) {
        samples.push({
          latitude: point.latitude,
          longitude: point.longitude,
          velocity: value.velocity,
          direction: value.direction
        });
      }
    });
    return samples;
  }

  private cellKey(point: { latitude: number; longitude: number }) {
    const x = Math.floor(point.longitude / this.cellDeg);
    const y = Math.floor(point.latitude / this.cellDeg);
    return `${x}:${y}`;
  }

  private cellCenter(key: string) {
    const [x, y] = key.split(':').map(Number);
    return {
      latitude: (y + 0.5) * this.cellDeg,
      longitude: (x + 0.5) * this.cellDeg
    };
  }

  private cacheCell<T>(
    cache: Map<string, { at: number; value: T | null }>,
    key: string,
    value: T | null
  ) {
    // Re-insert at the newest position so a refreshed entry isn't treated as
    // oldest by the size-based eviction below.
    cache.delete(key);
    if (cache.size >= this.cacheMax) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) {
        cache.delete(oldest);
      }
    }
    cache.set(key, { at: Date.now(), value });
  }
}
