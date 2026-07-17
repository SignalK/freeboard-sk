import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { SignalKClient } from 'signalk-client-angular';

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

interface OceanCurrentValue {
  velocity: number;
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
  // Ocean-current requests are resolved against a fixed 0.1° geographic
  // lattice (~11 km — the marine model's own resolution, so finer sampling
  // can only return duplicate data) with a per-cell cache. Display code asks
  // for arbitrary points; only lattice cells never seen (or expired) reach
  // the rate-limited public Open-Meteo endpoint. `null` marks a cell the
  // model has no data for (e.g. land) so it is not re-requested every pan.
  private readonly currentCellDeg = 0.1;
  private readonly currentsCacheTtlMs = 30 * 60 * 1000;
  private readonly currentsCacheMax = 512;
  private currentsCache = new Map<
    string,
    { at: number; value: OceanCurrentValue | null }
  >();

  constructor(
    private http: HttpClient,
    private sk: SignalKClient
  ) {}

  getWindSamples(
    points: Array<{ latitude: number; longitude: number }>
  ): Observable<WeatherWindSample[]> {
    if (points.length === 0) {
      return of([]);
    }

    const requests = points.map((point) =>
      this.sk.api
        .get(
          2,
          `/weather/observations?lat=${point.latitude}&lon=${point.longitude}`
        )
        .pipe(catchError(() => of(null)))
    );

    return forkJoin(requests).pipe(
      map((responses) => {
        const samples: WeatherWindSample[] = [];
        responses.forEach((response, i) => {
          const obs: SkObservation | undefined = response?.[0] as
            SkObservation | undefined;
          if (
            !obs?.wind ||
            typeof obs.wind.speedTrue !== 'number' ||
            typeof obs.wind.directionTrue !== 'number'
          ) {
            return;
          }
          samples.push({
            latitude: points[i].latitude,
            longitude: points[i].longitude,
            speed: obs.wind.speedTrue,
            direction: obs.wind.directionTrue
          });
        });
        return samples;
      })
    );
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
    const cellKeys = points.map((p) => this.currentCellKey(p));
    const missing = new Map<string, { latitude: number; longitude: number }>();
    cellKeys.forEach((key) => {
      if (missing.has(key)) {
        return;
      }
      const entry = this.currentsCache.get(key);
      if (!entry || now - entry.at >= this.currentsCacheTtlMs) {
        missing.set(key, this.currentCellCenter(key));
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
          this.cacheCurrentCell(
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

  private currentCellKey(point: { latitude: number; longitude: number }) {
    const x = Math.floor(point.longitude / this.currentCellDeg);
    const y = Math.floor(point.latitude / this.currentCellDeg);
    return `${x}:${y}`;
  }

  private currentCellCenter(key: string) {
    const [x, y] = key.split(':').map(Number);
    return {
      latitude: (y + 0.5) * this.currentCellDeg,
      longitude: (x + 0.5) * this.currentCellDeg
    };
  }

  private cacheCurrentCell(key: string, value: OceanCurrentValue | null) {
    // Re-insert at the newest position so a refreshed entry isn't treated as
    // oldest by the size-based eviction below.
    this.currentsCache.delete(key);
    if (this.currentsCache.size >= this.currentsCacheMax) {
      const oldest = this.currentsCache.keys().next().value;
      if (oldest !== undefined) {
        this.currentsCache.delete(oldest);
      }
    }
    this.currentsCache.set(key, { at: Date.now(), value });
  }
}
