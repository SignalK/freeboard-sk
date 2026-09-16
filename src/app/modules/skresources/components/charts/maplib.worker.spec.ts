import { describe, it, expect } from 'vitest';
import { parseWMSCapabilities, parseWMTSCapabilities } from './maplib.worker';

/**
 * The capabilities parsers read xml2js output, whose shape is only implied by
 * the XML: every child element is an array, and an element with attributes is
 * `{ _: text, $: attributes }` rather than its text. These tests pin that
 * reading against small, representative documents so the element types the
 * worker declares stay honest.
 */
const OPTIONS = { maxNodes: 100, maxDepth: 5 };

const WMS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<WMS_Capabilities version="1.3.0">
  <Service>
    <Name>WMS</Name>
    <Title>Test WMS</Title>
    <Abstract>A test service</Abstract>
  </Service>
  <Capability>
    <Layer>
      <Title>Root</Title>
      <Layer>
        <Name>sst</Name>
        <Title>Sea surface temperature</Title>
        <Abstract>SST analysis</Abstract>
        <Dimension name="time" units="ISO8601" default="2026-09-16T00:00:00.000Z">2026-09-15T00:00:00.000Z/2026-09-17T00:00:00.000Z/PT6H</Dimension>
      </Layer>
      <Layer>
        <Name>bathy</Name>
        <Title>Bathymetry</Title>
      </Layer>
    </Layer>
  </Capability>
</WMS_Capabilities>`;

const WMTS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Capabilities xmlns="http://www.opengis.net/wmts/1.0" xmlns:ows="http://www.opengis.net/ows/1.1" version="1.0.0">
  <Contents>
    <Layer>
      <ows:Title>Nautical chart</ows:Title>
      <ows:Abstract>Raster chart tiles</ows:Abstract>
      <ows:WGS84BoundingBox>
        <ows:LowerCorner>-81.0 24.5</ows:LowerCorner>
        <ows:UpperCorner>-80.0 26.0</ows:UpperCorner>
      </ows:WGS84BoundingBox>
      <ows:Identifier>charts</ows:Identifier>
      <Format>image/jpg</Format>
      <Dimension>
        <ows:Identifier>time</ows:Identifier>
        <Default>2026-09-16T00:00:00Z</Default>
        <Value>2026-09-15T00:00:00Z</Value>
        <Value>2026-09-16T00:00:00Z</Value>
      </Dimension>
    </Layer>
    <Layer>
      <ows:Title>Untiled</ows:Title>
    </Layer>
  </Contents>
</Capabilities>`;

describe('parseWMSCapabilities', () => {
  it('reads the service name and description', async () => {
    const wms = await parseWMSCapabilities(WMS_XML, 'http://x/wms', OPTIONS);
    expect(wms.type).toBe('WMS');
    expect(wms.url).toBe('http://x/wms');
    expect(wms.name).toBe('Test WMS');
    expect(wms.description).toBe('A test service');
  });

  it('builds the layer tree with names, titles and children', async () => {
    const wms = await parseWMSCapabilities(WMS_XML, 'http://x/wms', OPTIONS);
    expect(wms.layers).toHaveLength(1);
    const root = wms.layers[0];
    expect(root.name).toBe('');
    expect(root.title).toBe('Root');
    // top-level layers are sorted by name; children keep document order
    expect(root.children.map((l) => l.name)).toEqual(['sst', 'bathy']);
    expect(root.children[0].description).toBe('SST analysis');
    expect(root.children[0].parent).toBe(root);
  });

  it('reads a time dimension from the element text and its attributes', async () => {
    const wms = await parseWMSCapabilities(WMS_XML, 'http://x/wms', OPTIONS);
    const sst = wms.layers[0].children.find((l) => l.name === 'sst');
    expect(sst.time).toEqual({
      current: '2026-09-16T00:00:00.000Z',
      from: '2026-09-15T00:00:00.000Z',
      to: '2026-09-17T00:00:00.000Z',
      interval: 6 * 3600 * 1000
    });
    expect(wms.layers[0].children.find((l) => l.name === 'bathy').time).toBe(
      null
    );
  });

  it('rejects a document without capabilities', async () => {
    await expect(
      parseWMSCapabilities('<html></html>', 'http://x/wms', OPTIONS)
    ).rejects.toThrow();
  });
});

describe('parseWMTSCapabilities', () => {
  it('reads identifier, title, bounds and format', async () => {
    const wmts = await parseWMTSCapabilities(
      WMTS_XML,
      'http://x/wmts',
      OPTIONS
    );
    expect(wmts.type).toBe('WMTS');
    expect(wmts.layers).toHaveLength(1);
    const l = wmts.layers[0];
    expect(l.id).toBe('charts');
    expect(l.name).toBe('Nautical chart');
    expect(l.description).toBe('Raster chart tiles');
    expect(l.bounds).toEqual([-81, 24.5, -80, 26]);
    expect(l.format).toBe('jpg');
  });

  it('reads a list of time values', async () => {
    const wmts = await parseWMTSCapabilities(
      WMTS_XML,
      'http://x/wmts',
      OPTIONS
    );
    expect(wmts.layers[0].time).toEqual({
      current: '2026-09-16T00:00:00.000Z',
      from: '2026-09-15T00:00:00.000Z',
      to: '2026-09-16T00:00:00.000Z',
      values: ['2026-09-15T00:00:00.000Z', '2026-09-16T00:00:00.000Z']
    });
  });

  it('skips a layer with no identifier', async () => {
    const wmts = await parseWMTSCapabilities(
      WMTS_XML,
      'http://x/wmts',
      OPTIONS
    );
    expect(wmts.layers.map((l) => l.id)).toEqual(['charts']);
  });
});
