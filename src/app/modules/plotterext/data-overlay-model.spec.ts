import { describe, expect, it, vi } from 'vitest';
import type { OverlayStyle } from 'signalk-plotterext-bus/host';
import {
  DataOverlayModel,
  DataOverlayRefusal,
  geojsonFeatures,
  type DataOverlayChange,
  type FetchJson
} from './data-overlay-model';

const ORIGIN = 'http://sk.local:3000';
const RAMP = [
  'interpolate',
  ['linear'],
  ['elevation'],
  -200,
  '#9cc8ec',
  0,
  '#f2f8fc'
];

const point = (id: string | number | undefined, depth: number) => ({
  type: 'Feature' as const,
  ...(id !== undefined ? { id } : {}),
  geometry: { type: 'Point', coordinates: [-80, 25] },
  properties: { depth }
});

const style = (): OverlayStyle =>
  ({
    version: 8,
    state: { unitFactor: { default: 1 }, safetyDepth: { default: 3 } },
    sources: {
      depth: {
        type: 'raster-dem',
        tiles: ['/p/dem/{z}/{x}/{y}.png'],
        encoding: 'terrarium'
      },
      soundings: {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [point('a', 2)] }
      },
      remote: { type: 'geojson', data: '/p/soundings.json' },
      broken: { type: 'raster', tiles: ['http://x/{z}/{x}/{y}'] }
    },
    layers: [
      {
        id: 'shading',
        type: 'color-relief',
        source: 'depth',
        paint: { 'color-relief-color': RAMP }
      },
      {
        id: 'shoals',
        type: 'circle',
        source: 'soundings',
        filter: ['<', ['get', 'depth'], ['global-state', 'safetyDepth']],
        paint: { 'circle-radius': 4, 'circle-color': '#d0453a' }
      },
      {
        id: 'relief',
        type: 'hillshade',
        source: 'depth'
      },
      {
        id: 'fallback',
        type: 'circle',
        source: 'soundings',
        layout: { visibility: 'none' },
        paint: { 'circle-blur': 1 }
      }
    ]
  }) as OverlayStyle;

function setup(load?: FetchJson) {
  const model = new DataOverlayModel(style(), ORIGIN, load);
  const changes: DataOverlayChange[] = [];
  model.subscribe((c) => changes.push(c));
  return { model, changes };
}

function refusal(fn: () => void): DataOverlayRefusal {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(DataOverlayRefusal);
    return err as DataOverlayRefusal;
  }
  throw new Error('expected a refusal');
}

describe('DataOverlayModel layers', () => {
  it('reports the layers it does not draw', () => {
    const { model } = setup();
    expect(model.skippedLayers()).toEqual([
      { id: 'relief', reason: 'layerType', detail: 'hillshade' },
      { id: 'fallback', reason: 'property', detail: 'circle-blur' }
    ]);
    expect(model.isDrawn('shading')).toBe(true);
  });

  it('setLayer replaces named properties and restores declared ones on null', () => {
    const { model, changes } = setup();
    const ramp = [
      'interpolate',
      ['linear'],
      ['elevation'],
      -3,
      '#d6ebf8',
      -2.999,
      '#f2c14e'
    ];
    model.setLayer({ layer: 'shading', paint: { 'color-relief-color': ramp } });
    expect(model.layer('shading')?.paint?.['color-relief-color']).toEqual(ramp);
    model.setLayer({
      layer: 'shoals',
      paint: { 'circle-radius': 6, 'circle-color': null }
    });
    expect(model.layer('shoals')?.paint).toEqual({
      'circle-radius': 6,
      'circle-color': '#d0453a'
    });
    model.setLayer({ layer: 'shoals', paint: { 'circle-radius': null } });
    expect(model.layer('shoals')?.paint?.['circle-radius']).toBe(4);
    expect(changes).toEqual([
      { kind: 'layers', layers: ['shading'] },
      { kind: 'layers', layers: ['shoals'] },
      { kind: 'layers', layers: ['shoals'] }
    ]);
  });

  it('setLayer deletes a property the style never declared when set to null', () => {
    const { model } = setup();
    model.setLayer({ layer: 'shoals', paint: { 'circle-opacity': 0.5 } });
    model.setLayer({ layer: 'shoals', paint: { 'circle-opacity': null } });
    expect(model.layer('shoals')?.paint).not.toHaveProperty('circle-opacity');
  });

  it('setLayer replaces the filter, and filter null removes it', () => {
    const { model } = setup();
    model.setLayer({ layer: 'shoals', filter: ['<', ['get', 'depth'], 5] });
    expect(model.layer('shoals')?.filter).toEqual(['<', ['get', 'depth'], 5]);
    model.setLayer({ layer: 'shoals', filter: null });
    expect(model.layer('shoals')).not.toHaveProperty('filter');
  });

  it('setLayer refuses a change it cannot draw and keeps the layer as it was', () => {
    const { model, changes } = setup();
    const before = structuredClone(model.layer('shading'));
    const err = refusal(() =>
      model.setLayer({
        layer: 'shading',
        paint: {
          'color-relief-color': ['step', ['elevation'], 'red', 0, 'blue']
        }
      })
    );
    expect(err.reason).toBe('overlays.unsupported');
    expect(model.layer('shading')).toEqual(before);
    expect(changes).toEqual([]);
  });

  it('setLayer draws a skipped layer once the change makes it drawable', () => {
    const { model } = setup();
    model.setLayer({
      layer: 'fallback',
      paint: { 'circle-blur': 0 },
      layout: { visibility: 'visible' }
    });
    expect(model.isDrawn('fallback')).toBe(true);
    expect(model.skippedLayers().map((s) => s.id)).toEqual(['relief']);
  });

  it.each([
    [{ layer: 'nope', paint: {} }],
    [{ layer: 'shoals', paint: 'red' }],
    [{ layer: 'shoals', filter: 'x' }]
  ])('setLayer refuses %j as a bad request', (params) => {
    expect(refusal(() => setup().model.setLayer(params)).reason).toBe(
      'overlays.badRequest'
    );
  });
});

