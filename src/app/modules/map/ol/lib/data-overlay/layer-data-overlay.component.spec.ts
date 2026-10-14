import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OlMap from 'ol/Map';
import View from 'ol/View';
import type LayerGroup from 'ol/layer/Group';
import type VectorLayer from 'ol/layer/Vector';
import type VectorSource from 'ol/source/Vector';
import VectorTileLayer from 'ol/layer/VectorTile';
import type Style from 'ol/style/Style';
import type CircleStyle from 'ol/style/Circle';
import type VectorTileSource from 'ol/source/VectorTile';
import type { OverlayStyle } from 'signalk-plotterext-bus/host';
import { MapComponent } from '../map.component';
import { DataOverlayModel } from 'src/app/modules/plotterext/data-overlay-model';
import { DataOverlayComponent } from './layer-data-overlay.component';

const point = (id: string, depth: number) => ({
  type: 'Feature' as const,
  id,
  geometry: { type: 'Point', coordinates: [-80, 25] },
  properties: { depth }
});

const style = (): OverlayStyle =>
  ({
    version: 8,
    state: { factor: { default: 1 }, colour: { default: '#d0453a' } },
    sources: {
      soundings: {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [point('a', 1)] }
      },
      isobars: { type: 'vector', tiles: ['/p/{z}/{x}/{y}.pbf'] }
    },
    layers: [
      {
        id: 'lines',
        type: 'line',
        source: 'isobars',
        'source-layer': 'isobars',
        paint: { 'line-color': '#5d7f99' }
      },
      {
        id: 'shoals',
        type: 'circle',
        source: 'soundings',
        paint: {
          'circle-color': ['global-state', 'colour'],
          'circle-radius': ['*', 4, ['global-state', 'factor']]
        }
      },
      {
        id: 'labels',
        type: 'symbol',
        source: 'soundings',
        layout: { 'text-field': ['to-string', ['get', 'depth']] }
      }
    ]
  }) as OverlayStyle;

