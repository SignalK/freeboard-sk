import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { Observable, of, Subject, throwError } from 'rxjs';

import { WeatherService, WindGridResult } from './weather.service';
import { SignalKClient } from 'signalk-client-angular';

const MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';
const isMarine = (url: string) => url.startsWith(MARINE_URL);

// All in the same 0.1° lattice cell (lat [25.0,25.1), lon [-80.3,-80.2)),
// whose canonical centre is 25.0500,-80.2500.
const CELL_A_P1 = { latitude: 25.01, longitude: -80.29 };
const CELL_A_P2 = { latitude: 25.09, longitude: -80.21 };
const CELL_A_P3 = { latitude: 25.05, longitude: -80.27 };
const CELL_A_CENTER = 'latitude=25.0500&longitude=-80.2500';

// One cell north (lat [25.1,25.2)) — centre 25.1500,-80.2500.
const CELL_B_P1 = { latitude: 25.11, longitude: -80.29 };
const CELL_B_CENTER_LAT = '25.1500';

const OK_ITEM = {
  current: { ocean_current_velocity: 0.5, ocean_current_direction: 90 }
};

describe('WeatherService ocean-current lattice proxy (#522)', () => {
  let service: WeatherService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        WeatherService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SignalKClient, useValue: {} }
      ]
    });
    service = TestBed.inject(WeatherService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('collapses same-cell points into one cell-centre request and serves later points from cache', () => {
    let first;
    service
      .getOceanCurrentSamples([CELL_A_P1, CELL_A_P2])
      .subscribe((s) => (first = s));
    const req = httpMock.expectOne((r) => isMarine(r.url));
    expect(req.request.url).toContain(CELL_A_CENTER);
    req.flush(OK_ITEM);

    // Both display points valued from the one cell, at their own coordinates.
    expect(first).toEqual([
      { ...CELL_A_P1, velocity: 0.5, direction: 90 },
      { ...CELL_A_P2, velocity: 0.5, direction: 90 }
    ]);

    // A different display point in the same cell must NOT reach the network.
    let second;
    service.getOceanCurrentSamples([CELL_A_P3]).subscribe((s) => (second = s));
    httpMock.expectNone((r) => isMarine(r.url));
    expect(second).toEqual([{ ...CELL_A_P3, velocity: 0.5, direction: 90 }]);
  });

  it('fetches only the cells that are not already cached', () => {
    service.getOceanCurrentSamples([CELL_A_P1]).subscribe();
    httpMock.expectOne((r) => isMarine(r.url)).flush(OK_ITEM);

    let samples;
    service
      .getOceanCurrentSamples([CELL_A_P1, CELL_B_P1])
      .subscribe((s) => (samples = s));
    const req = httpMock.expectOne((r) => isMarine(r.url));
    expect(req.request.url).toContain(CELL_B_CENTER_LAT);
    expect(req.request.url).not.toContain('25.0500');
    req.flush({
      current: { ocean_current_velocity: 1.2, ocean_current_direction: 180 }
    });

    expect(samples).toEqual([
      { ...CELL_A_P1, velocity: 0.5, direction: 90 },
      { ...CELL_B_P1, velocity: 1.2, direction: 180 }
    ]);
  });

  it('negative-caches cells without data (land) so they are not re-requested', () => {
    let first;
    service.getOceanCurrentSamples([CELL_A_P1]).subscribe((s) => (first = s));
    httpMock.expectOne((r) => isMarine(r.url)).flush({ current: {} });
    expect(first).toEqual([]);

    let second;
    service.getOceanCurrentSamples([CELL_A_P2]).subscribe((s) => (second = s));
    httpMock.expectNone((r) => isMarine(r.url));
    expect(second).toEqual([]);
  });

  it('does not cache a rate-limited/error response — it stays retryable', () => {
    let first;
    service.getOceanCurrentSamples([CELL_A_P1]).subscribe((s) => (first = s));
    // Open-Meteo returns an error body when the hourly quota is exceeded.
    httpMock
      .expectOne((r) => isMarine(r.url))
      .flush({ error: true, reason: 'Hourly API request limit exceeded.' });
    expect(first).toEqual([]);

    let second;
    service.getOceanCurrentSamples([CELL_A_P1]).subscribe((s) => (second = s));
    httpMock.expectOne((r) => isMarine(r.url)).flush(OK_ITEM);
    expect(second).toEqual([{ ...CELL_A_P1, velocity: 0.5, direction: 90 }]);
  });

  it('still renders cached cells when fetching the missing ones fails', () => {
    service.getOceanCurrentSamples([CELL_A_P1]).subscribe();
    httpMock.expectOne((r) => isMarine(r.url)).flush(OK_ITEM);

    let samples;
    service
      .getOceanCurrentSamples([CELL_A_P1, CELL_B_P1])
      .subscribe((s) => (samples = s));
    httpMock
      .expectOne((r) => isMarine(r.url))
      .flush('rate limited', { status: 429, statusText: 'Too Many Requests' });

    expect(samples).toEqual([{ ...CELL_A_P1, velocity: 0.5, direction: 90 }]);
  });
});

