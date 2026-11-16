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
import { FeatureLike } from 'ol/Feature';
import { LineString, MultiLineString, MultiPolygon, Polygon } from 'ol/geom';

import { DefaultOptions, GeometryType, S57Service } from './s57.service';
import { S57Style } from './s57Style';

const chartSymbolsXml = readFileSync(
  resolve(process.cwd(), 'src/assets/s57/chartsymbols.xml'),
  'utf8'
);

const line = (layer: string) =>
  new Feature({
    geometry: new LineString([
      [0, 0],
      [1, 1],
      [2, 1]
    ]),
    layer
  });

// The same line as a vector tile delivers it when it leaves and re-enters
// the tile.
const splitLine = (layer: string) =>
  new Feature({
    geometry: new MultiLineString([
      [
        [0, 0],
        [1, 1]
      ],
      [
        [1.5, 1],
        [2, 1]
      ]
    ]),
    layer
  });

const ring = [
  [0, 0],
  [0, 1],
  [1, 1],
  [0, 0]
];
const area = (layer: string) =>
  new Feature({ geometry: new Polygon([ring]), layer });
const splitArea = (layer: string) =>
  new Feature({
    geometry: new MultiPolygon([[ring], [ring.map(([x, y]) => [x + 2, y])]]),
    layer
  });

describe('S57Service.selectLookup — features split at a tile edge', () => {
  let service: S57Service;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(S57Service);
    service.init({ ...DefaultOptions });
    service.fetchSymbols();
    TestBed.inject(HttpTestingController)
      .expectOne('assets/s57/chartsymbols.xml')
      .flush(chartSymbolsXml);
  });

  // depth contour, coastline, leading line, submarine cable
  it.each(['DEPCNT', 'COALNE', 'NAVLNE', 'CBLSUB'])(
    'finds the line rule of a single %s line',
    (layer) => {
      const index = service.selectLookup(line(layer));

      expect(index).toBeGreaterThanOrEqual(0);
      expect(service.getLookup(index).geometryType).toBe(GeometryType.LINES);
    }
  );

  it.each(['DEPCNT', 'COALNE', 'NAVLNE', 'CBLSUB'])(
    'finds the same line rule for a %s line in two parts',
    (layer) => {
      expect(service.selectLookup(splitLine(layer))).toBe(
        service.selectLookup(line(layer))
      );
    }
  );

  it('draws a height contour in two parts as a line, not as a summit', () => {
    const lookup = service.getLookup(service.selectLookup(splitLine('LNDELV')));

    expect(lookup.geometryType).toBe(GeometryType.LINES);
    expect(lookup.instruction).not.toContain('SY(');
  });

  it('finds the same area rule for a depth area in two parts', () => {
    const index = service.selectLookup(splitArea('DEPARE'));

    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBe(service.selectLookup(area('DEPARE')));
  });
});

describe('S57Style conditional symbology — features split at a tile edge', () => {
  const style = new S57Style({
    options: { ...DefaultOptions }
  } as S57Service);
  const quapos = (feature: FeatureLike): string[] =>
    (
      style as unknown as {
        GetCSQUAPOS01: (f: FeatureLike) => string[];
      }
    ).GetCSQUAPOS01(feature);

  it('draws a coastline in two parts as a line', () => {
    expect(quapos(splitLine('COALNE'))).toEqual(quapos(line('COALNE')));
    expect(quapos(splitLine('COALNE'))).toEqual(['LS(SOLD,1,CSTLN)']);
  });
});
