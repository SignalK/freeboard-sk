import { describe, expect, it } from 'vitest';

import {
  chartDescriptionFromAbstract,
  ogcRequestUrl,
  ogcServiceUrl,
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

/**
 * #808: the description a chart takes from a picked layer's abstract -- its
 * first clause, since abstracts are often paragraphs and the field is a line.
 */
describe('chartDescriptionFromAbstract', () => {
  it('cuts at the first comma, semicolon or full stop', () => {
    expect(
      chartDescriptionFromAbstract(
        'Composite radar mosaic, updated every 5 minutes. Coverage: CONUS.'
      )
    ).toBe('Composite radar mosaic');
    expect(chartDescriptionFromAbstract('Coastline; 1:50000 scale')).toBe(
      'Coastline'
    );
    expect(chartDescriptionFromAbstract('Static coastline. Not tidal.')).toBe(
      'Static coastline'
    );
  });

  it('does not treat a decimal point as a break', () => {
    expect(
      chartDescriptionFromAbstract(
        'GMGSI longwave thermal infrared band (~12.0 µm) has hourly updates. More.'
      )
    ).toBe(
      'GMGSI longwave thermal infrared band (~12.0 µm) has hourly updates'
    );
  });

  it('keeps a one-clause abstract whole, trimmed', () => {
    expect(chartDescriptionFromAbstract('  Daily true-colour imagery ')).toBe(
      'Daily true-colour imagery'
    );
    expect(chartDescriptionFromAbstract(undefined)).toBe('');
  });

  it('falls back to the whole abstract when the cut would be empty', () => {
    expect(chartDescriptionFromAbstract('. odd')).toBe('. odd');
  });
});

/**
 * #810: a user adding a WMS/WMTS source pastes the GetCapabilities link the
 * provider publishes, query string and all. The stored service URL drops the
 * request parameters (they are supplied per request) and keeps the rest; a
 * request URL is then built with `?` or `&` as the service URL needs.
 */
describe('ogcServiceUrl', () => {
  it('strips the request parameters from a pasted GetCapabilities link', () => {
    expect(
      ogcServiceUrl(
        'https://opengeo.ncep.noaa.gov/geoserver/kamx/ows?service=wms&version=1.3.0&request=GetCapabilities'
      )
    ).toBe('https://opengeo.ncep.noaa.gov/geoserver/kamx/ows');
  });

  it('keeps parameters that belong to the service, case-insensitively', () => {
    expect(
      ogcServiceUrl(
        'https://wms.example/cgi-bin/mapserv?map=/maps/radar.map&SERVICE=WMS&REQUEST=GetCapabilities'
      )
    ).toBe('https://wms.example/cgi-bin/mapserv?map=%2Fmaps%2Fradar.map');
  });

  it('leaves a bare service URL alone and trims whitespace and fragments', () => {
    expect(ogcServiceUrl('https://wms.example/ows')).toBe(
      'https://wms.example/ows'
    );
    expect(ogcServiceUrl('  https://wms.example/ows?#top ')).toBe(
      'https://wms.example/ows'
    );
    expect(ogcServiceUrl(undefined)).toBe('');
  });
});

describe('ogcRequestUrl', () => {
  const params = { service: 'WMS', request: 'GetCapabilities' };

  it('appends with ? to a bare service URL', () => {
    expect(ogcRequestUrl('https://wms.example/ows', params)).toBe(
      'https://wms.example/ows?service=WMS&request=GetCapabilities'
    );
  });

  it('appends with & to a service URL that already has a query', () => {
    expect(
      ogcRequestUrl('https://wms.example/mapserv?map=radar.map', params)
    ).toBe(
      'https://wms.example/mapserv?map=radar.map&service=WMS&request=GetCapabilities'
    );
  });

  it('never produces a second ? even for an un-normalised link', () => {
    // A chart stored before the URL was normalised on entry.
    expect(
      ogcRequestUrl(
        'https://wms.example/ows?service=wms&version=1.3.0&request=GetCapabilities',
        params
      )
    ).toBe(
      'https://wms.example/ows?version=1.3.0&service=WMS&request=GetCapabilities'
    );
  });
});
