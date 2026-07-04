import { expect, describe, it } from 'vitest';
import { SKStreamFacade } from './skstream.facade';
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
