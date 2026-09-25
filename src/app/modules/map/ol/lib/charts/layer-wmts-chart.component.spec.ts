import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TileLayer from 'ol/layer/Tile';
import WMTS from 'ol/source/WMTS';

import { WmtsChartLayerComponent } from './layer-wmts-chart.component';
import { MapComponent } from '../map.component';
import { SKChart } from 'src/app/modules/skresources/resource-classes';
import { FBChart } from 'src/app/types';

/**
 * The WMTS layer fetches the service's capabilities before it can build its
 * source, so `parseChart` is asynchronous — and the chart it captured can be
 * stale by the time the fetch resolves. A selected instant made that
 * observable: an older continuation resuming after a newer one would put the
 * older instant back.
 */
describe('WmtsChartLayerComponent — time-varying chart', () => {
  const T0 = '2026-09-18T12:00:00.000Z';
  const map = { addLayer: vi.fn(), removeLayer: vi.fn(), render: vi.fn() };

  // The least a parsed WMTS capabilities document needs for
  // optionsFromCapabilities: one layer with a REST tile template and a Time
  // dimension, on one EPSG:3857 matrix.
  const capabilities = () => ({
    Contents: {
      Layer: [
        {
          Identifier: 'radar',
          Format: ['image/png'],
          Style: [{ Identifier: 'default', isDefault: true }],
          TileMatrixSetLink: [{ TileMatrixSet: 'EPSG:3857' }],
          Dimension: [{ Identifier: 'Time', Default: 'latest' }],
          ResourceURL: [
            {
              resourceType: 'tile',
              format: 'image/png',
              template:
                'https://wmts.test/{Time}/{TileMatrix}/{TileRow}/{TileCol}.png'
            }
          ]
        }
      ],
      TileMatrixSet: [
        {
          Identifier: 'EPSG:3857',
          SupportedCRS: 'urn:ogc:def:crs:EPSG::3857',
          TileMatrix: [
            {
              Identifier: '0',
              ScaleDenominator: 559082264.0287178,
              TopLeftCorner: [-20037508.342789244, 20037508.342789244],
              TileWidth: 256,
              TileHeight: 256,
              MatrixWidth: 1,
              MatrixHeight: 1
            }
          ]
        }
      ]
    }
  });

  const radar = (timeValue: string | null): FBChart => {
    const chart = new SKChart({
      name: 'Radar',
      url: 'https://wmts.test',
      type: 'WMTS',
      layers: ['radar'],
      time: { current: true, from: T0, to: '2026-09-18T15:00:00.000Z' }
    });
    chart.timeValue = timeValue;
    return ['radar', chart, true];
  };

  /** A capabilities fetch the test resolves by hand. */
  const deferred = () => {
    let resolve!: (value: unknown) => void;
    const promise = new Promise((r) => (resolve = r));
    return { promise, resolve };
  };

  const flush = () => new Promise((r) => setTimeout(r, 0));
  const source = (): WMTS =>
    (map.addLayer.mock.calls[0][0] as TileLayer).getSource() as WMTS;

  let fetches: Array<ReturnType<typeof deferred>>;

  beforeEach(async () => {
    fetches = [];
    map.addLayer.mockReset();
    map.removeLayer.mockReset();
    map.render.mockReset();
    // Each parseChart that finds no capabilities yet starts its own fetch.
    vi.spyOn(
      WmtsChartLayerComponent.prototype as unknown as {
        fetchWMTSCapabilities: () => Promise<unknown>;
      },
      'fetchWMTSCapabilities'
    ).mockImplementation(() => {
      const d = deferred();
      fetches.push(d);
      return d.promise;
    });
    await TestBed.configureTestingModule({
      declarations: [WmtsChartLayerComponent],
      providers: [{ provide: MapComponent, useValue: { getMap: () => map } }]
    }).compileComponents();
  });

  afterEach(() => vi.restoreAllMocks());

  it('applies the selected instant through the Time dimension once the capabilities arrive', async () => {
    const fixture = TestBed.createComponent(WmtsChartLayerComponent);
    fixture.componentRef.setInput('chart', radar(T0));
    fixture.componentRef.setInput('zIndex', 10);
    fixture.detectChanges();
    fetches[0].resolve(capabilities());
    await flush();
    expect(source().getDimensions()).toEqual({ Time: T0 });
  });

  it('lets a newer parseChart supersede an older one still awaiting capabilities', async () => {
    const fixture = TestBed.createComponent(WmtsChartLayerComponent);
    fixture.componentRef.setInput('chart', radar(null));
    fixture.componentRef.setInput('zIndex', 10);
    fixture.detectChanges(); // parse #1 (live), fetch in flight
    fixture.componentRef.setInput('chart', radar(T0));
    fixture.detectChanges(); // parse #2 (T0), its own fetch in flight
    expect(fetches).toHaveLength(2);

    // The newer request resolves first and builds the layer at T0 …
    fetches[1].resolve(capabilities());
    await flush();
    expect(source().getDimensions()).toEqual({ Time: T0 });

    // … and the older continuation, resuming late with its stale chart, must
    // not put the live frame back or add a second layer.
    fetches[0].resolve(capabilities());
    await flush();
    expect(source().getDimensions()).toEqual({ Time: T0 });
    expect(map.addLayer).toHaveBeenCalledTimes(1);
  });
});

