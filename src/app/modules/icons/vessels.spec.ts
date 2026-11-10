import { describe, it, expect } from 'vitest';
import { aisVesselStyleId } from './vessels';

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

  it('buckets other types by tens', () => {
    expect(aisVesselStyleId(74)).toBe(70);
    expect(aisVesselStyleId(-1)).toBe(10);
  });
});
