import { describe, expect, it } from 'vitest';

import { layerIdHint } from './maplib';

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
