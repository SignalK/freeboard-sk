import { expect, describe, it, vi } from 'vitest';
import { Feature } from 'ol';
import { S57Style } from './s57Style';
import { DisplayCategory, Lookup, S57Service } from './s57.service';

// GetCSQQUALIN01 reads only feature properties, so an empty service is enough.
const style = () => new S57Style({} as S57Service);

const coastline = (props: Record<string, string>) =>
  ({
    getProperties: () => props
  }) as unknown as Feature;

const qualin = (feature: Feature): string[] =>
  (
    style() as unknown as {
      GetCSQQUALIN01: (f: Feature) => string[];
    }
  ).GetCSQQUALIN01(feature);

// A copy/paste slip assigned the CONRAD value to `quapos`/`bquapos` — variables
// belonging to the enclosing QUAPOS branch — leaving `bconrad` permanently false.
// The whole radar-conspicuous coastline branch was therefore unreachable, and
// every COALNE feature rendered as a plain coastline.
describe('S57Style.GetCSQQUALIN01 — COALNE radar conspicuity (CONRAD)', () => {
  it('adds the magenta highlight for a radar-conspicuous coastline', () => {
    expect(qualin(coastline({ layer: 'COALNE', CONRAD: '1' }))).toEqual([
      'LS(SOLD,3,CHMGF)',
      'LS(SOLD,1,CSTLN)'
    ]);
  });

  it('draws a plain coastline when CONRAD is present but not radar-conspicuous', () => {
    expect(qualin(coastline({ layer: 'COALNE', CONRAD: '2' }))).toEqual([
      'LS(SOLD,1,CSTLN)'
    ]);
  });

  it('draws a plain coastline when CONRAD is absent', () => {
    expect(qualin(coastline({ layer: 'COALNE' }))).toEqual([
      'LS(SOLD,1,CSTLN)'
    ]);
  });

  it('leaves the CONRAD branch alone when QUAPOS applies', () => {
    expect(
      qualin(coastline({ layer: 'COALNE', QUAPOS: '4', CONRAD: '1' }))
    ).toEqual(['LC(LOWACC21']);
  });

  it('draws a plain coastline for a non-COALNE layer', () => {
    expect(qualin(coastline({ layer: 'DEPCNT', CONRAD: '1' }))).toEqual([
      'LS(SOLD,1,CSTLN)'
    ]);
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
