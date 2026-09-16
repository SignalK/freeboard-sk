import { describe, it, expect } from 'vitest';
import { of } from 'rxjs';
import { SKResourceService } from './resources.service';
import { SKVesselResponse } from 'src/app/types';

/**
 * `vesselFromServer` / `listVessels` map the full-model vessel returned by the
 * REST API (`/vessels/<id>`, leaf values wrapped as `{ value, timestamp,
 * $source }`) onto `SKVessel`. These pin that mapping: which branches are read,
 * how they land on the instance, and how the AIS selection marks each entry.
 *
 * Only `signalk.api.get` and `app.config.selections` are touched, so exercise
 * the service on a bare prototype (same approach as resources-route-hide.spec).
 */
const VESSEL: SKVesselResponse = {
  mmsi: '366123456',
  name: 'Sea Breeze',
  flag: { value: 'US' },
  port: { value: 'Miami' },
  registrations: { imo: 'IMO 9074729' },
  communication: { callsignVhf: 'WDX1234' },
  design: {
    aisShipType: { value: { id: 36, name: 'Sailing' } },
    length: { value: { overall: 12.2 } },
    beam: { value: 4.1 },
    draft: { value: { current: 1.8, maximum: 2.1 } },
    airHeight: { value: 18 }
  },
  navigation: {
    position: { value: { latitude: 25.7, longitude: -80.2 } },
    state: { value: 'motoring' },
    destination: {
      commonName: { value: 'Key West' },
      eta: { value: '2026-09-16T18:00:00.000Z' }
    }
  }
};

function svc(
  vessels: Record<string, SKVesselResponse>,
  aisSelection: string[] | null
): SKResourceService {
  const s = Object.create(SKResourceService.prototype) as SKResourceService;
  Object.assign(s as unknown as Record<string, unknown>, {
    app: { config: { selections: { aisTargets: aisSelection } } },
    signalk: {
      api: {
        get: (path: string) => {
          const id = path.split('/').pop();
          return of(path === '/vessels' ? vessels : vessels[id]);
        }
      }
    }
  });
  return s;
}

describe('SKResourceService.vesselFromServer', () => {
  it('maps the full-model vessel onto an SKVessel', async () => {
    const v = await svc(
      { 'urn:mrn:imo:mmsi:366123456': VESSEL },
      null
    ).vesselFromServer('urn:mrn:imo:mmsi:366123456');

    expect(v.id).toBe('urn:mrn:imo:mmsi:366123456');
    expect(v.mmsi).toBe('366123456');
    expect(v.name).toBe('Sea Breeze');
    expect(v.position).toEqual([-80.2, 25.7]);
    expect(v.flag).toBe('US');
    expect(v.port).toBe('Miami');
    expect(v.type).toEqual({ id: 36, name: 'Sailing' });
    expect(v.design).toEqual({
      length: { overall: 12.2 },
      beam: 4.1,
      draft: { current: 1.8, maximum: 2.1 },
      airHeight: 18
    });
    expect(v.callsignVhf).toBe('WDX1234');
    expect(v.callsignHf).toBe(null);
    expect(v.destination.name).toBe('Key West');
    expect(v.destination.eta).toBe('Wed, 16 Sep 2026 18:00:00 GMT');
    expect(v.state).toBe('motoring');
    expect(v.registrations).toEqual({ imo: 'IMO 9074729' });
  });

  it('falls back to defaults when branches are absent', async () => {
    const v = await svc({ 'urn:x': { name: 'Bare' } }, null).vesselFromServer(
      'urn:x'
    );

    expect(v.mmsi).toBe('');
    expect(v.position).toEqual([0, 0]);
    expect(v.flag).toBeUndefined();
    expect(v.type).toBe(null);
    expect(v.destination).toEqual({ name: null, eta: null });
    expect(v.state).toBe('');
    expect(v.registrations).toEqual({});
  });
});

describe('SKResourceService.listVessels', () => {
  const vessels = { 'urn:a': { name: 'A' }, 'urn:b': { name: 'B' } };

  it('returns [id, vessel, selected] entries, all selected when unfiltered', async () => {
    const list = await svc(vessels, null).listVessels();
    expect(list.map(([id, v, sel]) => [id, v.name, sel])).toEqual([
      ['urn:a', 'A', true],
      ['urn:b', 'B', true]
    ]);
  });

  it('marks only the vessels in the AIS selection', async () => {
    const list = await svc(vessels, ['urn:b']).listVessels();
    expect(list.map(([id, , sel]) => [id, sel])).toEqual([
      ['urn:a', false],
      ['urn:b', true]
    ]);
  });
});