/**
 * Which of a layer's tile matrix sets the source is built on (#838). The
 * fixture is Kartverket's Norwegian chart layer as its capabilities publish it:
 * a UTM set listed first and the Web Mercator set under another name.
 */
describe('WmtsChartLayerComponent — tile matrix set', () => {
  const map = { addLayer: vi.fn(), removeLayer: vi.fn(), render: vi.fn() };

  const matrix = (scale: number, topLeft: number[]) => [
    {
      Identifier: '00',
      ScaleDenominator: scale,
      TopLeftCorner: topLeft,
      TileWidth: 256,
      TileHeight: 256,
      MatrixWidth: 1,
      MatrixHeight: 1
    }
  ];

  const capabilities = {
    Contents: {
      Layer: [
        {
          Identifier: 'sjokartraster',
          Format: ['image/png'],
          Style: [{ Identifier: 'default', isDefault: true }],
          TileMatrixSetLink: [
            { TileMatrixSet: 'utm32n' },
            { TileMatrixSet: 'webmercator' }
          ],
          ResourceURL: [
            {
              resourceType: 'tile',
              format: 'image/png',
              template:
                'https://wmts.test/sjokartraster/default/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png'
            }
          ]
        }
      ],
      TileMatrixSet: [
        {
          Identifier: 'utm32n',
          SupportedCRS: 'urn:ogc:def:crs:EPSG:25832',
          TileMatrix: matrix(77371428.57142857, [-2000000, 9045984])
        },
        {
          Identifier: 'webmercator',
          SupportedCRS: 'urn:ogc:def:crs:EPSG:3857',
          TileMatrix: matrix(
            559082264.0287176,
            [-20037508.342789244, 20037508.342789244]
          )
        }
      ]
    }
  };

  const sjokart = (): FBChart => [
    'sjokart',
    new SKChart({
      name: 'Sjøkart',
      url: 'https://wmts.test',
      type: 'WMTS',
      layers: ['sjokartraster']
    }),
    true
  ];

  const flush = () => new Promise((r) => setTimeout(r, 0));

  beforeEach(async () => {
    map.addLayer.mockReset();
    map.removeLayer.mockReset();
    map.render.mockReset();
    vi.spyOn(
      WmtsChartLayerComponent.prototype as unknown as {
        fetchWMTSCapabilities: () => Promise<unknown>;
      },
      'fetchWMTSCapabilities'
    ).mockResolvedValue(capabilities);
    await TestBed.configureTestingModule({
      declarations: [WmtsChartLayerComponent],
      providers: [{ provide: MapComponent, useValue: { getMap: () => map } }]
    }).compileComponents();
  });

  afterEach(() => vi.restoreAllMocks());

  it('builds on the Web Mercator set even when it is not named EPSG:3857 or listed first', async () => {
    const fixture = TestBed.createComponent(WmtsChartLayerComponent);
    fixture.componentRef.setInput('chart', sjokart());
    fixture.componentRef.setInput('zIndex', 10);
    fixture.detectChanges();
    await flush();

    expect(map.addLayer).toHaveBeenCalledTimes(1);
    const source = (map.addLayer.mock.calls[0][0] as TileLayer).getSource();
    expect((source as WMTS).getMatrixSet()).toBe('webmercator');
    expect(source.getProjection().getCode()).toBe('EPSG:3857');
  });
});
