import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Feature } from 'ol';
import { Point, Polygon } from 'ol/geom';

import { DefaultOptions, S57Service } from './s57.service';
import { S57Style } from './s57Style';

const chartSymbolsXml = readFileSync(
  resolve(process.cwd(), 'src/assets/s57/chartsymbols.xml'),
  'utf8'
);

const area = (layer: string) =>
  new Feature({
    geometry: new Polygon([
      [
        [0, 0],
        [0, 1],
        [1, 1],
        [0, 0]
      ]
    ]),
    layer
  });

// WRECKS is the last object class of the Symbolized area table, so its
// lookups end the sorted list built from the real chartsymbols.xml.
describe('S57Service.selectLookup — last key of the lookup list', () => {
  let service: S57Service;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(S57Service);
    service.init({ ...DefaultOptions, boundaries: 'Symbolized' });
    service.fetchSymbols();
    TestBed.inject(HttpTestingController)
      .expectOne('assets/s57/chartsymbols.xml')
      .flush(chartSymbolsXml);
  });

  it('finds a lookup for a wreck area with symbolized boundaries', () => {
    const index = service.selectLookup(area('WRECKS'));

    expect(index).toBeGreaterThanOrEqual(0);
    expect(service.getLookup(index).name).toBe('WRECKS');
  });

  it('orders a wreck area against another area', () => {
    const style = new S57Style(service);
    const features = [area('WRECKS'), area('DEPARE')];

    expect(() => features.sort(style.renderOrder)).not.toThrow();
  });
});

describe('S57Service.selectLookup — first key of the lookup list', () => {
  it('finds a lookup for the object class that starts the list', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    const service = TestBed.inject(S57Service);
    service.init({ ...DefaultOptions, graphicsStyle: 'Simplified' });
    service.fetchSymbols();
    TestBed.inject(HttpTestingController)
      .expectOne('assets/s57/chartsymbols.xml')
      .flush(chartSymbolsXml);
    const first = service.getLookup(0);
    const point = new Feature({
      geometry: new Point([0, 0]),
      layer: first.name
    });

    const index = service.selectLookup(point);

    expect(index).toBeGreaterThanOrEqual(0);
    expect(service.getLookup(index).name).toBe(first.name);
  });
});

// A tile's features keep the lookup chosen for them; the chart layer only
// redraws them when the symbols arrive or the options change.
describe('S57Style — lookups chosen before a change', () => {
  let service: S57Service;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(S57Service);
    service.init({ ...DefaultOptions });
  });

  it('styles a feature drawn before the symbols arrived once they have', () => {
    const style = new S57Style(service);
    const land = area('LNDARE');
    expect(style.getStyle(land, 10)).toBeUndefined();

    service.fetchSymbols();
    TestBed.inject(HttpTestingController)
      .expectOne('assets/s57/chartsymbols.xml')
      .flush(chartSymbolsXml);

    expect(style.getStyle(land, 10)?.length).toBeGreaterThan(0);
  });

  it('chooses a lookup again after the options change, not before', () => {
    service.fetchSymbols();
    TestBed.inject(HttpTestingController)
      .expectOne('assets/s57/chartsymbols.xml')
      .flush(chartSymbolsXml);
    const style = new S57Style(service);
    const restricted = area('RESARE');
    const select = vi.spyOn(service, 'selectLookup');

    style.getStyle(restricted, 10);
    style.getStyle(restricted, 10);
    expect(select).toHaveBeenCalledTimes(1);

    service.setOptions({ ...DefaultOptions });
    style.getStyle(restricted, 10);
    expect(select).toHaveBeenCalledTimes(1);

    service.setOptions({ ...DefaultOptions, boundaries: 'Symbolized' });
    style.getStyle(restricted, 10);
    expect(select).toHaveBeenCalledTimes(2);
  });
});
