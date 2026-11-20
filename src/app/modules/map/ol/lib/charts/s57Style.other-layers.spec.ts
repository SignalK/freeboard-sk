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
import { LineString, Point, Polygon } from 'ol/geom';
import { Style } from 'ol/style';

import { DefaultOptions, S57Service } from './s57.service';
import { S57Style } from './s57Style';
import { SettingsOptions } from 'src/app/modules/settings/settings.facade';

const chartSymbolsXml = readFileSync(
  resolve(process.cwd(), 'src/assets/s57/chartsymbols.xml'),
  'utf8'
);

// Buildings and land elevation (contours, spot heights) are in the S-52
// display category "Other", so they are drawn only when picked under
// Settings → Map → Layers.
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
const spotHeight = () =>
  new Feature({
    geometry: new Point([0, 0]),
    layer: 'LNDELV',
    ELEVAT: 772,
    OBJNAM: 'Mont Dore'
  });

const hasFill = (styles?: Style[]) => !!styles?.some((s) => s.getFill());
const hasStroke = (styles?: Style[]) => !!styles?.some((s) => s.getStroke());
const texts = (styles?: Style[]) =>
  (styles ?? [])
    .map((s) => s.getText()?.getText())
    .filter((t) => t !== undefined && t !== null)
    .map(String);

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

  it('are drawn with the default layers', () => {
    const style = styleWith(DefaultOptions.otherLayers);

    // chartsymbols.xml: BUISGL area AC(CHBRN);LS(SOLD,1,LANDF), LNDELV line
    // LS(SOLD,1,LANDF) (S-52 gives contour lines no label), LNDELV point
    // SY(POSGEN04);TX(ELEVAT,...)
    expect(hasFill(style.getStyle(building(), 1))).toBe(true);
    expect(hasStroke(style.getStyle(contour(), 1))).toBe(true);
    expect(texts(style.getStyle(spotHeight(), 1))).toContain('772');
  });

  it('are not drawn once unpicked', () => {
    const style = styleWith(
      DefaultOptions.otherLayers.filter((l) => l !== 'BUISGL' && l !== 'LNDELV')
    );

    expect(style.getStyle(building(), 1)).toBeUndefined();
    expect(style.getStyle(contour(), 1)).toBeUndefined();
    expect(style.getStyle(spotHeight(), 1)).toBeUndefined();
  });
});