describe('DataOverlayModel global state', () => {
  it('sets values over the defaults; null restores the default', () => {
    const { model, changes } = setup();
    model.setState({ unitFactor: 3.28084, safetyDepth: 2 });
    expect(model.globalState()).toEqual({
      unitFactor: 3.28084,
      safetyDepth: 2
    });
    model.setState({ safetyDepth: null, extra: 'x' });
    expect(model.globalState()).toEqual({
      unitFactor: 3.28084,
      safetyDepth: 3,
      extra: 'x'
    });
    expect(changes).toEqual([{ kind: 'state' }, { kind: 'state' }]);
  });

  it('refuses values that are not an object', () => {
    expect(refusal(() => setup().model.setState([1])).reason).toBe(
      'overlays.badRequest'
    );
  });
});

describe('DataOverlayModel geojson data', () => {
  it('replaces every feature with data', async () => {
    const { model, changes } = setup();
    model.setData({
      source: 'soundings',
      data: {
        type: 'FeatureCollection',
        features: [point('b', 1), point(undefined, 9)]
      }
    });
    expect((await model.features('soundings')).map((f) => f.id)).toEqual([
      'b',
      undefined
    ]);
    expect(changes[0]).toMatchObject({ kind: 'data', source: 'soundings' });
    expect((changes[0] as { replace: unknown[] }).replace).toHaveLength(2);
  });

  it('upserts and removes features by id', async () => {
    const { model, changes } = setup();
    model.setData({
      source: 'soundings',
      upsert: [point('a', 7), point(3, 1)]
    });
    model.setData({ source: 'soundings', remove: [3] });
    const features = await model.features('soundings');
    expect(features.map((f) => [f.id, f.properties?.['depth']])).toEqual([
      ['a', 7]
    ]);
    expect(changes).toEqual([
      {
        kind: 'data',
        source: 'soundings',
        upsert: [point('a', 7), point(3, 1)],
        remove: []
      },
      { kind: 'data', source: 'soundings', upsert: [], remove: [3] }
    ]);
  });

  it.each([
    [
      'data with upsert',
      {
        source: 'soundings',
        data: { type: 'FeatureCollection', features: [] },
        upsert: []
      }
    ],
    ['neither', { source: 'soundings' }],
    [
      'a feature without an id',
      { source: 'soundings', upsert: [point(undefined, 1)] }
    ],
    ['bad ids', { source: 'soundings', remove: [{}] }],
    [
      'data that is not GeoJSON',
      { source: 'soundings', data: { type: 'Nope' } }
    ],
    [
      'a tiled source',
      { source: 'depth', data: { type: 'FeatureCollection', features: [] } }
    ],
    [
      'an unknown source',
      { source: 'nope', data: { type: 'FeatureCollection', features: [] } }
    ]
  ])('refuses %s', (_label, params) => {
    expect(refusal(() => setup().model.setData(params)).reason).toBe(
      'overlays.badRequest'
    );
  });

  it('loads a data URL once, with credentials for the server, applying changes made meanwhile', async () => {
    const load = vi.fn<FetchJson>(async () => ({
      type: 'FeatureCollection',
      features: [point('x', 1), point('y', 2)]
    }));
    const { model } = setup(load);
    model.setData({ source: 'remote', remove: ['x'] });
    const [a, b] = await Promise.all([
      model.features('remote'),
      model.features('remote')
    ]);
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith(
      { url: `${ORIGIN}/p/soundings.json`, credentials: 'include' },
      false
    );
    expect(a.map((f) => f.id)).toEqual(['y']);
    expect(b).toEqual(a);
  });

  it('accepts a bare Feature or geometry as GeoJSON', () => {
    expect(geojsonFeatures(point('a', 1))).toHaveLength(1);
    expect(geojsonFeatures({ type: 'Point', coordinates: [0, 0] })).toEqual([
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: {}
      }
    ]);
    expect(geojsonFeatures({ type: 'Topology' })).toBeNull();
  });
});

