import { WMSCapabilities, WMTSCapabilities } from 'ol/format';
import { getWMTSLayers, parseWMSCapabilities } from './wmslib';
import type { LayerNode } from './wmslib';

type WorkerMessage = {
  type: 'wms' | 'wmts';
  xml: string;
  url: string;
  options?: {
    maxNodes?: number;
    maxDepth?: number;
    maxLayers?: number;
  };
};

type WorkerResult = {
  layers: LayerNode[] | Array<{ id: string | number; name: string; description: string }>;
};

const buildWmsLayers = (xml: string, options?: WorkerMessage['options']): LayerNode[] => {
  const capabilities = new WMSCapabilities().read(xml);
  const layers: LayerNode[] = [];
  parseWMSCapabilities(capabilities, layers, {
    maxNodes: options?.maxNodes,
    maxDepth: options?.maxDepth
  });
  return layers;
};

const buildWmtsLayers = (
  xml: string,
  url: string,
  options?: WorkerMessage['options']
): Array<{ id: string | number; name: string; description: string }> => {
  const capabilities = new WMTSCapabilities().read(xml);
  return getWMTSLayers(capabilities, url, 'chart-provider', options?.maxLayers)
    .map((c: any) => ({
      id: c.layers?.[0] ?? Date.now(),
      name: c.name,
      description: c.description
    }))
    .sort((a: any, b: any) => (a.name < b.name ? -1 : 1));
};

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  try {
    const { type, xml, url, options } = event.data;
    let result: WorkerResult;
    if (type === 'wms') {
      result = { layers: buildWmsLayers(xml, options) };
    } else {
      result = { layers: buildWmtsLayers(xml, url, options) };
    }
    self.postMessage(result);
  } catch (err) {
    self.postMessage(null);
  }
};
