import { describe, expect, it, vi } from 'vitest';
import { Feature } from 'ol';
import { DisplayCategory, Lookup, S57Service } from './s57.service';
import { S57Style } from './s57Style';

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