describe('DataOverlayModel refresh', () => {
  it('marks only the listed tiles stale until they are fetched again', () => {
    const { model, changes } = setup();
    model.refresh({ source: 'depth', tiles: [[12, 1100, 1700]] });
    expect(model.needsReload('depth', 12, 1100, 1700)).toBe(true);
    expect(model.needsReload('depth', 12, 1101, 1700)).toBe(false);
    model.markLoaded('depth', 12, 1100, 1700);
    expect(model.needsReload('depth', 12, 1100, 1700)).toBe(false);
    expect(changes).toEqual([
      { kind: 'refresh', source: 'depth', tiles: [[12, 1100, 1700]] }
    ]);
  });

  it('marks every tile stale for a whole-source refresh, each until it is fetched', () => {
    const { model, changes } = setup();
    model.refresh({ source: 'depth' });
    expect(model.needsReload('depth', 3, 1, 1)).toBe(true);
    model.markLoaded('depth', 3, 1, 1);
    expect(model.needsReload('depth', 3, 1, 1)).toBe(false);
    expect(model.needsReload('depth', 3, 2, 1)).toBe(true);
    expect(changes).toEqual([{ kind: 'refresh', source: 'depth' }]);
  });

  it('reloads a geojson URL that was loaded, bypassing the HTTP cache', async () => {
    let n = 0;
    const load = vi.fn<FetchJson>(async () => ({
      type: 'FeatureCollection',
      features: [point(`v${++n}`, 1)]
    }));
    const { model, changes } = setup(load);
    await model.features('remote');
    model.refresh({ source: 'remote' });
    await vi.waitFor(() => expect(changes).toHaveLength(1));
    expect(load).toHaveBeenLastCalledWith(expect.anything(), true);
    expect(changes[0]).toMatchObject({ kind: 'data', source: 'remote' });
    expect((await model.features('remote')).map((f) => f.id)).toEqual(['v2']);
  });

  it('keeps a change made while a geojson URL reloads', async () => {
    let resolveReload: (v: unknown) => void = () => undefined;
    const load = vi
      .fn<FetchJson>()
      .mockResolvedValueOnce({
        type: 'FeatureCollection',
        features: [point('x', 1)]
      })
      .mockImplementationOnce(() => new Promise((r) => (resolveReload = r)));
    const { model, changes } = setup(load);
    await model.features('remote');
    model.refresh({ source: 'remote' });
    model.setData({ source: 'remote', upsert: [point('live', 2)] });
    resolveReload({ type: 'FeatureCollection', features: [point('y', 3)] });
    await vi.waitFor(() =>
      expect(
        changes.some((c) => c.kind === 'data' && 'replace' in c && c.replace)
      ).toBe(true)
    );
    expect((await model.features('remote')).map((f) => f.id)).toEqual([
      'y',
      'live'
    ]);
  });

  it('keeps the drawn features when a reload fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const load = vi
      .fn<FetchJson>()
      .mockResolvedValueOnce({
        type: 'FeatureCollection',
        features: [point('x', 1)]
      })
      .mockRejectedValueOnce(new Error('offline'));
    const { model, changes } = setup(load);
    await model.features('remote');
    model.refresh({ source: 'remote' });
    model.setData({ source: 'remote', upsert: [point('live', 2)] });
    await vi.waitFor(() =>
      expect(
        changes.some((c) => c.kind === 'data' && 'replace' in c && c.replace)
      ).toBe(true)
    );
    expect(warn).toHaveBeenCalled();
    expect((await model.features('remote')).map((f) => f.id)).toEqual([
      'x',
      'live'
    ]);
    warn.mockRestore();
  });

  it.each([
    ['an unknown source', { source: 'nope' }],
    ['a source it does not draw', { source: 'broken' }],
    ['tiles on a geojson source', { source: 'soundings', tiles: [[0, 0, 0]] }],
    ['a tile outside its zoom', { source: 'depth', tiles: [[2, 4, 0]] }],
    ['a malformed tile', { source: 'depth', tiles: [[2, 1]] }],
    ['tiles that are not a list', { source: 'depth', tiles: '2/1/1' }]
  ])('refuses %s', (_label, params) => {
    expect(refusal(() => setup().model.refresh(params)).reason).toBe(
      'overlays.badRequest'
    );
  });
});
