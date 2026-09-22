import { ChartTimeDimension } from 'src/app/types';
import {
  chartTimeFromCapabilities,
  chartTimeSummary
} from 'src/app/lib/chart-time';

/**
 * Names a user-added WMS / WMTS chart carries until it is given one: the
 * Properties dialog treats either as "not yet named" and fills the name in
 * from the first layer the user picks (#808).
 */
export const NEW_WMS_CHART_NAME = 'New WMS Chart';
export const NEW_WMTS_CHART_NAME = 'New WMTS Chart';

/** Whether a chart name is blank or still one of the placeholders above. */
export const isPlaceholderChartName = (name?: string): boolean => {
  const n = (name ?? '').trim();
  return (
    !n ||
    n.toLowerCase() === NEW_WMS_CHART_NAME.toLowerCase() ||
    n.toLowerCase() === NEW_WMTS_CHART_NAME.toLowerCase()
  );
};

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

/** The chart description to take from a layer abstract (#808): its first
 * clause -- up to, not including, the first `.`, `,` or `;` -- since a WMS
 * abstract is often a paragraph and the field is a single line. A `.`
 * between two digits is a decimal point (`~12.0 µm`, `v1.2`), not a break.
 * Falls back to the whole (trimmed) abstract when the cut would leave nothing.
 * @param abstract Layer `Abstract` / `ows:Abstract`
 */
export const chartDescriptionFromAbstract = (abstract?: string): string => {
  const text = (abstract ?? '').trim();
  const m = /[,;]|\.(?!\d)|(?<!\d)\./.exec(text);
  const clause = m ? text.slice(0, m.index).trim() : text;
  return clause || text;
};

/**
 * Query parameters an OGC request supplies itself. A user who pastes the
 * GetCapabilities link a provider publishes brings these along; the request
 * builder replaces them, so they are dropped from the stored service URL and
 * anything else on the link (a `map=` or an API key) is kept (#810).
 */
const OGC_REQUEST_PARAMS = ['service', 'request', 'version'];

/** Split a URL into its base and query, dropping any fragment. */
const splitQuery = (url: string): { base: string; params: URLSearchParams } => {
  const noHash = url.trim().split('#')[0];
  const q = noHash.indexOf('?');
  return q === -1
    ? { base: noHash, params: new URLSearchParams() }
    : {
        base: noHash.slice(0, q),
        params: new URLSearchParams(noHash.slice(q + 1))
      };
};

const withoutParams = (
  params: URLSearchParams,
  names: string[]
): URLSearchParams => {
  const drop = names.map((n) => n.toLowerCase());
  const kept = new URLSearchParams();
  params.forEach((value, key) => {
    if (!drop.includes(key.toLowerCase())) {
      kept.append(key, value);
    }
  });
  return kept;
};

/**
 * The service URL to store for a WMS / WMTS source the user entered: the
 * link with `service`, `request` and `version` removed (they are supplied
 * per request), other parameters kept, and no dangling `?` (#810).
 * @param entered What the user typed or pasted
 */
export const ogcServiceUrl = (entered: string): string => {
  const { base, params } = splitQuery(entered ?? '');
  const kept = withoutParams(params, OGC_REQUEST_PARAMS).toString();
  return kept ? `${base}?${kept}` : base;
};

/**
 * A request URL for an OGC service: `params` are appended with `?` or `&`
 * as the service URL requires, replacing any of the same name already on it
 * (#810).
 * @param serviceUrl Stored service URL (see `ogcServiceUrl`)
 * @param params Request parameters, e.g. `{ service: 'WMS', request: 'GetCapabilities' }`
 */
export const ogcRequestUrl = (
  serviceUrl: string,
  params: Record<string, string>
): string => {
  const { base, params: existing } = splitQuery(serviceUrl ?? '');
  const merged = withoutParams(existing, Object.keys(params));
  Object.entries(params).forEach(([k, v]) => merged.append(k, v));
  return `${base}?${merged.toString()}`;
};

/** Return the picker hint for a layer's time dimension: a one-line summary
 * (see `chartTimeSummary`) when the layer advertises one that would give the
 * chart a Time control, else '' (#808).
 * @param time Layer time dimension as the capabilities parser yields it
 */
export const layerTimeHint = (time?: TimeDef | null): string =>
  chartTimeSummary(chartTimeFromCapabilities(time ?? undefined));

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
      result:
        WMTSCapabilitiesDef | WMSCapabilitiesDef | { error: string } | null
    ) => {
      worker.terminate();
      if (result && 'error' in result) {
        reject(new Error(result.error));
      } else if (result) {
        resolve(result as WMTSCapabilitiesDef | WMSCapabilitiesDef);
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