describe('WeatherService wind lattice cache', () => {
  let service: WeatherService;
  let calls: string[];
  let reply: (path: string) => Observable<unknown>;

  const OBS = (speedTrue: number, directionTrue: number) => [
    { wind: { speedTrue, directionTrue } }
  ];

  beforeEach(() => {
    calls = [];
    reply = () => of(OBS(5, 1));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        WeatherService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SignalKClient,
          useValue: {
            api: {
              get: (_version: number, path: string) => {
                calls.push(path);
                return reply(path);
              }
            }
          }
        }
      ]
    });
    service = TestBed.inject(WeatherService);
  });

  it('asks once per lattice cell, at its centre, and values every point in it', () => {
    let samples;
    service
      .getWindSamples([CELL_A_P1, CELL_A_P2, CELL_A_P3])
      .subscribe((s) => (samples = s));
    expect(calls).toEqual(['/weather/observations?lat=25.0500&lon=-80.2500']);
    expect(samples).toEqual([
      { ...CELL_A_P1, speed: 5, direction: 1 },
      { ...CELL_A_P2, speed: 5, direction: 1 },
      { ...CELL_A_P3, speed: 5, direction: 1 }
    ]);
  });

  it('serves a later pan from cache and only fetches the new cells', () => {
    service.getWindSamples([CELL_A_P1]).subscribe();
    calls = [];
    let samples;
    service
      .getWindSamples([CELL_A_P2, CELL_B_P1])
      .subscribe((s) => (samples = s));
    expect(calls).toEqual(['/weather/observations?lat=25.1500&lon=-80.2500']);
    expect(samples).toEqual([
      { ...CELL_A_P2, speed: 5, direction: 1 },
      { ...CELL_B_P1, speed: 5, direction: 1 }
    ]);
  });

  it('negative-caches a cell whose observation has no wind', () => {
    reply = () => of([{}]);
    let first;
    service.getWindSamples([CELL_A_P1]).subscribe((s) => (first = s));
    expect(first).toEqual([]);
    calls = [];
    service.getWindSamples([CELL_A_P2]).subscribe();
    expect(calls).toEqual([]);
  });

  it('does not cache a failed request, so the next refresh retries it', () => {
    reply = () => throwError(() => new Error('Open-Meteo HTTP 429'));
    let first;
    service.getWindSamples([CELL_A_P1]).subscribe((s) => (first = s));
    expect(first).toEqual([]);
    reply = () => of(OBS(7, 2));
    let second;
    service.getWindSamples([CELL_A_P1]).subscribe((s) => (second = s));
    expect(calls.length).toBe(2);
    expect(second).toEqual([{ ...CELL_A_P1, speed: 7, direction: 2 }]);
  });

  it('still renders cached cells when the missing ones fail', () => {
    service.getWindSamples([CELL_A_P1]).subscribe();
    reply = () => throwError(() => new Error('Open-Meteo HTTP 429'));
    let samples;
    service
      .getWindSamples([CELL_A_P1, CELL_B_P1])
      .subscribe((s) => (samples = s));
    expect(samples).toEqual([{ ...CELL_A_P1, speed: 5, direction: 1 }]);
  });
  it('shares one in-flight request per cell between concurrent callers', () => {
    const pending = new Subject<unknown>();
    reply = () => pending;
    let first;
    let second;
    service.getWindSamples([CELL_A_P1]).subscribe((s) => (first = s));
    service.getWindSamples([CELL_A_P2]).subscribe((s) => (second = s));
    expect(calls.length).toBe(1);
    pending.next(OBS(5, 1));
    pending.complete();
    expect(first).toEqual([{ ...CELL_A_P1, speed: 5, direction: 1 }]);
    expect(second).toEqual([{ ...CELL_A_P2, speed: 5, direction: 1 }]);
  });

  it('still caches a cell when the caller cancels (switchMap on a new move)', () => {
    const pending = new Subject<unknown>();
    reply = () => pending;
    service.getWindSamples([CELL_A_P1]).subscribe().unsubscribe();
    pending.next(OBS(5, 1));
    pending.complete();
    calls = [];
    let samples;
    service.getWindSamples([CELL_A_P2]).subscribe((s) => (samples = s));
    expect(calls).toEqual([]);
    expect(samples).toEqual([{ ...CELL_A_P2, speed: 5, direction: 1 }]);
  });

  it('keeps every cell of a result even when fetching overflows the cache', () => {
    // 600 distinct cells in one call, more than the 512-cell cache holds.
    const points = Array.from({ length: 600 }, (_, i) => ({
      latitude: 10 + Math.floor(i / 30) * 0.1 + 0.05,
      longitude: 20 + (i % 30) * 0.1 + 0.05
    }));
    let samples: unknown[] = [];
    service.getWindSamples(points).subscribe((s) => (samples = s));
    expect(calls.length).toBe(600);
    expect(samples.length).toBe(600);
  });
});

