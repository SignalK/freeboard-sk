import { describe, it, expect } from 'vitest';
import {
  SKSensorTarget,
  SKVessel
} from 'src/app/modules/skresources/resource-classes';
import {
  locateTarget,
  processSensorTarget,
  unlinkedTargets
} from './sensor-targets';

const RADAR = 'targets.radar:nav1-17';
const CAMERA = 'targets.camera:bow-7';
const VESSEL = 'vessels.urn:mrn:imo:mmsi:244060000';

function vessel(id: string): SKVessel {
  const v = new SKVessel();
  v.id = id;
  v.position = [4.21, 52.11];
  return v;
}

function target(
  targets: Map<string, SKSensorTarget>,
  id: string,
  sameAs: string | null = null
) {
  processSensorTarget(targets, id, {
    path: 'navigation.position',
    value: { latitude: 52.1, longitude: 4.2 }
  });
  processSensorTarget(targets, id, { path: 'sameAs', value: sameAs });
}

describe('processSensorTarget', () => {
  it('builds a target from its navigation and identity values', () => {
    const targets = new Map<string, SKSensorTarget>();
    processSensorTarget(targets, RADAR, {
      path: 'navigation.position',
      value: { latitude: 52.1, longitude: 4.2 }
    });
    processSensorTarget(targets, RADAR, {
      path: 'navigation.courseOverGroundTrue',
      value: 1.5
    });
    processSensorTarget(targets, RADAR, {
      path: 'navigation.speedOverGround',
      value: 4
    });
    processSensorTarget(targets, RADAR, {
      path: '',
      value: { name: 'Nordic Star', mmsi: '244060000' }
    });

    const t = targets.get(RADAR);
    expect(t.position).toEqual([4.2, 52.1]);
    expect(t.cog).toBe(1.5);
    expect(t.orientation).toBe(1.5);
    expect(t.sog).toBe(4);
    expect(t.name).toBe('Nordic Star');
    expect(t.mmsi).toBe('244060000');
    expect(t.type.name).toBe('Radar target');
    expect(t.sameAs).toBeNull();
  });

  it('leaves the course unset until the sensor reports one', () => {
    const targets = new Map<string, SKSensorTarget>();
    processSensorTarget(targets, RADAR, {
      path: 'navigation.speedOverGround',
      value: 4
    });
    expect(targets.get(RADAR).cog).toBeUndefined();
  });

  it('records and withdraws the link to another context', () => {
    const targets = new Map<string, SKSensorTarget>();
    target(targets, RADAR, VESSEL);
    expect(targets.get(RADAR).sameAs).toBe(VESSEL);
    processSensorTarget(targets, RADAR, { path: 'sameAs', value: null });
    expect(targets.get(RADAR).sameAs).toBeNull();
  });

  it('drops a target whose track was lost or has no usable position', () => {
    for (const value of [
      null,
      { latitude: 91, longitude: 4.2 },
      { latitude: 52.1, longitude: 200 },
      { latitude: 'x', longitude: 4.2 }
    ]) {
      const targets = new Map<string, SKSensorTarget>();
      target(targets, RADAR);
      expect(
        processSensorTarget(targets, RADAR, {
          path: 'navigation.position',
          value
        })
      ).toBe(false);
      expect(targets.has(RADAR)).toBe(false);
    }
  });
});

describe('unlinkedTargets', () => {
  it('leaves out a target linked to a vessel on the chart', () => {
    const targets = new Map<string, SKSensorTarget>();
    target(targets, RADAR, VESSEL);
    const shown = unlinkedTargets(targets, new Map([[VESSEL, vessel(VESSEL)]]));
    expect([...shown.keys()]).toEqual([]);
  });

  it('draws a target whose linked vessel is no longer on the chart', () => {
    const targets = new Map<string, SKSensorTarget>();
    target(targets, RADAR, VESSEL);
    expect([...unlinkedTargets(targets, new Map()).keys()]).toEqual([RADAR]);
  });

  it('draws targets linked to each other once', () => {
    const targets = new Map<string, SKSensorTarget>();
    target(targets, RADAR);
    target(targets, CAMERA, RADAR);
    expect([...unlinkedTargets(targets, new Map()).keys()]).toEqual([RADAR]);
  });

  it('follows a chain of links to the vessel at its end', () => {
    const targets = new Map<string, SKSensorTarget>();
    target(targets, RADAR, VESSEL);
    target(targets, CAMERA, RADAR);
    const shown = unlinkedTargets(targets, new Map([[VESSEL, vessel(VESSEL)]]));
    expect([...shown.keys()]).toEqual([]);
  });

  it('leaves out a target linked to own vessel', () => {
    const self = vessel('vessels.urn:mrn:imo:mmsi:211000000');
    const targets = new Map<string, SKSensorTarget>();
    target(targets, RADAR, self.id);
    target(targets, CAMERA, 'vessels.self');
    expect([...unlinkedTargets(targets, new Map(), self).keys()]).toEqual([]);
  });

  it('draws a target whose linked vessel has no position', () => {
    const targets = new Map<string, SKSensorTarget>();
    target(targets, RADAR, VESSEL);
    const unplaced = vessel(VESSEL);
    unplaced.position = null;
    const shown = unlinkedTargets(targets, new Map([[VESSEL, unplaced]]));
    expect([...shown.keys()]).toEqual([RADAR]);
  });

  it('draws a target whose linked target has no position', () => {
    const targets = new Map<string, SKSensorTarget>();
    processSensorTarget(targets, RADAR, { path: 'name', value: 'echo' });
    target(targets, CAMERA, RADAR);
    expect([...unlinkedTargets(targets, new Map()).keys()]).toContain(CAMERA);
  });

  it('draws one of the targets whose links form a loop', () => {
    const targets = new Map<string, SKSensorTarget>();
    target(targets, RADAR, CAMERA);
    target(targets, CAMERA, RADAR);
    expect([...unlinkedTargets(targets, new Map()).keys()]).toEqual([CAMERA]);
  });
});

describe('locateTarget', () => {
  it('locates an AIS vessel, then a sensor target', () => {
    const targets = new Map<string, SKSensorTarget>();
    target(targets, RADAR);
    const vessels = new Map([[VESSEL, vessel(VESSEL)]]);
    expect(locateTarget(VESSEL, vessels, targets)).toEqual([4.21, 52.11]);
    expect(locateTarget(RADAR, vessels, targets)).toEqual([4.2, 52.1]);
  });

  it('locates a vessel no longer on the chart through a target linked to it', () => {
    const targets = new Map<string, SKSensorTarget>();
    target(targets, RADAR, VESSEL);
    expect(locateTarget(VESSEL, new Map(), targets)).toEqual([4.2, 52.1]);
  });

  it('locates a vessel without a position through a target linked to it', () => {
    const targets = new Map<string, SKSensorTarget>();
    target(targets, RADAR, VESSEL);
    const unplaced = vessel(VESSEL);
    unplaced.position = null;
    expect(
      locateTarget(VESSEL, new Map([[VESSEL, unplaced]]), targets)
    ).toEqual([4.2, 52.1]);
  });

  it('returns undefined for a context it does not know', () => {
    expect(locateTarget(VESSEL, new Map(), new Map())).toBeUndefined();
  });
});
