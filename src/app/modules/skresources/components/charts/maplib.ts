import { WMSCapabilities, WMTSCapabilities } from 'ol/format';
import { SKInfoLayer } from '../../custom-resource-classes';
import { ChartProvider } from 'src/app/types';

type CapabilitiesBaseDef = {
  name: string;
  description: string;
  url: string;
};

export interface WMSCapabilitiesDef extends CapabilitiesBaseDef {
  type: 'WMS';
  layers: LayerNode[];
}

export interface WMTSCapabilitiesDef extends CapabilitiesBaseDef {
  type: 'WMTS';
  layers: WMTSLayerDef[];
}

export type WMTSLayerDef = {
  name: string;
  description: string;
  id: string;
  bounds: [number, number, number, number];
  format: 'jpg' | 'png';
  time?: TimeDef;
};

export interface TimeDimension {
  from: string;
  to: string;
  interval?: number;
  values?: string[];
}

export interface TimeDef extends TimeDimension {
  current: string;
}

export interface LayerNode {
  name: string;
  title?: string;
  description: string;
  time?: TimeDef;
  children?: LayerNode[];
  selected: boolean;
  parent: LayerNode;
}

/** Return layer with the supplied name
 * @param name Layer Name
 * @param data Array of LayerNode objects
 * @returns LayerNode object
 */
export const getLayerNodeByName = (
  name: string,
  data: LayerNode[]
): LayerNode => {
  let result: LayerNode;

  const parseNode = (n: LayerNode) => {
    if (result) return;
    if (n.name === name) {
      result = n;
      return;
    }
    if (Array.isArray(n.children) && !result) {
      n.children.forEach((n) => parseNode(n));
    }
  };

  for (let node of data) {
    parseNode(node);
    if (result) {
      break;
    }
  }
  return result;
};

// ********************************

/**
 * Parse WMS capabilities to JSON in a worker
 * @param xml xml string
 * @returns Promise containing WMSCapabilitiesDef object
 */
export const wmsCapabilitiesInWorker = (
  url: string,
  options?: {
    maxNodes: number;
    maxDepth: number;
  }
): Promise<WMSCapabilitiesDef> => {
  return capabilitiesInWorker(
    url,
    'wms',
    options
  ) as Promise<WMSCapabilitiesDef>;
};

/**
 * Parse WMTS capabilities to JSON in a worker
 * @param xml xml string
 * @returns Promise containing WMTSCapabilitiesDef object
 */
export const wmtsCapabilitiesInWorker = (
  url: string,
  options?: {
    maxNodes: number;
    maxDepth: number;
  }
): Promise<WMTSCapabilitiesDef> => {
  return capabilitiesInWorker(
    url,
    'wmts',
    options
  ) as Promise<WMTSCapabilitiesDef>;
};

/**
 * Call worker to fetch and process capabilities
 * @param url map host url
 * @returns Promise containing parsed capabilities in JSON
 */
const capabilitiesInWorker = (
  url: string,
  type: 'wms' | 'wmts',
  options?: {
    maxNodes: number;
    maxDepth: number;
  }
): Promise<WMTSCapabilitiesDef | WMSCapabilitiesDef> => {
  if (typeof Worker === 'undefined') {
    return Promise.reject(new Error('Error starting Worker!'));
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./maplib.worker', import.meta.url), {
      type: 'module'
    });

    const finalise = (result: any) => {
      worker.terminate();
      if (result) {
        resolve(result);
      } else {
        reject(new Error('Error processing capabilities!'));
      }
    };

    worker.onmessage = (event) => finalise(event.data);
    worker.onerror = () => finalise(null);
    worker.postMessage({
      sourceType: type,
      url: url,
      options: options ?? { maxNodes: 1000, maxDepth: 10 }
    });
  });
};
