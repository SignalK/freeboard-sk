import { describe, it, expect } from 'vitest';
import { acquireRequest, radarTargetRef } from './radar-targets';

describe('acquireRequest', () => {
  it('gives the true bearing in radians and the distance in metres', () => {
    // one nautical mile due east on the equator
    const r = acquireRequest([0, 0], [1 / 60, 0]);
    expect(r?.bearing).toBeCloseTo(Math.PI / 2, 3);
    expect(r?.distance).toBeGreaterThan(1840);
    expect(r?.distance).toBeLessThan(1860);
  });

  it('keeps a bearing west of north inside 0..2π', () => {
    const r = acquireRequest([0, 0], [-0.01, 0.01]);
    expect(r?.bearing).toBeCloseTo((7 * Math.PI) / 4, 2);
  });

  it('needs both positions and a point away from the radar', () => {
    expect(acquireRequest(undefined, [1, 1])).toBeNull();
    expect(acquireRequest([1, 1], null)).toBeNull();
    expect(acquireRequest([1, 1], [1, 1])).toBeNull();
  });
});

describe('radarTargetRef', () => {
  it('reads the radar and the target number from the context', () => {
    expect(radarTargetRef('targets.radar:fur6424A-17')).toEqual({
      radarId: 'fur6424A',
      targetId: 17
    });
  });

  it('keeps a hyphen inside the radar id', () => {
    expect(radarTargetRef('targets.radar:radar-0-3')).toEqual({
      radarId: 'radar-0',
      targetId: 3
    });
  });

  it('is null for camera targets, AIS vessels and nothing', () => {
    expect(radarTargetRef('targets.camera:bow-7')).toBeNull();
    expect(radarTargetRef('vessels.urn:mrn:imo:mmsi:123456789')).toBeNull();
    expect(radarTargetRef(undefined)).toBeNull();
  });
});
