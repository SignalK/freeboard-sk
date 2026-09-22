import { describe, it, expect, vi } from 'vitest';
import {
  ogcExceptionMessage,
  wmsGetInfo,
  parseWMSCapabilities,
  parseWMTSCapabilities
} from './maplib.worker';

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
    <Layer>
      <ows:Title>Attribute only</ows:Title>
      <ows:Identifier>attrs</ows:Identifier>
      <Format encoding="x"/>
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
    const l = wmts.layers.find((l) => l.id === 'charts');
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
    expect(wmts.layers.find((l) => l.id === 'charts').time).toEqual({
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
    expect(wmts.layers.map((l) => l.id)).toEqual(['attrs', 'charts']);
  });

  it('treats an attribute-only element as empty text', async () => {
    // xml2js gives `{ $: attrs }` with no `_` for <Format encoding="x"/>;
    // that must read as '' rather than an object reaching indexOf().
    const wmts = await parseWMTSCapabilities(
      WMTS_XML,
      'http://x/wmts',
      OPTIONS
    );
    expect(wmts.layers.find((l) => l.id === 'attrs').format).toBe('png');
  });
});

/**
 * #810: a service answers a request it cannot serve with an OGC exception
 * report -- and HTTP 200, so only the body says what went wrong. The reason
 * must reach the user instead of a generic "invalid response".
 */
describe('OGC exception reports', () => {
  // GeoServer's answer to a GetCapabilities link that got a second query
  // string appended to it.
  const WMS_EXCEPTION = `<?xml version="1.0" encoding="UTF-8"?>
<ServiceExceptionReport version="1.3.0" xmlns="http://www.opengis.net/ogc">
  <ServiceException code="OperationNotSupported" locator="GetCapabilities?request=getcapabilities">
    No such operation wms 1.3.0 GetCapabilities?request=getcapabilities
  </ServiceException>
</ServiceExceptionReport>`;

  const WMTS_EXCEPTION = `<?xml version="1.0" encoding="UTF-8"?>
<ows:ExceptionReport xmlns:ows="http://www.opengis.net/ows/1.1" version="1.1.0">
  <ows:Exception exceptionCode="InvalidParameterValue" locator="request">
    <ows:ExceptionText>Unknown request</ows:ExceptionText>
  </ows:Exception>
</ows:ExceptionReport>`;

  it('surfaces a WMS ServiceExceptionReport by its message', async () => {
    await expect(
      parseWMSCapabilities(WMS_EXCEPTION, 'http://x/wms', OPTIONS)
    ).rejects.toThrow(
      'Service reported: No such operation wms 1.3.0 GetCapabilities?request=getcapabilities'
    );
  });

  it('surfaces a WMTS ows:ExceptionReport by its message', async () => {
    await expect(
      parseWMTSCapabilities(WMTS_EXCEPTION, 'http://x/wmts', OPTIONS)
    ).rejects.toThrow('Service reported: Unknown request');
  });

  it('reads an exception report sent with an error status', async () => {
    // A rejected request may arrive as 400 with the explanation in the body;
    // the status line alone would tell the user nothing.
    const fetchMock = vi.fn(
      async () =>
        new Response(WMS_EXCEPTION, { status: 400, statusText: 'Bad Request' })
    );
    vi.stubGlobal('fetch', fetchMock);
    try {
      await expect(
        wmsGetInfo('https://wms.example/ows', OPTIONS)
      ).rejects.toThrow(
        'Service reported: No such operation wms 1.3.0 GetCapabilities?request=getcapabilities'
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('falls back to the status when an error response says nothing useful', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response('<html>502</html>', {
          status: 502,
          statusText: 'Bad Gateway'
        })
    );
    vi.stubGlobal('fetch', fetchMock);
    try {
      await expect(
        wmsGetInfo('https://wms.example/ows', OPTIONS)
      ).rejects.toThrow('(502) Error fetching capabilities.. Bad Gateway');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('extracts the text, or falls back when the report has none', () => {
    expect(ogcExceptionMessage(WMS_EXCEPTION)).toBe(
      'Service reported: No such operation wms 1.3.0 GetCapabilities?request=getcapabilities'
    );
    expect(ogcExceptionMessage('<ServiceExceptionReport/>')).toBe(
      'Service reported an error.'
    );
    expect(ogcExceptionMessage('<WMS_Capabilities/>')).toBeUndefined();
  });
});
