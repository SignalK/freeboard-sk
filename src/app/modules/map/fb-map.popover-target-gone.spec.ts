import { describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';

import { FBMapComponent } from './fb-map.component';
import { SKVessel } from '../skresources/resource-classes';

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
    aircraft: new Map([['aircraft.urn:mrn:imo:mmsi:111234567', {}]]),
    targets: new Map([['targets.radar:nav1-17', {}]])
  };
  return cmp;
};

describe('FBMapComponent — popover target no longer received', () => {
  const cases: [string, string, string][] = [
    ['ais', 'vessels.urn:mrn:imo:mmsi:123456789', 'vessels.gone'],
    ['aton', 'atons.urn:mrn:imo:mmsi:993456789', 'atons.gone'],
    ['aton', 'sar.urn:mrn:imo:mmsi:970123456', 'sar.gone'],
    ['aircraft', 'aircraft.urn:mrn:imo:mmsi:111234567', 'aircraft.gone'],
    ['aton', 'targets.radar:nav1-17', 'targets.gone']
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

describe('FBMapComponent — vessel update with the popover target gone', () => {
  // onVessels() as the stream update reaches it: the app's lists are what the
  // worker last posted.
  const updatedComponent = (type: string, id: string) => {
    const cmp = bareComponent(type, id);
    cmp.dfeat.self = new SKVessel();
    cmp.dfeat.navData = {};
    cmp.app = {
      data: {
        vessels: {
          self: new SKVessel(),
          active: new SKVessel(),
          aisTargets: new Map(),
          closest: [],
          cpaPositions: new Map()
        },
        aircraft: new Map(),
        sar: new Map(),
        meteo: new Map(),
        atons: new Map(),
        targets: new Map()
      }
    };
    cmp.course = { courseData: () => ({}) };
    cmp.drawVesselLines = vi.fn();
    cmp.rotateMap = vi.fn();
    return cmp;
  };

  for (const [type, id] of [
    ['aton', 'atons.urn:mrn:imo:mmsi:993456789'],
    ['aton', 'sar.urn:mrn:imo:mmsi:970123456']
  ]) {
    it(`hides the ${id.split('.')[0]} popover once the update drops its target`, () => {
      const cmp = updatedComponent(type, id);

      cmp.onVessels();

      expect(cmp.overlay().show).toBe(false);
    });

    it(`keeps the ${id.split('.')[0]} popover while the update still has its target`, () => {
      const cmp = updatedComponent(type, id);
      const list = id.startsWith('sar.')
        ? cmp.app.data.sar
        : cmp.app.data.atons;
      list.set(id, {});

      cmp.onVessels();

      expect(cmp.overlay().show).toBe(true);
    });
  }

  it('keeps the AIS popover where it was when the vessel has no position', () => {
    const id = 'vessels.urn:mrn:imo:mmsi:123456789';
    const cmp = updatedComponent('ais', id);
    cmp.overlay.update((o: object) => ({ ...o, position: [1, 2] }));
    // the worker's selectVessel() starts a vessel with a null position, which
    // SKVessel's type does not admit
    const vessel = Object.assign(new SKVessel(), { position: null });
    cmp.app.data.vessels.aisTargets.set(id, vessel);

    cmp.onVessels();

    expect(cmp.overlay().position).toEqual([1, 2]);
    expect(cmp.overlay().vessel).toBe(vessel);
  });

  it('keeps the own-vessel popover where it was without a self position', () => {
    const cmp = updatedComponent('ais', '');
    cmp.overlay.update((o: object) => ({
      ...o,
      isSelf: true,
      position: [1, 2]
    }));
    cmp.dfeat.self.position = null;
    cmp.app.data.vessels.self.position = null;

    cmp.onVessels();

    expect(cmp.overlay().position).toEqual([1, 2]);
  });
});
