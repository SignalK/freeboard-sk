import { describe, expect, it } from 'vitest';
import { signal } from '@angular/core';

import { FBMapComponent } from './fb-map.component';

// The popover of a vessel, AtoN, SaR beacon or aircraft closes once its target
// is no longer received. Exercised on a bare prototype instance, as in
// fb-map.track-route.spec.ts.

const bareComponent = (type: string, id: string) => {
  const cmp = Object.create(FBMapComponent.prototype);
  cmp.overlay = signal({ show: true, type, id });
  cmp.dfeat = {
    ais: new Map([['vessels.urn:mrn:imo:mmsi:123456789', {}]]),
    atons: new Map([['atons.urn:mrn:imo:mmsi:993456789', {}]]),
    sar: new Map([['sar.urn:mrn:imo:mmsi:970123456', {}]]),
    aircraft: new Map([['aircraft.urn:mrn:imo:mmsi:111234567', {}]])
  };
  return cmp;
};

describe('FBMapComponent — popover target no longer received', () => {
  const cases: [string, string, string][] = [
    ['ais', 'vessels.urn:mrn:imo:mmsi:123456789', 'vessels.gone'],
    ['aton', 'atons.urn:mrn:imo:mmsi:993456789', 'atons.gone'],
    ['aton', 'sar.urn:mrn:imo:mmsi:970123456', 'sar.gone'],
    ['aircraft', 'aircraft.urn:mrn:imo:mmsi:111234567', 'aircraft.gone']
  ];
  for (const [type, present, gone] of cases) {
    it(`keeps the ${gone.split('.')[0]} popover while its target is received`, () => {
      expect(bareComponent(type, present).popoverTargetGone()).toBe(false);
    });
    it(`closes the ${gone.split('.')[0]} popover once its target is gone`, () => {
      expect(bareComponent(type, gone).popoverTargetGone()).toBe(true);
    });
  }

  it('does not look for a SaR beacon among the AtoNs', () => {
    const cmp = bareComponent('aton', 'sar.urn:mrn:imo:mmsi:993456789');
    cmp.dfeat.atons.set('sar.urn:mrn:imo:mmsi:993456789', {});
    expect(cmp.popoverTargetGone()).toBe(true);
  });
});
