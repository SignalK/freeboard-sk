import { ChangeDetectorRef, SimpleChange } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance
} from 'vitest';
import OlMap from 'ol/Map';
import View from 'ol/View';
import { get as getProjection } from 'ol/proj';
import TileState from 'ol/TileState';
import type BaseLayer from 'ol/layer/Base';
import LayerGroup from 'ol/layer/Group';
import WebGLTileLayer from 'ol/layer/WebGLTile';
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
import { mirrorLayers } from '../../../split-view/layer-mirror';

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
        {
          provide: ChangeDetectorRef,
          useValue: { detach: (): void => undefined }
        }
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

  it('lets go of the tiles a rebuilt layer drew', () => {
    // Switching a raster layer between smooth and crisp rebuilds every
    // layer, on the sources the overlay keeps.
    component.ngOnDestroy();
    const withPhoto = style();
    model = new DataOverlayModel(
      {
        ...withPhoto,
        sources: {
          ...withPhoto.sources,
          photo: { type: 'raster', tiles: ['/t/{z}/{x}/{y}'] }
        },
        layers: [
          ...withPhoto.layers,
          { id: 'photo', type: 'raster', source: 'photo' }
        ]
      } as OverlayStyle,
      'http://sk.local'
    );
    component.model = model;
    component.ngOnInit();
    const lines = group().getLayers().item(0) as VectorTileLayer;
    const drawn = vectorTileSource().getTile(
      12,
      0,
      0,
      1,
      getProjection('EPSG:3857')!
    );
    lines.getRenderer().getTileCache().set('12/0/0', drawn);
    expect(drawn.getState()).toBe(TileState.IDLE);

    model.setLayer({
      layer: 'photo',
      paint: { 'raster-resampling': 'nearest' }
    });

    expect(group().getLayers().item(0)).not.toBe(lines);
    // Released: it no longer holds its source tiles in the source.
    expect(drawn.getState()).toBe(TileState.EMPTY);
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

// The split view's second pane draws the overlay through copies of its layers
// (split-view/layer-mirror). A WebGL layer's style is not a layer property,
// so a color-relief copy must be given the ramp, or it draws the raw tiles.
describe('DataOverlayComponent: a color-relief layer on a second map', () => {
  const ramp = (lo: string, hi: string) => [
    'interpolate',
    ['linear'],
    ['elevation'],
    -200,
    lo,
    0,
    hi
  ];
  const reliefStyle = (): OverlayStyle =>
    ({
      version: 8,
      sources: {
        depth: {
          type: 'raster-dem',
          tiles: ['/p/dem/{z}/{x}/{y}.png'],
          encoding: 'terrarium',
          tileSize: 256
        }
      },
      layers: [
        {
          id: 'shading',
          type: 'color-relief',
          source: 'depth',
          paint: { 'color-relief-color': ramp('#ff0000', '#0000ff') }
        }
      ]
    }) as OverlayStyle;

  let map: OlMap;
  let second: OlMap;
  let model: DataOverlayModel;
  let component: DataOverlayComponent;
  let setStyle: MockInstance<WebGLTileLayer['setStyle']>;

  const mount = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: MapComponent, useValue: { getMap: () => map } },
        {
          provide: ChangeDetectorRef,
          useValue: { detach: (): void => undefined }
        }
      ]
    });
    component = TestBed.runInInjectionContext(() => new DataOverlayComponent());
    component.overlayKey = 'ext/depth';
    component.model = model;
    component.ngOnInit();
  };
  const reliefOn = (m: OlMap): WebGLTileLayer => {
    const flat = (layers: BaseLayer[]): BaseLayer[] =>
      layers.flatMap((l) =>
        l instanceof LayerGroup ? flat(l.getLayers().getArray()) : [l]
      );
    return flat(m.getLayers().getArray()).find(
      (l) => l instanceof WebGLTileLayer
    ) as WebGLTileLayer;
  };
  // OL keeps a WebGL layer's style to itself: read what it was last given.
  const styleOf = (layer: WebGLTileLayer) =>
    setStyle.mock.calls
      .filter((_, i) => setStyle.mock.contexts[i] === layer)
      .at(-1)?.[0];

  beforeEach(() => {
    setStyle = vi.spyOn(WebGLTileLayer.prototype, 'setStyle');
    map = new OlMap({ view: new View({ center: [0, 0], zoom: 12 }) });
    second = new OlMap({ view: new View({ center: [0, 0], zoom: 9 }) });
    model = new DataOverlayModel(reliefStyle(), 'http://sk.local');
  });

  afterEach(() => {
    component.ngOnDestroy();
    setStyle.mockRestore();
  });

  it('gives a copy made once the overlay is drawn its ramp', () => {
    mount();
    const original = reliefOn(map);
    expect(styleOf(original)).toBeDefined();

    mirrorLayers(map, second);

    expect(reliefOn(second)).not.toBe(original);
    expect(styleOf(reliefOn(second))).toEqual(styleOf(original));
  });

  it('gives a copy made as the overlay is drawn its ramp', () => {
    // The split open first: the copy appears before the ramp is applied.
    mirrorLayers(map, second);
    mount();

    expect(styleOf(reliefOn(second))).toEqual(styleOf(reliefOn(map)));
  });

  it('gives the copy each new ramp', () => {
    mount();
    mirrorLayers(map, second);
    const before = styleOf(reliefOn(map));

    model.setLayer({
      layer: 'shading',
      paint: { 'color-relief-color': ramp('#0000ff', '#ff0000') }
    });

    expect(styleOf(reliefOn(map))).not.toEqual(before);
    expect(styleOf(reliefOn(second))).toEqual(styleOf(reliefOn(map)));
  });

  it('gives the copy the ramp of a style the extension reloaded', () => {
    mount();
    mirrorLayers(map, second);
    const reloaded = new DataOverlayModel(
      {
        ...reliefStyle(),
        layers: [
          {
            id: 'shading',
            type: 'color-relief',
            source: 'depth',
            paint: { 'color-relief-color': ramp('#00ff00', '#0000ff') }
          }
        ]
      } as OverlayStyle,
      'http://sk.local'
    );
    const previous = component.model;
    component.model = reloaded;

    component.ngOnChanges({
      model: new SimpleChange(previous, reloaded, false)
    });

    const copies = (second.getLayers().item(0) as LayerGroup)
      .getLayersArray()
      .filter((l) => l instanceof WebGLTileLayer);
    expect(copies).toHaveLength(1);
    expect(styleOf(copies[0] as WebGLTileLayer)).toEqual(
      styleOf(reliefOn(map))
    );
  });

  it('lets go of a copy once it is gone', () => {
    mount();
    const stop = mirrorLayers(map, second);
    const copy = reliefOn(second);
    stop();
    const given = setStyle.mock.contexts.filter((c) => c === copy).length;

    model.setLayer({
      layer: 'shading',
      paint: { 'color-relief-color': ramp('#0000ff', '#ff0000') }
    });

    expect(setStyle.mock.contexts.filter((c) => c === copy).length).toBe(given);
  });
});
