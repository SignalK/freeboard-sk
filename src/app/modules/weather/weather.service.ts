import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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
  latitude: number;
  longitude: number;
  current?: {
    ocean_current_velocity?: number;
    ocean_current_direction?: number;
  };
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

  /** Stopgap: currents not yet exposed by the SK Weather API — call Open-Meteo Marine directly.
   *  Migrate to the SK Weather API once providers expose ocean_current_velocity/direction. */
  getOceanCurrentSamples(
    points: Array<{ latitude: number; longitude: number }>
  ): Observable<OceanCurrentSample[]> {
    const latitudes = points.map((p) => p.latitude.toFixed(4)).join(',');
    const longitudes = points.map((p) => p.longitude.toFixed(4)).join(',');
    const url =
      'https://marine-api.open-meteo.com/v1/marine' +
      `?latitude=${latitudes}` +
      `&longitude=${longitudes}` +
      '&current=ocean_current_velocity,ocean_current_direction';

    return this.http.get<OpenMeteoMarineItem | OpenMeteoMarineItem[]>(url).pipe(
      catchError(() => of([])),
      map((response) => (Array.isArray(response) ? response : [response])),
      map((items) =>
        items
          .filter(
            (item) =>
              typeof item.current?.ocean_current_velocity === 'number' &&
              typeof item.current?.ocean_current_direction === 'number'
          )
          .map((item) => ({
            latitude: item.latitude,
            longitude: item.longitude,
            velocity: item.current!.ocean_current_velocity,
            direction: item.current!.ocean_current_direction
          }))
      )
    );
  }
}