describe('WeatherService wind-flow grid (Open-Meteo forecast)', () => {
  const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
  const isForecast = (url: string) => url.startsWith(FORECAST_URL);
  const node = (latitude: number, longitude: number) => ({
    latitude,
    longitude
  });
  const item = (speed: number, direction: number) => ({
    current: {
      time: '2026-11-03T12:15',
      wind_speed_10m: speed,
      wind_direction_10m: direction
    }
  });

  let service: WeatherService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        WeatherService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SignalKClient, useValue: {} }
      ]
    });
    service = TestBed.inject(WeatherService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('asks for every node in one request, in m/s, and values them in order', () => {
    let result;
    service
      .getWindGrid([node(46, -5), node(46, -4.75)])
      .subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => isForecast(r.url));
    expect(req.request.url).toContain('latitude=46,46');
    expect(req.request.url).toContain('longitude=-5,-4.75');
    expect(req.request.url).toContain('wind_speed_unit=ms');
    req.flush([item(5, 270), item(7, 280)]);

    expect(result).toEqual({
      values: [
        { speed: 5, direction: 270 },
        { speed: 7, direction: 280 }
      ],
      time: Date.UTC(2026, 10, 3, 12, 15)
    });
  });

  it('fetches only the nodes not already cached', () => {
    service.getWindGrid([node(46, -5)]).subscribe();
    httpMock.expectOne((r) => isForecast(r.url)).flush(item(5, 270));

    let result;
    service
      .getWindGrid([node(46, -5), node(46.25, -5)])
      .subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => isForecast(r.url));
    expect(req.request.url).toContain('latitude=46.25&');
    req.flush(item(6, 260));
    expect(result!.values).toEqual([
      { speed: 5, direction: 270 },
      { speed: 6, direction: 260 }
    ]);

    // Fully cached: no request at all.
    service.getWindGrid([node(46.25, -5)]).subscribe();
    httpMock.expectNone((r) => isForecast(r.url));
  });

  it('asks once for a node repeated in another world copy', () => {
    service.getWindGrid([node(0, 179.75), node(0, 179.75)]).subscribe();
    const req = httpMock.expectOne((r) => isForecast(r.url));
    expect(req.request.url).toContain('longitude=179.75&');
    req.flush(item(3, 90));
  });

  it('splits a large grid into several requests', () => {
    const nodes = Array.from({ length: 450 }, (_, i) => node(0, i * 0.25));
    const emitted: WindGridResult[] = [];
    service.getWindGrid(nodes).subscribe((r) => emitted.push(r));
    const reqs = httpMock.match((r) => isForecast(r.url));
    expect(reqs.length).toBe(3);
    reqs.forEach((r) => {
      const count = new URL(r.request.url).searchParams
        .get('latitude')!
        .split(',').length;
      r.flush(Array.from({ length: count }, () => item(1, 0)));
    });
    expect(emitted).toHaveLength(1);
    expect(emitted[0].values).toHaveLength(450);
    expect(emitted[0].values.every((v) => v?.speed === 1)).toBe(true);
  });

  it('shares a node already being fetched with an overlapping call', () => {
    let first: WindGridResult | undefined;
    let second: WindGridResult | undefined;
    service
      .getWindGrid([node(46, -5), node(46, -4.75)])
      .subscribe((r) => (first = r));
    service
      .getWindGrid([node(46, -4.75), node(46, -4.5)])
      .subscribe((r) => (second = r));
    const reqs = httpMock.match((r) => isForecast(r.url));
    expect(reqs.length).toBe(2);
    expect(reqs[1].request.url).toContain('longitude=-4.5&');
    reqs[0].flush([item(5, 270), item(6, 270)]);
    reqs[1].flush(item(7, 270));
    expect(first!.values.map((v) => v?.speed)).toEqual([5, 6]);
    expect(second!.values.map((v) => v?.speed)).toEqual([6, 7]);
  });

  it('still caches a node when the caller cancels (switchMap on a new move)', () => {
    service
      .getWindGrid([node(46, -5)])
      .subscribe()
      .unsubscribe();
    httpMock.expectOne((r) => isForecast(r.url)).flush(item(5, 270));

    let result;
    service.getWindGrid([node(46, -5)]).subscribe((r) => (result = r));
    httpMock.expectNone((r) => isForecast(r.url));
    expect(result!.values).toEqual([{ speed: 5, direction: 270 }]);
  });

  it('gives up on a stalled request, so a later call asks again', () => {
    vi.useFakeTimers();
    try {
      let result;
      service.getWindGrid([node(46, -5)]).subscribe((r) => (result = r));
      const stalled = httpMock.expectOne((r) => isForecast(r.url));
      vi.advanceTimersByTime(15000);
      expect(stalled.cancelled).toBe(true);
      expect(result).toEqual({ values: [null], time: undefined });

      service.getWindGrid([node(46, -5)]).subscribe();
      httpMock.expectOne((r) => isForecast(r.url)).flush(item(5, 270));
    } finally {
      vi.useRealTimers();
    }
  });

  it('caches nothing from a rate-limited response, and still answers', () => {
    let result;
    service.getWindGrid([node(46, -5)]).subscribe((r) => (result = r));
    httpMock
      .expectOne((r) => isForecast(r.url))
      .flush({ error: true, reason: 'Too many requests' });
    expect(result).toEqual({ values: [null], time: undefined });

    service.getWindGrid([node(46, -5)]).subscribe();
    httpMock.expectOne((r) => isForecast(r.url)).flush(item(5, 270));
  });

  it('answers with what is cached when the request fails', () => {
    service.getWindGrid([node(46, -5)]).subscribe();
    httpMock.expectOne((r) => isForecast(r.url)).flush(item(5, 270));

    let result;
    service
      .getWindGrid([node(46, -5), node(47, -5)])
      .subscribe((r) => (result = r));
    httpMock
      .expectOne((r) => isForecast(r.url))
      .flush('down', { status: 503, statusText: 'Unavailable' });
    expect(result!.values).toEqual([{ speed: 5, direction: 270 }, null]);
  });
});
