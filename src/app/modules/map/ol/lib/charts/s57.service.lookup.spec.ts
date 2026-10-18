import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Feature } from 'ol';
import { Polygon } from 'ol/geom';

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
