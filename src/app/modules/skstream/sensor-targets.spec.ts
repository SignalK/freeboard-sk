import { describe, it, expect } from 'vitest';
import {
  SKSensorTarget,
  SKVessel
} from 'src/app/modules/skresources/resource-classes';
import {
  fusedVessels,
  isSilent,
  locateTarget,
  processSensorTarget,
  unlinkedTargets
} from './sensor-targets';

const RADAR = 'targets.radar:nav1-17';
const CAMERA = 'targets.camera:bow-7';
const VESSEL = 'vessels.urn:mrn:imo:mmsi:244060000';
const COG_LINE = 10;

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
  processSensorTarget(
    targets,
    id,
    {
      path: 'navigation.position',
      value: { latitude: 52.1, longitude: 4.2 }
    },
    COG_LINE
  );
  processSensorTarget(targets, id, { path: 'sameAs', value: sameAs }, COG_LINE);
}

describe('processSensorTarget', () => {
  it('builds a target from its navigation and identity values', () => {
    const targets = new Map<string, SKSensorTarget>();
    processSensorTarget(
      targets,
      RADAR,
      {
        path: 'navigation.position',
        value: { latitude: 52.1, longitude: 4.2 }
      },
      COG_LINE
    );
    processSensorTarget(
      targets,
      RADAR,
      {
        path: 'navigation.courseOverGroundTrue',
        value: 1.5
      },
      COG_LINE
    );
    processSensorTarget(
      targets,
      RADAR,
      {
        path: 'navigation.speedOverGround',
        value: 4
      },
      COG_LINE
    );
    processSensorTarget(
      targets,
      RADAR,
      {
        path: '',
        value: { name: 'Nordic Star', mmsi: '244060000' }
      },
      COG_LINE
    );

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

  it('draws a course line as long as AIS vessels have', () => {
    const targets = new Map<string, SKSensorTarget>();
    processSensorTarget(
      targets,
      RADAR,
      { path: 'navigation.position', value: { latitude: 0, longitude: 0 } },
      COG_LINE
    );
    expect(targets.get(RADAR).vectors.cog).toBeNull();
    processSensorTarget(
      targets,
      RADAR,
      { path: 'navigation.speedOverGround', value: 5 },
      COG_LINE
    );
    processSensorTarget(
      targets,
      RADAR,
      { path: 'navigation.courseOverGroundTrue', value: Math.PI / 2 },
      COG_LINE
    );
    const [start, end] = targets.get(RADAR).vectors.cog;
    expect(start).toEqual([0, 0]);
    // 5 m/s for 10 minutes due east: 3000 m, about 0.027 degrees at the equator
    expect(end[0]).toBeCloseTo(0.02698, 4);
    expect(end[1]).toBeCloseTo(0, 6);
  });

  it('drops the course and its line when the sensor stops reporting one', () => {
    const targets = new Map<string, SKSensorTarget>();
    processSensorTarget(
      targets,
      RADAR,
      { path: 'navigation.position', value: { latitude: 0, longitude: 0 } },
      COG_LINE
    );
    processSensorTarget(
      targets,
      RADAR,
      { path: 'navigation.courseOverGroundTrue', value: 1 },
      COG_LINE
    );
    processSensorTarget(
      targets,
      RADAR,
      { path: 'navigation.courseOverGroundTrue', value: null },
      COG_LINE
    );
    processSensorTarget(
      targets,
      RADAR,
      { path: 'navigation.speedOverGround', value: 'fast' },
      COG_LINE
    );
    const t = targets.get(RADAR);
    expect(t.cog).toBeUndefined();
    expect(t.orientation).toBe(0);
    expect(t.vectors.cog).toBeNull();
    expect(t.sog).toBeUndefined();
  });

  it('leaves the course unset until the sensor reports one', () => {
    const targets = new Map<string, SKSensorTarget>();
    processSensorTarget(
      targets,
      RADAR,
      {
        path: 'navigation.speedOverGround',
        value: 4
      },
      COG_LINE
    );
    expect(targets.get(RADAR).cog).toBeUndefined();
  });

  it('records and withdraws the link to another context', () => {
    const targets = new Map<string, SKSensorTarget>();
    target(targets, RADAR, VESSEL);
    expect(targets.get(RADAR).sameAs).toBe(VESSEL);
    processSensorTarget(
      targets,
      RADAR,
      { path: 'sameAs', value: null },
      COG_LINE
    );
    expect(targets.get(RADAR).sameAs).toBeNull();
  });

  it('keeps a lost target dropped while its remaining null values arrive', () => {
    const targets = new Map<string, SKSensorTarget>();
    target(targets, RADAR, VESSEL);
    for (const path of [
      'navigation.position',
      'navigation.courseOverGroundTrue',
      'navigation.speedOverGround',
      'sameAs'
    ]) {
      expect(
        processSensorTarget(targets, RADAR, { path, value: null }, COG_LINE)
      ).toBe(false);
    }
    expect(targets.has(RADAR)).toBe(false);
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
        processSensorTarget(
          targets,
          RADAR,
          {
            path: 'navigation.position',
            value
          },
          COG_LINE
        )
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

  it('places linked targets at the one that reported last', () => {
    const targets = new Map<string, SKSensorTarget>();
    target(targets, RADAR);
    target(targets, CAMERA, RADAR);
    targets.get(RADAR).positionUpdatedAt = 1000;
    targets.get(CAMERA).positionUpdatedAt = 2000;
    targets.get(CAMERA).position = [4.3, 52.2];
    const shown = unlinkedTargets(targets, new Map()).get(RADAR);
    expect(shown.position).toEqual([4.3, 52.2]);
    expect(shown).toBeInstanceOf(SKSensorTarget);
    expect(targets.get(RADAR).position).toEqual([4.2, 52.1]);
  });

  it('keeps a target that reported after the targets linked to it', () => {
    const targets = new Map<string, SKSensorTarget>();
    target(targets, RADAR);
    target(targets, CAMERA, RADAR);
    targets.get(RADAR).positionUpdatedAt = 3000;
    targets.get(CAMERA).positionUpdatedAt = 2000;
    const shown = unlinkedTargets(targets, new Map());
    expect(shown.get(RADAR)).toBe(targets.get(RADAR));
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
    processSensorTarget(
      targets,
      RADAR,
      { path: 'name', value: 'echo' },
      COG_LINE
    );
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

describe('fusedVessels', () => {
  it('places a vessel at a linked target that reported after its AIS', () => {
    const v = vessel(VESSEL);
    v.positionUpdatedAt = 1000;
    const targets = new Map<string, SKSensorTarget>();
    target(targets, RADAR, VESSEL);
    targets.get(RADAR).positionUpdatedAt = 2000;
    const vessels = new Map([[VESSEL, v]]);
    const fused = fusedVessels(vessels, targets).get(VESSEL);
    expect(fused.position).toEqual(targets.get(RADAR).position);
    expect(fused).toBeInstanceOf(SKVessel);
    expect(v.position).toEqual([4.21, 52.11]);
  });

  it('keeps a vessel whose AIS reported after the linked target', () => {
    const v = vessel(VESSEL);
    v.positionUpdatedAt = 3000;
    const targets = new Map<string, SKSensorTarget>();
    target(targets, RADAR, VESSEL);
    targets.get(RADAR).positionUpdatedAt = 2000;
    const vessels = new Map([[VESSEL, v]]);
    expect(fusedVessels(vessels, targets)).toBe(vessels);
  });
});

describe('isSilent', () => {
  it('drops a target a minute after its last position', () => {
    const t = new SKSensorTarget();
    t.positionUpdatedAt = 1000;
    expect(isSilent(t, 1000 + 60_000)).toBe(false);
    expect(isSilent(t, 1001 + 60_000)).toBe(true);
  });

  it('times a target without a position from its last value', () => {
    const t = new SKSensorTarget();
    t.lastUpdated = new Date(5000);
    expect(isSilent(t, 5000 + 60_000)).toBe(false);
    expect(isSilent(t, 5001 + 60_000)).toBe(true);
  });
});
