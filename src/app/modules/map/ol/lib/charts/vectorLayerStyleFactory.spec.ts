import { describe, expect, it, vi } from 'vitest';
import { Subject } from 'rxjs';
import { Feature } from 'ol';
import { SKChart } from 'src/app/modules';
import { VectorLayerStyleFactory } from './vectorLayerStyleFactory';
import { S57Service } from './s57.service';
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
