import { describe, expect, it, vi } from 'vitest';
import { Subject } from 'rxjs';
import { Feature } from 'ol';
import { SKChart } from 'src/app/modules';
import { VectorLayerStyleFactory } from './vectorLayerStyleFactory';
import { DisplayCategory, Lookup, S57Service } from './s57.service';
import { S57Style } from './s57Style';

/*
 * The S-57 service announces a refresh when the symbols, then their image,
 * have loaded, and when the S-57 options change. None of these changes the
 * features of a tile, only how they are drawn.
 */

const chart = {
  type: 'S-57',
  url: '/signalk/v1/api/resources/charts/enc/{z}/{x}/{y}',
  minZoom: 9,
  maxZoom: 16,
  bounds: [165, -23, 169, -17]
} as unknown as SKChart;

describe('S-57 chart refresh', () => {
  it('draws the loaded tiles again instead of fetching them again', () => {
    const service = {
      refresh: new Subject<void>(),
      lookupRevision: 0,
      fetchSymbols: () => undefined
    } as unknown as S57Service;
    const styler = new VectorLayerStyleFactory(service).CreateVectorLayerStyler(
      chart
    );
    expect(styler).toBeDefined();
    const layer = styler!.CreateLayer();
    styler!.ApplyStyle(layer);
    const source = layer.getSource()!;
    const refetch = vi.spyOn(source, 'refresh');
    const revision = layer.getRevision();

    service.refresh.next();

    expect(refetch).not.toHaveBeenCalled();
    expect(layer.getRevision()).toBeGreaterThan(revision);
  });

  // OpenLayers sorts a loaded tile's features again only for a new render
  // order function; the sort is where display priority and the safe contour
  // are worked out.
  it('sorts the loaded features again, in the S-57 order', () => {
    const service = {
      refresh: new Subject<void>(),
      lookupRevision: 0,
      options: { safetyDepth: 3 },
      selectLookup: () => -1,
      fetchSymbols: () => undefined
    } as unknown as S57Service;
    const styler = new VectorLayerStyleFactory(service).CreateVectorLayerStyler(
      chart
    )!;
    const layer = styler.CreateLayer();
    styler.ApplyStyle(layer);
    const before = layer.getRenderOrder();

    service.refresh.next();

    const after = layer.getRenderOrder();
    expect(after).toBeTypeOf('function');
    expect(after).not.toBe(before);
    const sea = new Feature({ layer: 'SEAARE' });
    const land = new Feature({ layer: 'LNDARE' });
    const reference = new S57Style(service).renderOrder;
    expect(Math.sign(after!(sea, land))).toBe(Math.sign(reference(sea, land)));
    expect(Math.sign(after!(land, sea))).toBe(Math.sign(reference(land, sea)));
  });
});

describe('S57Style lookup cache', () => {
  const lookup = {
    name: 'LNDARE',
    instruction: '',
    displayCategory: DisplayCategory.DISPLAYBASE
  } as unknown as Lookup;

  const setup = () => {
    const service = {
      lookupRevision: 0,
      options: { otherLayers: [] },
      selectLookup: vi.fn(() => -1),
      getLookup: () => lookup
    };
    const style = new S57Style(service as unknown as S57Service);
    return { service, style };
  };

  it('keeps the lookup chosen for a feature while the revision holds', () => {
    const { service, style } = setup();
    const feature = new Feature();
    style.getStyle(feature, 10);
    style.getStyle(feature, 10);
    expect(service.selectLookup).toHaveBeenCalledTimes(1);
  });

  it('chooses again once the lookups have loaded, though "none" was cached', () => {
    const { service, style } = setup();
    const feature = new Feature();
    // drawn before the symbols arrived: no lookup yet
    expect(style.getStyle(feature, 10)).toBeUndefined();

    service.selectLookup.mockReturnValue(0);
    service.lookupRevision++;

    expect(style.getStyle(feature, 10)).toEqual([]);
    expect(service.selectLookup).toHaveBeenCalledTimes(2);
  });

  it('chooses again in the draw order once the revision moves on', () => {
    const { service, style } = setup();
    const a = new Feature({ layer: 'LNDARE' });
    const b = new Feature({ layer: 'LNDARE' });
    style.renderOrder(a, b);
    expect(service.selectLookup).toHaveBeenCalledTimes(2);
    style.renderOrder(a, b);
    expect(service.selectLookup).toHaveBeenCalledTimes(2);
    service.lookupRevision++;
    style.renderOrder(a, b);
    expect(service.selectLookup).toHaveBeenCalledTimes(4);
  });
});