// The map layer against a real (unrendered) OpenLayers map.
describe('DataOverlayComponent', () => {
  let map: OlMap;
  let model: DataOverlayModel;
  let component: DataOverlayComponent;

  beforeEach(async () => {
    vi.stubGlobal(
      'requestAnimationFrame',
      (fn: FrameRequestCallback) =>
        setTimeout(() => fn(0), 0) as unknown as number
    );
    map = new OlMap({ view: new View({ center: [0, 0], zoom: 12 }) });
    model = new DataOverlayModel(style(), 'http://sk.local');
    TestBed.configureTestingModule({
      providers: [
        { provide: MapComponent, useValue: { getMap: () => map } },
        { provide: ChangeDetectorRef, useValue: { detach: () => undefined } }
      ]
    });
    component = TestBed.runInInjectionContext(() => new DataOverlayComponent());
    component.overlayKey = 'ext/depth';
    component.model = model;
    component.zIndex = 60;
    component.opacity = 0.5;
    component.ngOnInit();
    // let the geojson source load
    await new Promise((r) => setTimeout(r, 0));
  });

  afterEach(() => {
    component.ngOnDestroy();
    vi.unstubAllGlobals();
  });

  const group = () => map.getLayers().item(0) as LayerGroup;
  const geojsonSource = () =>
    (group().getLayers().item(1) as VectorLayer).getSource() as VectorSource;
  const vectorTileSource = () =>
    (
      group().getLayers().item(0) as VectorTileLayer
    ).getSource() as VectorTileSource;

  it('restyles every vector run, the first one included', () => {
    // first in the file, so its build is the first style ol-mapbox-style
    // sees: that one once lost its saved setup and silently stopped restyling
    const lines = group().getLayers().item(0) as VectorTileLayer;
    const shoals = group().getLayers().item(1) as VectorLayer;
    const linesStyle = lines.getStyle();
    const shoalsStyle = shoals.getStyle();
    model.setLayer({ layer: 'lines', paint: { 'line-width': 3 } });
    model.setState({ factor: 2 });
    expect(lines.getStyle()).not.toBe(linesStyle);
    expect(shoals.getStyle()).not.toBe(shoalsStyle);
    const feature = geojsonSource().getFeatures()[0];
    const styles = shoals.getStyleFunction()!(feature, 10) as Style[];
    const radius = styles
      .map((st) => (st.getImage() as CircleStyle | null)?.getRadius())
      .find((r) => r !== undefined);
    expect(radius).toBe(8);
  });

  it('draws the overlay as one group: a layer per run of layers on one source', () => {
    expect(group().getZIndex()).toBe(60);
    expect(group().getOpacity()).toBe(0.5);
    const layers = group().getLayers().getArray();
    expect(layers).toHaveLength(2);
    expect(layers[0]).toBeInstanceOf(VectorTileLayer);
    expect(layers[1].get('mapbox-layers')).toEqual(['shoals', 'labels']);
    expect(
      geojsonSource()
        .getFeatures()
        .map((f) => f.getId())
    ).toEqual(['a']);
  });

  it('mirrors setData into the map source', () => {
    model.setData({
      source: 'soundings',
      upsert: [point('a', 9), point('b', 2)]
    });
    model.setData({ source: 'soundings', remove: ['b'] });
    const features = geojsonSource().getFeatures();
    expect(features.map((f) => [f.getId(), f.get('depth')])).toEqual([
      ['a', 9]
    ]);
    model.setData({
      source: 'soundings',
      data: { type: 'FeatureCollection', features: [point('c', 4)] }
    });
    expect(
      geojsonSource()
        .getFeatures()
        .map((f) => f.getId())
    ).toEqual(['c']);
  });

  it('gives only refreshed vector tiles a new key, once per frame', async () => {
    const url = vectorTileSource().getTileUrlFunction();
    const key = (z: number, x: number, y: number) =>
      url([z, x, y], 1, map.getView().getProjection());
    const before = [key(10, 1, 2), key(10, 1, 3)];
    const sourceKey = vectorTileSource().getKey();
    model.refresh({ source: 'isobars', tiles: [[10, 1, 2]] });
    model.refresh({ source: 'isobars', tiles: [[10, 1, 2]] });
    expect(vectorTileSource().getKey()).toBe(sourceKey);
    await new Promise((r) => setTimeout(r, 5));
    expect(vectorTileSource().getKey()).not.toBe(sourceKey);
    expect(key(10, 1, 2)).not.toBe(before[0]);
    expect(key(10, 1, 3)).toBe(before[1]);
    model.refresh({ source: 'isobars' });
    expect(key(10, 1, 3)).not.toBe(before[1]);
  });

  it('restyles with a global-state value that does not fit, without throwing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const shoals = group().getLayers().item(1) as VectorLayer;
    const before = shoals.getStyle();
    model.setState({ factor: 'big', colour: 5 });
    expect(shoals.getStyle()).not.toBe(before);
    const glStyle = group().get('mapbox-style') as {
      layers: { id: string; paint?: object }[];
    };
    expect(glStyle.layers.find((l) => l.id === 'shoals')?.paint).toEqual({});
    const fn = shoals.getStyleFunction()!;
    expect(() => fn(geojsonSource().getFeatures()[0], 10)).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it('keeps one style object while restyling, updating the changed layer in it', () => {
    const glStyle = group().get('mapbox-style') as {
      layers: { id: string; paint?: Record<string, unknown> }[];
    };
    model.setState({ factor: 2 });
    model.setLayer({ layer: 'lines', paint: { 'line-width': 3 } });
    expect(group().get('mapbox-style')).toBe(glStyle);
    const byId = (id: string) => glStyle.layers.find((l) => l.id === id);
    expect(byId('lines')?.paint?.['line-width']).toBe(3);
    expect(byId('shoals')?.paint?.['circle-radius']).toEqual([
      '*',
      4,
      ['get', 'factor', ['literal', { factor: 2 }]]
    ]);
  });
});
