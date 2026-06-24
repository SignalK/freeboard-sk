import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface RainViewerFrame {
  time: number;
  path: string;
}

interface RainViewerWeatherMaps {
  host: string;
  radar?: {
    past?: RainViewerFrame[];
  };
}

export interface WeatherWindSample {
  latitude: number;
  longitude: number;
  speed: number;
  direction: number;
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

interface OpenMeteoWindItem {
  latitude: number;
  longitude: number;
  current?: {
    wind_speed_10m?: number;
    wind_direction_10m?: number;
  };
}

@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly rainViewerApi =
    'https://api.rainviewer.com/public/weather-maps.json';

  constructor(private http: HttpClient) {}

  getLatestRainViewerRadarUrl(): Observable<string> {
    return this.http.get<RainViewerWeatherMaps>(this.rainViewerApi).pipe(
      map((weatherMaps) => {
        const latest = this.getLatestPastRadarFrame(weatherMaps);
        return `${weatherMaps.host}${latest.path}/256/{z}/{x}/{y}/7/1_1.png`;
      })
    );
  }

  getOpenMeteoWindSamples(
    points: Array<{ latitude: number; longitude: number }>
  ): Observable<WeatherWindSample[]> {
    const latitudes = points.map((p) => p.latitude.toFixed(4)).join(',');
    const longitudes = points.map((p) => p.longitude.toFixed(4)).join(',');
    const url =
      'https://api.open-meteo.com/v1/forecast' +
      `?latitude=${latitudes}` +
      `&longitude=${longitudes}` +
      '&current=wind_speed_10m,wind_direction_10m' +
      '&wind_speed_unit=kn';

    return this.http
      .get<OpenMeteoWindItem | OpenMeteoWindItem[]>(url)
      .pipe(
        map((response) => (Array.isArray(response) ? response : [response])),
        map((items) =>
          items
            .filter(
              (item) =>
                typeof item.current?.wind_speed_10m === 'number' &&
                typeof item.current?.wind_direction_10m === 'number'
            )
            .map((item) => ({
              latitude: item.latitude,
              longitude: item.longitude,
              speed: item.current!.wind_speed_10m,
              direction: item.current!.wind_direction_10m
            }))
        )
      );
  }

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

    return this.http
      .get<OpenMeteoMarineItem | OpenMeteoMarineItem[]>(url)
      .pipe(
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

  private getLatestPastRadarFrame(
    weatherMaps: RainViewerWeatherMaps
  ): RainViewerFrame {
    const frames = weatherMaps.radar?.past ?? [];
    if (frames.length === 0) {
      throw new Error('No RainViewer past radar frames available.');
    }
    return frames.reduce((latest, frame) =>
      frame.time > latest.time ? frame : latest
    );
  }
}
