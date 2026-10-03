import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { Observable, of, Subject, throwError } from 'rxjs';

import { WeatherService } from './weather.service';
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
