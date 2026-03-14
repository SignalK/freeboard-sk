import {
  LayerNode,
  WMSCapabilitiesDef,
  WMTSCapabilitiesDef,
  WMTSLayerDef,
  TimeDimension
} from './maplib';
import { parseStringPromise } from 'xml2js';

type WorkerMessage = {
  sourceType: 'wms' | 'wmts';
  url?: string;
  options?: WorkerMessageOptions;
};

type WorkerMessageOptions = {
  maxNodes?: number;
  maxDepth?: number;
};

type WorkerResult =
  | object // xml2json
  | WMSCapabilitiesDef
  | WMTSCapabilitiesDef;

const FETCH_ABORT_TIMEOUT = 8000;

/**
 * Process message from host
 * @param event Message from host
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { sourceType } = event.data;
  try {
    let result: WorkerResult;
    if (sourceType === 'wms') {
      const { url, options } = event.data;
      result = await wmsGetInfo(url, options);
    } else if (sourceType === 'wmts') {
      const { url, options } = event.data;
      result = await wmtsGetInfo(url, options);
    } else {
      result = null;
    }
    self.postMessage(result);
  } catch (err) {
    self.postMessage(null);
  }
};

/**
 * Make request to WMS server and parse Capabilities
 * @param hostUrl WMS host url
 * @returns WMSCapabilitiesDef
 */
const wmsGetInfo = async (
  hostUrl: string,
  options: WorkerMessageOptions
): Promise<WMSCapabilitiesDef> => {
  const url = hostUrl + `?request=getcapabilities&service=wms`;
  const abortCtrl = new AbortController();
  const abortTimer = setTimeout(() => abortCtrl.abort(), FETCH_ABORT_TIMEOUT);
  try {
    const res = await fetch(url, {
      signal: abortCtrl.signal
    });
    clearTimeout(abortTimer);
    if (!res.ok) {
      throw new Error(
        `(${res.status}) Error fetching capabilities.. ${res.statusText}`
      );
    }
    const xml = await res.text();
    const wmsInfo = await parseWMSCapabilities(xml, url, options);
    return wmsInfo;
  } catch (err) {
    throw err;
  }
};

/**
 * Parse WMS Capabilities xml
 * @param xml
 * @param urlBase
 */
