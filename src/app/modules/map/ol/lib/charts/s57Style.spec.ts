import { expect, describe, it } from 'vitest';
import { Feature } from 'ol';
import { S57Style } from './s57Style';
import { S57Service } from './s57.service';

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
