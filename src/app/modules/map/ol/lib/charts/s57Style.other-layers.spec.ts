import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { describe, expect, it } from 'vitest';
import { Feature } from 'ol';
import { LineString, Polygon } from 'ol/geom';

import { DefaultOptions, S57Service } from './s57.service';
import { S57Style } from './s57Style';
import { SettingsOptions } from 'src/app/modules/settings/settings.facade';

const chartSymbolsXml = readFileSync(
  resolve(process.cwd(), 'src/assets/s57/chartsymbols.xml'),
  'utf8'
);

// Buildings and land contours are in the S-52 display category "Other", so
// they are drawn only when picked under Settings → Charts → S57 → Layers.
const building = () =>
  new Feature({
    geometry: new Polygon([
      [
        [0, 0],
        [0, 1],
        [1, 1],
        [0, 0]
      ]
    ]),
    layer: 'BUISGL'
  });
const contour = () =>
  new Feature({
    geometry: new LineString([
      [0, 0],
      [1, 1]
    ]),
    layer: 'LNDELV',
    ELEVAT: 100
  });

const styleWith = (otherLayers: string[]) => {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()]
  });
  const service = TestBed.inject(S57Service);
  service.init({ ...DefaultOptions, otherLayers });
  service.fetchSymbols();
  TestBed.inject(HttpTestingController)
    .expectOne('assets/s57/chartsymbols.xml')
    .flush(chartSymbolsXml);
  return new S57Style(service);
};

describe('S-57 buildings and land elevation', () => {
  it('are offered as layers in the settings', () => {
    const layers = new SettingsOptions().map.s57.otherLayers;

    expect(layers.get('BUISGL')).toBe('Buildings');
    expect(layers.get('LNDELV')).toBe('Land Elevation');
  });

  it('are not drawn with the default layers', () => {
    const style = styleWith(DefaultOptions.otherLayers);

    expect(style.getStyle(building(), 1)).toBeUndefined();
    expect(style.getStyle(contour(), 1)).toBeUndefined();
  });

  it('are drawn once picked', () => {
    const style = styleWith([
      ...DefaultOptions.otherLayers,
      'BUISGL',
      'LNDELV'
    ]);

    expect(style.getStyle(building(), 1)?.length).toBeGreaterThan(0);
    expect(style.getStyle(contour(), 1)?.length).toBeGreaterThan(0);
  });
});