const parseWMSCapabilities = async (
  xml: string,
  urlBase: string,
  options: WorkerMessageOptions
): Promise<WMSCapabilitiesDef> => {
  let nodeCount = 0;

  /**
   * Process WMS layer into LayerNode
   * @param layer WMS layer to parse
   * @param cList LayerNode array
   * @param parent Parent LayerNode
   * @param depth Index of the depth of the layer in the tree
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processWMSLayer = (
    layer: any,
    cList: LayerNode[],
    parent: LayerNode = null,
    depth = 0
  ) => {
    if (nodeCount >= options.maxNodes || depth > options.maxDepth) {
      return;
    }
    nodeCount += 1;
    const node: LayerNode = {
      name: layer.Name ? getValue(layer.Name[0]) : '',
      description: layer.Abstract ? getValue(layer.Abstract[0]) : '',
      selected: false,
      parent: parent,
      time: null
    };
    if (layer.Title) {
      node.title = getValue(layer.Title[0]);
    }
    if (Array.isArray(layer.Dimension)) {
      for (let d of layer.Dimension) {
        if (d.$?.name.toLowerCase() === 'time' && d.$?.units === 'ISO8601') {
          node.time = Object.assign(
            { current: d.$?.default ?? null },
            parseTimeDimension(d._, d.$?.default)
          );
          break;
        }
      }
    }
    if (layer.Layer) {
      node.children = [];
      layer.Layer.forEach((l) =>
        processWMSLayer(l, node.children, node, depth + 1)
      );
    }
    cList.push(node);
  };

  if (xml.indexOf('<Capability') === -1) {
    throw new Error('Error: Invalid response received!');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = await parseStringPromise(xml);
  if (!json.WMS_Capabilities && !json.WMT_MS_Capabilities) {
    throw new Error('Error: No Capabilities found!');
  }
  const rootNode = json.WMS_Capabilities
    ? json.WMS_Capabilities
    : json.WMT_MS_Capabilities
      ? json.WMT_MS_Capabilities
      : undefined;
  if (!rootNode?.Capability[0].Layer) {
    throw new Error('Error: No layer information found!');
  }
  const wms: WMSCapabilitiesDef = {
    name: '',
    description: '',
    type: 'WMS',
    url: urlBase,
    layers: []
  };

  if (hasValue(rootNode?.Service)) {
    const svc = rootNode?.Service[0];
    wms.name = hasValue(svc.Title)
      ? getValue(svc.Title[0])
      : hasValue(svc.Name)
        ? getValue(svc.Name[0])
        : 'WMS';
    wms.description = hasValue(svc.Abstract) ? getValue(svc.Abstract[0]) : '';
  }

  const layerNodes: LayerNode[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rootNode.Capability[0].Layer.forEach((layer: any) => {
    processWMSLayer(layer, layerNodes);
  });
  layerNodes.sort((a, b) => (a.name < b.name ? -1 : 1));
  wms.layers = layerNodes;
  return wms;
};

/**
 * Make request to WMTS server and parse Capabilities
 * @param hostUrl WMTS host url
 * @returns CapabilitiesDef
 */
const wmtsGetInfo = async (
  hostUrl: string,
  options: WorkerMessageOptions
): Promise<WMTSCapabilitiesDef> => {
  const url = hostUrl + `?request=GetCapabilities&service=wmts`;
  const abortCtrl = new AbortController();
  const abortTimer = setTimeout(() => abortCtrl.abort(), FETCH_ABORT_TIMEOUT);
  try {
    const res = await fetch(url, {
      signal: abortCtrl.signal
    });
    clearTimeout(abortTimer);
    if (!res.ok) {
      throw new Error(
        `(${res.status}) Error fetching capabilities.. ${res.statusText}`
      );
    }
    const xml = await res.text();
    const wmtsInfo = await parseWMTSCapabilities(xml, url, options);
    return wmtsInfo;
  } catch (err) {
    throw err;
  }
};

/**
 * Parse WMTS Capabilities xml
 * @param xml
 * @param urlBase
 * @param options: WorkerMessageOptions
 */
const parseWMTSCapabilities = async (
  xml: string,
  urlBase: string,
  options: WorkerMessageOptions
): Promise<WMTSCapabilitiesDef> => {
  /**
   * Process WMTS layer into WMTSLayerDef
   * @param layer WMTS layer to parse
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parseWMTSLayer = (layer: any): WMTSLayerDef => {
    if (!hasValue(layer['ows:Identifier'])) {
      return null;
    }
    const l: any = {
      name: hasValue(layer['ows:Title']) ? getValue(layer['ows:Title'][0]) : '',
      description: hasValue(layer['ows:Abstract'])
        ? getValue(layer['ows:Abstract'][0])
        : '',
      id: getValue(layer['ows:Identifier'][0])
    };
    if (hasValue(layer['ows:WGS84BoundingBox'])) {
      l.bounds = [
        Number(
          layer['ows:WGS84BoundingBox'][0]['ows:LowerCorner'][0].split(' ')[0]
        ),
        Number(
          layer['ows:WGS84BoundingBox'][0]['ows:LowerCorner'][0].split(' ')[1]
        ),
        Number(
          layer['ows:WGS84BoundingBox'][0]['ows:UpperCorner'][0].split(' ')[0]
        ),
        Number(
          layer['ows:WGS84BoundingBox'][0]['ows:UpperCorner'][0].split(' ')[1]
        )
      ];
    }
    if (hasValue(layer.Format)) {
      const f = getValue(layer.Format[0]);
      l.format = f.indexOf('jpg') !== -1 ? 'jpg' : 'png';
    } else {
      l.format = 'png';
    }
    if (hasValue(layer.Dimension)) {
      layer.Dimension.forEach((d) => {
        if (getValue(d['ows:Identifier'][0]).toLowerCase() === 'time') {
          l.time = Object.assign(
            { current: parseIsoTimeValue(getValue(d.Default[0])) ?? null },
            parseTimeDimension(getValue(d.Value), getValue(d.Default[0]))
          );
        }
      });
    }
    return l;
  };

  if (xml.indexOf('<Capabilities') === -1) {
    throw new Error('Error: Invalid response received!');
  }
  const json = await parseStringPromise(xml);
  if (!hasValue(json.Capabilities?.Contents)) {
    throw new Error('Error: No Capabilities found!');
  }
  if (!hasValue(json.Capabilities.Contents[0].Layer)) {
    throw new Error('Error: No layer information found!');
  }

  const wmts: WMTSCapabilitiesDef = {
    name: '',
    description: '',
    type: 'WMTS',
    url: urlBase,
    layers: []
  };

  let layerCount = 0;
  for (const layer of json.Capabilities.Contents[0].Layer) {
    if (layerCount >= options.maxNodes) break;
    const l = parseWMTSLayer(layer);
    if (l) {
      wmts.layers.push(l);
    }
    layerCount++;
  }

  wmts.layers.sort((a, b) => (a.name < b.name ? -1 : 1));
  return wmts;
};

/**
 * Check xml2json attribute has a value
 * @param val Value to test
 * @returns true if value is an Array with length > 0
 */
const hasValue = (val: any) => Array.isArray(val) && val.length !== 0;
/**
 * Check xml2json attribute has a value
 * @param val Value to test
 * @returns true if value is an Array with length > 0
 */
const getValue = (val: any) => val._ ?? val;

interface DurationDef {
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}

/**
 * Parse ISO8601 durations
 * @param value ISO duration string e.g. P1D, PT36H
 * @returns ISO8601 duration object
 */
const parseIso8601Duration = (value: string): DurationDef => {
  const regex =
    /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;
  const match = value.match(regex);
  if (!match) {
    return {
      years: 0,
      months: 0,
      weeks: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0
    };
  }
  return {
    years: parseInt(match[1] ?? '0'),
    months: parseInt(match[2] ?? '0'),
    weeks: parseInt(match[3] ?? '0'),
    days: parseInt(match[4] ?? '0'),
    hours: parseInt(match[5] ?? '0'),
    minutes: parseInt(match[6] ?? '0'),
    seconds: parseFloat(match[7] ?? '0')
  };
};

/**
 * Return total milliseconds represented by ISO8601 duration
 * @param value ISO duration time string e.g. PT4M, PT36H
 * @returns total number of milliseconds
 */
const parseInterval = (value: string): number => {
  const d = parseIso8601Duration(value);
  return (
    //d.years * (3600 * 1000 * 24 * 365) +
    //d.months * (3600 * 1000 * 24 * 30) +
    d.weeks * (3600 * 1000 * 24 * 7) +
    d.days * (3600 * 1000 * 24) +
    d.hours * (3600 * 1000) +
    d.minutes * (60 * 1000) +
    d.seconds * 1000
  );
};

/**
 *
 * @param srcDate Source date ISO string
 * @param duration ISO8601 duration object
 * @param isPost Indicates reference of duration to the srcDate (true= post srcDate, false= prior to srcDate)
 * @returns Date ISO string
 */
const calcDate = (
  srcDate: string,
  duration: DurationDef,
  isPost?: boolean
): string => {
  const src = {
    y: new Date(srcDate).getFullYear(),
    m: new Date(srcDate).getMonth(),
    d: new Date(srcDate).getDate()
  };
  const dest = {
    y: isPost ? src.y + duration.years : src.y - duration.years,
    m: isPost ? src.m + duration.months : src.m - duration.months,
    d: isPost ? src.d + duration.days : src.d - duration.days
  };
  if (duration.weeks) {
    const d = duration.weeks * 7;
    dest.d = isPost ? dest.d + d : dest.d - d;
  }
  const d = new Date(srcDate);
  d.setFullYear(dest.y, dest.m, dest.d);

  let tOffset =
    duration.hours * (1000 * 3600) +
    duration.minutes * (1000 * 60) +
    duration.seconds * 1000;
  tOffset = !isPost ? 0 - tOffset : tOffset;
  d.setTime(d.getTime() + tOffset);
  return d.toISOString();
};

const isIsoDuration = (value: string): boolean => value.startsWith('P');
const isYearOnly = (value: string): boolean =>
  !value.includes('-') && !value.includes(':');
const isYearMonth = (value: string): boolean =>
  value.split('-').length === 2 && !value.includes('T');
const isDateOnly = (value: string): boolean =>
  value.split('-').length === 3 && !value.includes('T');
const is8DigitDate = (value: string): boolean =>
  value.length === 8 && !value.startsWith('P');
const isDateAndHour = (value: string): boolean =>
  value.includes('T') && !value.includes(':');
const isRange = (value: string): boolean => value.includes('/');

/**
 * Parse date string andreturn ISO format string
 * @param value ISO8601 date string
 * @returns ISO string
 */
const parseIsoTimeValue = (value: string): string => {
  try {
    if (
      value.toLocaleLowerCase() === 'current' ||
      value.toLocaleLowerCase() === 'present'
    ) {
      return new Date().toISOString();
    }
    if (is8DigitDate(value)) {
      value = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}`;
    } else if (isDateAndHour(value)) {
      value += `:00:00.000Z`;
    }
    return new Date(value).toISOString();
  } catch (err) {
    throw new Error(`Unhandled Date format (${value})`);
  }
};

/**
 * Parse WMS /WMTS ISO 8601 time dimension string
 * @param value ISO8601 time value
 * @param defaultValue Time dimension default value
 * @returns TimeDimension object
 */
const parseTimeDimension = (
  value: string,
  defaultValue: string
): TimeDimension => {
  const parseRangeEnd = (value: string): string => {
    if (isYearOnly(value)) {
      return `${value}-12-31T23:59:59.999Z`;
    } else if (isYearMonth(value)) {
      const ym = value.split('-').map((i) => parseInt(i));
      const ld = new Date(ym[0], ym[1], 0).getDate();
      return `${value}-${ld}T23:59:59.999Z`;
    } else if (isDateOnly(value)) {
      return `${value}T23:59:59.999Z`;
    } else {
      return parseIsoTimeValue(value);
    }
  };
  const parseRange = (range: string[]): TimeDimension => {
    const result: TimeDimension = {
      from: null,
      to: null
    };
    if (
      range[0].toLocaleLowerCase() === 'present' ||
      range[0].toLocaleLowerCase() === 'current'
    ) {
      range[0] = new Date().toISOString();
    }
    if (
      range[1].toLocaleLowerCase() === 'present' ||
      range[1].toLocaleLowerCase() === 'current'
    ) {
      range[1] = new Date().toISOString();
    }

    // start value
    if (isIsoDuration(range[0])) {
      result.from = calcDate(range[1], parseIso8601Duration(range[0]), false);
    } else {
      result.from = parseIsoTimeValue(range[0]);
    }
    // end value
    if (isIsoDuration(range[1])) {
      result.to = calcDate(range[0], parseIso8601Duration(range[1]), true);
    } else {
      result.to = parseRangeEnd(range[1]);
    }
    // interval
    if (range.length === 3) {
      const interval = parseInterval(range[2]);
      if (interval) result.interval = interval;
    }
    return result;
  };

  try {
    if (Array.isArray(value)) {
      // check if values are ranges
      const ranges = [];
      value.forEach((r) => {
        if (isRange(r)) {
          const range = parseRange(r.split('/'));
          if (range) ranges.push(range);
        }
      });
      if (ranges.length) {
        // ranges provided... return a range
        const dv = new Date(defaultValue).valueOf();
        for (let i = 0; i < ranges.length; i++) {
          if (
            dv >= new Date(ranges[i].from).valueOf() &&
            dv <= new Date(ranges[i].to).valueOf()
          ) {
            return ranges[i];
          }
        }
        return ranges[ranges.length - 1];
      }
      // array of time values
      const mv = value.map((v) => parseIsoTimeValue(v));
      if (mv.length > 1) {
        return {
          from: mv[0] ?? null,
          to: mv[mv.length - 1] ?? null,
          values: mv
        };
      } else {
        // parse single array value as a time value string
        value = mv[0];
      }
    }

    if (value.includes(',')) {
      // list of times
      const mv = value.split(',').map((v) => parseIsoTimeValue(v));
      return {
        from: mv[0] ?? null,
        to: mv[mv.length - 1] ?? null,
        values: mv
      };
    } else if (typeof value === 'string') {
      if (isRange(value)) {
        return parseRange(value.split('/'));
      } else {
        // reduced accuracy
        if (isYearOnly(value)) {
          const d = new Date(value);
          const y = d.getFullYear();
          d.setFullYear(y + 1);
          return {
            from: parseIsoTimeValue(value),
            to: d.toISOString()
          };
        } else if (isYearMonth(value)) {
          const d = new Date(value);
          const ld = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
          d.setFullYear(d.getFullYear(), d.getMonth(), ld);
          d.setUTCHours(23);
          d.setUTCMinutes(59);
          d.setUTCSeconds(59, 999);
          return {
            from: parseIsoTimeValue(value),
            to: d.toISOString()
          };
        } else {
          return {
            from: null,
            to: null
          };
        }
      }
    }
  } catch {
    return {
      from: null,
      to: null
    };
  }
};
