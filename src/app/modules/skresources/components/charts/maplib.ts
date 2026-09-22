import { ChartTimeDimension } from 'src/app/types';
import { chartTimeFromCapabilities } from 'src/app/lib/chart-time';

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
  bounds?: [number, number, number, number];
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

/** Return the layer identifier to show alongside its display title.
 *
 * Capabilities documents often give sibling layers the same `Title` but
 * distinct `Name` / `Identifier` values (e.g. one regional mosaic per
 * territory), and the identifier is what is actually stored in the chart's
 * `layers` array — so it is the identity the user is choosing (#797).
 * @param title Display title (WMS `Title`, WMTS `ows:Title`)
 * @param id Layer identifier (WMS `Name`, WMTS `ows:Identifier`)
 * @returns id when it adds information, else '' (missing, or the same as the
 * title ignoring case / surrounding whitespace, or when there is no title —
 * the id is already the label in that case)
 */
export const layerIdHint = (title?: string, id?: string): string => {
  const t = (title ?? '').trim();
  const i = (id ?? '').trim();
  if (!t || !i) {
    return '';
  }
  return t.toLowerCase() === i.toLowerCase() ? '' : i;
};

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

  for (const node of data) {
    parseNode(node);
    if (result) {
      break;
    }
  }
  return result;
};

/**
 * The time dimension a chart takes from a capabilities document for the
 * layers it shows: a WMTS chart its (single) layer's, a WMS chart the first
 * selected layer's that advertises one -- the rule the Properties dialog
 * applies when a layer is picked, and what a refresh tick re-derives for a
 * user-added chart, whose stored resource is only a snapshot of this
 * (#804). Undefined when none of the layers is time-varying.
 * @param capabilities Parsed WMS / WMTS capabilities
 * @param layers The chart's `layers` (WMS `Name`s / a WMTS `Identifier`)
 */
export const chartTimeFromLayers = (
  capabilities: WMSCapabilitiesDef | WMTSCapabilitiesDef | undefined,
  layers: string[] | undefined
): ChartTimeDimension | undefined => {
  if (!capabilities || !Array.isArray(layers)) {
    return undefined;
  }
  if (capabilities.type === 'WMTS') {
    const l = capabilities.layers.find((i: WMTSLayerDef) => i.id === layers[0]);
    return chartTimeFromCapabilities(l?.time);
  }
  for (const name of layers) {
    const time = chartTimeFromCapabilities(
      getLayerNodeByName(name, capabilities.layers)?.time
    );
    if (time) {
      return time;
    }
  }
  return undefined;
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

    const finalise = (
      result: WMTSCapabilitiesDef | WMSCapabilitiesDef | null
    ) => {
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
