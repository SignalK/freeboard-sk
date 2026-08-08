import { expect, describe, it } from 'vitest';
import {
  SKStreamFacade,
  isPositionStale,
  SELF_POSITION_STALE_AGE
} from './skstream.facade';
import { SKVessel } from '../skresources/resource-classes';

// AIS icons rotate by `orientation`. A crabbing target's heading and COG differ,
// so the icon must follow heading, with COG only as a fallback when no heading
// is reported. Guards the precedence in parseVesselOther against a silent
// reorder (#415).
describe('SKStreamFacade.parseVesselOther — AIS target orientation', () => {
  // Exercise the real (private) method without the heavy DI constructor.
  const orientationOf = (v: SKVessel): number => {
    const facade = Object.create(SKStreamFacade.prototype) as unknown as {
      app: unknown;
      parseVesselOther: (targets: Map<string, SKVessel>) => void;
    };
    facade.app = { useMagnetic: false, data: { vessels: {} } };
    facade.parseVesselOther(new Map([['ais', v]]));
    return v.orientation;
  };

  const vessel = (props: Partial<SKVessel>): SKVessel =>
    Object.assign(new SKVessel(), props);

  it('prefers true heading when both heading and COG are present', () => {
    expect(
      orientationOf(vessel({ headingTrue: Math.PI / 4, cogTrue: 1.658 }))
    ).toBe(Math.PI / 4);
  });

  it('falls back to COG when no heading is reported', () => {
    expect(
      orientationOf(
        vessel({ headingTrue: null, headingMagnetic: null, cogTrue: 1.658 })
      )
    ).toBe(1.658);
  });
});

/**
 * Position age is measured against the client clock stamp applied when the
 * position delta arrived (#672), so it reports "no data" whether the
 * connection dropped or the server is still talking with no position source.
 */
describe('isPositionStale (#672)', () => {
  const now = 1_000_000;

  it('is not stale while updates are arriving', () => {
    expect(isPositionStale(now - 1000, now)).toBe(false);
  });

  it('is not stale exactly at the threshold', () => {
    expect(isPositionStale(now - SELF_POSITION_STALE_AGE, now)).toBe(false);
  });

  it('is stale once the threshold is passed', () => {
    expect(isPositionStale(now - SELF_POSITION_STALE_AGE - 1, now)).toBe(true);
  });

  it('is not stale when no position has ever been received', () => {
    expect(isPositionStale(0, now)).toBe(false);
  });
});
