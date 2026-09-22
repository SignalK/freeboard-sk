import { describe, expect, it } from 'vitest';

import {
  chartTimeFromLayers,
  layerIdHint,
  LayerNode,
  WMSCapabilitiesDef,
  WMTSCapabilitiesDef
} from './maplib';

/**
 * #797: layer pickers show the layer identifier beside its title whenever the
 * identifier adds information, so sibling layers that share a title (e.g. one
 * NEXRAD mosaic per territory) can be told apart.
 */
describe('layerIdHint', () => {
  it('returns the identifier when it differs from the title', () => {
    expect(
      layerIdHint('NEXRAD BASE REFLECT (GOOGLE)', 'nexrad-n0q-900913-conus')
    ).toBe('nexrad-n0q-900913-conus');
  });

  it('returns nothing when the identifier repeats the title', () => {
    expect(layerIdHint('OpenSeaMap', 'OpenSeaMap')).toBe('');
  });

  it('ignores case and surrounding whitespace when comparing', () => {
    expect(layerIdHint('Bathymetry', ' bathymetry ')).toBe('');
  });

  it('returns nothing for a container layer with no identifier', () => {
    expect(layerIdHint('IEM WMS Service', '')).toBe('');
    expect(layerIdHint('IEM WMS Service', undefined)).toBe('');
  });

  it('returns nothing when there is no title (the identifier is already the label)', () => {
    expect(layerIdHint(undefined, 'n0q')).toBe('');
    expect(layerIdHint('', 'n0q')).toBe('');
  });
});

describe('chartTimeFromLayers', () => {
  const T0 = '2026-09-18T12:00:00Z';
  const T1 = '2026-09-18T12:05:00Z';
  const node = (name: string, time?: LayerNode['time']): LayerNode =>
    ({ name, description: '', selected: false, time }) as LayerNode;
  const wms: WMSCapabilitiesDef = {
    type: 'WMS',
    name: 'nowCOAST',
    description: '',
    url: 'https://nowcoast/wms',
    layers: [
      node('group', undefined),
      node('static'),
      node('goes', { from: T0, to: T1, current: T1, values: [T1, T0] })
    ]
  };
  wms.layers[0].children = [node('nested', { from: T0, to: T1, current: T1 })];
  const wmts: WMTSCapabilitiesDef = {
    type: 'WMTS',
    name: 'w',
    description: '',
    url: 'https://w/wmts',
    layers: [
      {
        name: 'Radar',
        description: '',
        id: 'radar',
        format: 'png',
        time: { from: T0, to: T1, current: T1, interval: 300000 }
      },
      { name: 'Base', description: '', id: 'base', format: 'jpg' }
    ]
  };

  it('takes the first selected WMS layer that advertises a dimension', () => {
    expect(chartTimeFromLayers(wms, ['static', 'goes'])).toEqual({
      current: true,
      from: T0,
      to: T1,
      values: [T0, T1]
    });
  });

  it('finds a WMS layer nested in a group', () => {
    expect(chartTimeFromLayers(wms, ['nested'])?.from).toBe(T0);
  });

  it('takes the WMTS layer by identifier', () => {
    expect(chartTimeFromLayers(wmts, ['radar'])).toEqual({
      current: true,
      from: T0,
      to: T1,
      step: 300000
    });
  });

  it('is undefined when no shown layer is time-varying, or there is nothing to read', () => {
    expect(chartTimeFromLayers(wms, ['static'])).toBeUndefined();
    expect(chartTimeFromLayers(wms, ['nope'])).toBeUndefined();
    expect(chartTimeFromLayers(wmts, ['base'])).toBeUndefined();
    expect(chartTimeFromLayers(undefined, ['radar'])).toBeUndefined();
    expect(chartTimeFromLayers(wmts, undefined)).toBeUndefined();
  });
});
