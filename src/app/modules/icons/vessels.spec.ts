import { describe, it, expect } from 'vitest';
import { aisVesselStyleId, ownVesselIconType } from './vessels';

// The AIS layer and the track-history ghosts both pick a vessel's image with
// this, so a fishing vessel's ghost matches its live target (#1236).
describe('aisVesselStyleId', () => {
  it('gives fishing vessels their own style', () => {
    expect(aisVesselStyleId(30)).toBe('fishing');
  });

  it('keeps sailing and pleasure craft on the type 30 style', () => {
    expect(aisVesselStyleId(36)).toBe(30);
    expect(aisVesselStyleId(37)).toBe(30);
  });

  it('draws towing, dredging, diving and military vessels as special craft', () => {
    for (const t of [31, 32, 33, 34, 35]) {
      expect(aisVesselStyleId(t)).toBe(50);
    }
  });

  it('keeps the reserved types 38 and 39 on the type 30 style', () => {
    expect(aisVesselStyleId(38)).toBe(30);
    expect(aisVesselStyleId(39)).toBe(30);
  });

  it('buckets other types by tens', () => {
    expect(aisVesselStyleId(74)).toBe(70);
    expect(aisVesselStyleId(-1)).toBe(10);
  });
});

describe('ownVesselIconType', () => {
  it('draws the chosen icon whatever the hull type', () => {
    expect(ownVesselIconType('powerboat', 'catamaran', 36)).toBe('powerboat');
  });

  it('draws an icon a later release added as the default', () => {
    expect(
      ownVesselIconType('hovercraft' as unknown as 'classic', null, null)
    ).toBe('classic');
  });

  it.each([
    ['catamaran', 37, 'catamaran'],
    ['trimaran', null, 'trimaran'],
    ['monohull', 36, 'monohull'],
    ['monohull', 37, 'powerboat'],
    ['monohull', -1, 'classic'],
    ['monohull', null, 'classic'],
    [null, 36, 'classic']
  ] as const)(
    'draws hull type %s with ship type %s as %s',
    (hull, ship, icon) => {
      expect(ownVesselIconType('hullType', hull, ship)).toBe(icon);
    }
  );
});
