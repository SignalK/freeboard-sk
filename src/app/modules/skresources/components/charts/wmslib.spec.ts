import {
  getWMTSLayers,
  parseWMSCapabilities,
  WmsParseOptions
} from './wmslib';
import type { LayerNode } from './wmslib';

describe('wmslib', () => {
  const makeWmsLayer = (
    name: string,
    children: any[] = [],
    withTime = false
  ) => {
    const layer: any = {
      Name: name,
      Title: `${name}-title`,
      Abstract: `${name}-desc`
    };
    if (withTime) {
      layer.Dimension = [
        {
          name: 'time',
          units: 'ISO8601',
          default: '2024-01-01T00:00:00Z',
          values: '2024-01-01T00:00:00Z/2024-01-02T00:00:00Z/PT1H'
        }
      ];
    }
    if (children.length) {
      layer.Layer = children;
    }
    return layer;
  };

  const wrapCapabilities = (layer: any | any[]) => ({
    Capability: {
      Layer: layer
    }
  });

  describe('parseWMSCapabilities', () => {
    it('should parse a single layer', () => {
      const data: LayerNode[] = [];
      const capabilities = wrapCapabilities(makeWmsLayer('root'));
      parseWMSCapabilities(capabilities, data);
      expect(data.length).toBe(1);
      expect(data[0].name).toBe('root');
      expect(data[0].title).toBe('root-title');
    });

    it('should parse an array of layers', () => {
      const data: LayerNode[] = [];
      const capabilities = wrapCapabilities([
        makeWmsLayer('layer-a'),
        makeWmsLayer('layer-b')
      ]);
      parseWMSCapabilities(capabilities, data);
      expect(data.length).toBe(2);
      expect(data[0].name).toBe('layer-a');
      expect(data[1].name).toBe('layer-b');
    });

    it('should assign parent and children for nested layers', () => {
      const data: LayerNode[] = [];
      const child = makeWmsLayer('child');
      const root = makeWmsLayer('root', [child]);
      const capabilities = wrapCapabilities(root);
      parseWMSCapabilities(capabilities, data);
      expect(data.length).toBe(1);
      expect(data[0].children?.length).toBe(1);
      expect(data[0].children?.[0].name).toBe('child');
      expect(data[0].children?.[0].parent).toBe(data[0]);
    });

    it('should include time dimension when present', () => {
      const data: LayerNode[] = [];
      const root = makeWmsLayer('root', [], true);
      const capabilities = wrapCapabilities(root);
      parseWMSCapabilities(capabilities, data);
      expect(data[0].time).toBeDefined();
      expect(data[0].time?.current).toBe('2024-01-01T00:00:00Z');
    });

    it('should respect maxDepth limit', () => {
      const data: LayerNode[] = [];
      const deep = makeWmsLayer('root', [
        makeWmsLayer('l1', [makeWmsLayer('l2', [makeWmsLayer('l3')])])
      ]);
      const capabilities = wrapCapabilities(deep);
      const options: WmsParseOptions = { maxDepth: 1 };
      parseWMSCapabilities(capabilities, data, options);
      expect(data.length).toBe(1);
      expect(data[0].children?.length).toBe(1);
      expect(data[0].children?.[0].children?.length ?? 0).toBe(0);
    });

    it('should respect maxNodes limit', () => {
      const data: LayerNode[] = [];
      const capabilities = wrapCapabilities([
        makeWmsLayer('a'),
        makeWmsLayer('b'),
        makeWmsLayer('c')
      ]);
      const options: WmsParseOptions = { maxNodes: 1 };
      parseWMSCapabilities(capabilities, data, options);
      expect(data.length).toBe(1);
      expect(data[0].name).toBe('a');
    });
  });

  describe('getWMTSLayers', () => {
    it('should respect maxLayers limit', () => {
      const capabilities: any = {
        Contents: {
          Layer: [
            { Identifier: 'l1', Title: 'Layer 1', Abstract: 'a', Format: [] },
            { Identifier: 'l2', Title: 'Layer 2', Abstract: 'b', Format: [] },
            { Identifier: 'l3', Title: 'Layer 3', Abstract: 'c', Format: [] }
          ]
        }
      };
      const layers = getWMTSLayers(capabilities, 'http://example', 'chart-provider', 2);
      expect(layers.length).toBe(2);
      expect(layers[0].name).toBe('Layer 1');
      expect(layers[1].name).toBe('Layer 2');
    });
  });
});
