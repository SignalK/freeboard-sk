import { describe, expect, it, vi } from 'vitest';
import type { OverlayStyle } from 'signalk-plotterext-bus/host';
import { createOverlayMethods } from './overlay-methods';
import { OverlayRegistry, type OverlayDefinition } from './overlay-registry';
import { DataOverlayModel } from './data-overlay-model';

const style = (): OverlayStyle =>
  ({
    version: 8,
    state: { unitFactor: { default: 1 } },
    sources: {
      depth: { type: 'raster-dem', tiles: ['/p/{z}/{x}/{y}.png'] },
      soundings: {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      }
    },
    layers: [
      {
        id: 'shading',
        type: 'color-relief',
        source: 'depth',
        paint: {
          'color-relief-color': [
            'interpolate',
            ['linear'],
            ['elevation'],
            -10,
            'red',
            0,
            'blue'
          ]
        }
      },
      { id: 'relief', type: 'hillshade', source: 'depth' }
    ]
  }) as OverlayStyle;

function setup() {
  const registry = new OverlayRegistry();
  const model = new DataOverlayModel(style(), 'http://sk.local');
  const defs: OverlayDefinition[] = [
    {
      extension: 'ext-a',
      extensionName: 'A',
      def: { id: 'depth', title: 'Depth', type: 'data', style: {} },
      model
    },
    {
      extension: 'ext-a',
      extensionName: 'A',
      def: { id: 'radar', title: 'Radar', type: 'image', runtime: 'r' }
    },
    {
      extension: 'ext-b',
      extensionName: 'B',
      def: { id: 'theirs', title: 'Theirs', type: 'data', style: {} },
      model: new DataOverlayModel(style(), 'http://sk.local')
    }
  ];
  registry.setDefinitions(defs);
  return { model, methods: createOverlayMethods(registry, 'ext-a', 'r') };
}

async function call(
  methods: ReturnType<typeof createOverlayMethods>,
  name: string,
  params: unknown
) {
  try {
    return { result: await methods[name](params, {} as never) };
  } catch (err) {
    return { reason: (err as { data?: { reason?: string } }).data?.reason };
  }
}

describe('data overlay methods', () => {
  it('lists each overlay with its type, and a data overlay with its skipped layers', async () => {
    const { methods } = setup();
    const { result } = await call(methods, 'overlay.list', {});
    expect(result).toEqual({
      overlays: [
        expect.objectContaining({
          id: 'depth',
          type: 'data',
          skippedLayers: [
            { id: 'relief', reason: 'layerType', detail: 'hillshade' }
          ]
        }),
        expect.objectContaining({ id: 'radar', type: 'image' })
      ]
    });
    expect((result as { overlays: object[] }).overlays[1]).not.toHaveProperty(
      'skippedLayers'
    );
  });

  it('applies each change to the overlay and resolves to {}', async () => {
    const { model, methods } = setup();
    const changes: string[] = [];
    model.subscribe((c) => changes.push(c.kind));
    const ok = [
      [
        'overlay.refresh',
        { overlayId: 'depth', source: 'depth', tiles: [[1, 0, 0]] }
      ],
      [
        'overlay.setData',
        {
          overlayId: 'depth',
          source: 'soundings',
          data: { type: 'FeatureCollection', features: [] }
        }
      ],
      [
        'overlay.setLayer',
        {
          overlayId: 'depth',
          layer: 'shading',
          paint: { 'color-relief-opacity': 0.5 }
        }
      ],
      ['overlay.setState', { overlayId: 'depth', values: { unitFactor: 3.28 } }]
    ] as const;
    for (const [name, params] of ok) {
      expect(await call(methods, name, params)).toEqual({ result: {} });
    }
    expect(changes).toEqual(['refresh', 'data', 'layers', 'state']);
    expect(model.globalState()['unitFactor']).toBe(3.28);
  });

  it.each([
    [
      'overlay.setState',
      { overlayId: 'theirs', values: {} },
      'overlays.unknownId'
    ],
    [
      'overlay.setState',
      { overlayId: 'nope', values: {} },
      'overlays.unknownId'
    ],
    [
      'overlay.setState',
      { overlayId: 'radar', values: {} },
      'overlays.badRequest'
    ],
    ['overlay.refresh', { source: 'depth' }, 'overlays.badRequest'],
    [
      'overlay.refresh',
      { overlayId: 'depth', source: 'nope' },
      'overlays.badRequest'
    ],
    [
      'overlay.setData',
      { overlayId: 'depth', source: 'depth', data: {} },
      'overlays.badRequest'
    ],
    [
      'overlay.setLayer',
      { overlayId: 'depth', layer: 'nope' },
      'overlays.badRequest'
    ],
    [
      'overlay.setLayer',
      {
        overlayId: 'depth',
        layer: 'shading',
        paint: {
          'color-relief-color': ['step', ['elevation'], 'red', 0, 'blue']
        }
      },
      'overlays.unsupported'
    ],
    ['overlay.setState', 'x', 'overlays.badRequest']
  ])('%s(%j) fails with %s', async (name, params, reason) => {
    expect(await call(setup().methods, name, params)).toEqual({ reason });
  });

  it('refuses a frame for a data overlay as the wrong kind', async () => {
    const image = { width: 1, height: 1, close: vi.fn() };
    const res = await call(setup().methods, 'overlay.frame', {
      overlayId: 'depth',
      extent: [0, 0, 1, 1],
      image
    });
    expect(res).toEqual({ reason: 'overlays.badRequest' });
    expect(image.close).toHaveBeenCalled();
  });
});
