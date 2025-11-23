import { WMSCapabilities, WMTSCapabilities } from 'ol/format';
import { SKInfoLayer } from '../../custom-resource-classes';
import { ChartProvider } from 'src/app/types';
import { SKChart } from '../../resource-classes';

interface DurationDef {
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}

export interface TimeDimension {
  from: string;
  to: string;
  interval?: number;
  values?: string[];
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
    d.years * (3600 * 1000 * 24 * 365) +
    d.months * (3600 * 1000 * 24 * 30) +
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
export const parseIsoTimeValue = (value: string): string => {
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
export const parseTimeDimension = (
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
      result.interval = parseInterval(range[2]);
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

interface TimeDef extends TimeDimension {
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

/** Retrieve WMS capabilities as JSON object */
export const WMSGetCapabilities = async (wmsHost: string) => {
  try {
    const r = await fetch(wmsHost + `?request=getcapabilities&service=wms`);
    const res = await r.text();
    const wms = new WMSCapabilities();
    const capabilities = wms.read(res);
    return capabilities;
  } catch (err) {
    throw new Error(err.message);
  }
};

/** Parse ol/format/WMSCapabilities() result */
export const parseWMSCapabilities = (capabilities: any, data: LayerNode[]) => {
  const parseLayer = (
    layer: any,
    cList: LayerNode[],
    parent: LayerNode = null
  ) => {
    const node: LayerNode = {
      name: layer.Name ?? '',
      title: layer.Title ?? '',
      description: layer.Abstract ?? '',
      selected: false,
      parent: parent
    };
    if (Array.isArray(layer.Dimension)) {
      for (let d of layer.Dimension) {
        if (d.name.toLowerCase() === 'time' && d.units === 'ISO8601') {
          node.time = Object.assign(
            { current: d.default ?? null },
            parseTimeDimension(d.values, d.default)
          );
          break;
        }
      }
    }
    if (layer.Layer) {
      node.children = [];
      layer.Layer.forEach((l) => parseLayer(l, node.children));
    }
    cList.push(node);
  };

  if (Array.isArray(capabilities.Capability.Layer)) {
    capabilities.Capability.Layer.forEach((layer: any) => {
      parseLayer(layer, data);
    });
  } else {
    parseLayer(capabilities.Capability.Layer, data);
  }
  data.sort((a, b) => (a.name < b.name ? -1 : 1));
};

/** Retrieve infomation for layer with the supplied name
 * @param name WMS Layer Name
 * @param capabilities WMS capabilities JSON object
 * @returns LayerNode object
 */
export const getWMSLayerNodeByName = (
  name: string,
  capabilities: any
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
  const data = [];
  parseWMSCapabilities(capabilities, data);
  for (let node of data) {
    parseNode(node);
    if (result) {
      break;
    }
  }
  return result;
};

/** Retrieve WMTS capabilities as JSON object */
export const WMTSGetCapabilities = async (wmtsHost: string) => {
  try {
    const r = await fetch(wmtsHost + `?request=GetCapabilities&service=wmts`);
    const res = await r.text();
    const wmts = new WMTSCapabilities();
    const capabilities = wmts.read(res);
    return capabilities;
  } catch (err) {
    throw new Error(err.message);
  }
};

/** Retrieve the available layers from WMTS Capabilities metadata */
export const getWMTSLayers = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  capabilities: any,
  urlBase: string,
  format: string
): Array<ChartProvider | SKInfoLayer> => {
  const maps: Array<ChartProvider | SKInfoLayer> = [];
  if (!capabilities.Contents?.Layer) {
    return maps;
  }
  const layers = capabilities.Contents?.Layer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  layers.forEach((layer: any) => {
    const ch = parseWMTSLayer(layer, urlBase, format);
    if (ch) {
      maps.push(ch);
    }
  });
  return maps;
};

/** Parse WMTS layer */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parseWMTSLayer = (
  layer: any,
  urlBase: string,
  format: string
): ChartProvider | SKInfoLayer | null => {
  if (layer.Identifier) {
    if (format === 'infolayer') {
      const l = new SKInfoLayer();
      l.name = layer.Title ?? 'Untitled layer';
      l.description = layer.Abstract ?? '';
      l.values.layers = [layer.Identifier];
      l.values.url = urlBase;
      l.values.sourceType = 'WMTS';
      if (Array.isArray(layer.Dimension) && layer.Dimension.length > 0) {
        layer.Dimension.forEach((d) => {
          if (d.Identifier.toLowerCase() === 'time') {
            l.values.time = Object.assign(
              { current: parseIsoTimeValue(d.Default) ?? null },
              parseTimeDimension(d.Value, d.Default)
            );
          }
        });
      }
      return l;
    } else {
      const l: ChartProvider = {
        name: layer.Title ?? 'Untitled layer',
        description: layer.Abstract ?? '',
        type: 'WMTS',
        url: urlBase,
        layers: [layer.Identifier]
      };
      if (
        Array.isArray(layer.WGS84BoundingBox) &&
        layer.WGS84BoundingBox.length > 0
      ) {
        l.bounds = layer.WGS84BoundingBox;
      }
      if (Array.isArray(layer.Format) && layer.Format.length > 0) {
        const f = layer.Format[0];
        l.format = f.includes('jpg') ? 'jpg' : 'png';
      } else {
        l.format = 'png';
      }
      return l;
    }
  } else {
    return null;
  }
};

/**
 * Retrieve infomation for WMTS layer with the supplied name
 * @param name WMTS Layer Name
 * @param capabilities WMTS capabilities JSON object
 * @returns SKInfoLayer object
 * */
export const getWMTSInfoLayerByName = (
  name: string,
  capabilities: any
): SKInfoLayer => {
  const data = getWMTSLayers(capabilities, '', 'infolayer');
  const l = data.find((i: SKInfoLayer) => i.values.layers[0] === name);
  return l as SKInfoLayer;
};
