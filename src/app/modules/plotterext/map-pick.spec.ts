import { describe, expect, it } from 'vitest';
import { RpcError } from 'signalk-plotterext-bus/host';

import { parsePickParams, pickedTarget } from './map-pick';
import type { SelectedTarget } from './actions';

const reasonOf = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(RpcError);
    return (err as RpcError).reason;
  }
  return undefined;
};

describe('parsePickParams', () => {
  it('picks a point when no targets are given', () => {
    expect(parsePickParams(undefined)).toEqual({
      rules: [{ kind: 'position' }]
    });
    expect(parsePickParams({ prompt: 'Tap the destination' })).toEqual({
      prompt: 'Tap the destination',
      rules: [{ kind: 'position' }]
    });
  });

  it('takes the targets grammar of actions, match and self included', () => {
    const match = [{ path: 'name', op: 'eq', value: 'Fuel dock' }];
    expect(
      parsePickParams({
        targets: [
          'waypoint',
          { kind: 'note', match },
          { kind: 'vessel', self: false }
        ]
      }).rules
    ).toEqual([
      { kind: 'waypoint' },
      { kind: 'note', match },
      { kind: 'vessel', self: false }
    ]);
  });

  it('drops the entries the host ignores and keeps the rest', () => {
    expect(
      parsePickParams({
        targets: [
          'sounding',
          { kind: 'position', match: [] },
          { kind: 'waypoint', overlays: ['buoys'] },
          'waypoint',
          { kind: 'overlayFeature', overlays: ['buoys'] }
        ]
      }).rules
    ).toEqual([
      { kind: 'waypoint' },
      { kind: 'overlayFeature', overlays: ['buoys'] }
    ]);
  });

  it('treats a blank prompt as none, so the host uses its own wording', () => {
    expect(parsePickParams({ prompt: '   ' })).toEqual({
      rules: [{ kind: 'position' }]
    });
  });

  it('refuses a malformed request with map.badRequest', () => {
    expect(reasonOf(() => parsePickParams('waypoint'))).toBe('map.badRequest');
    expect(reasonOf(() => parsePickParams({ prompt: 3 }))).toBe(
      'map.badRequest'
    );
    expect(reasonOf(() => parsePickParams({ targets: 'waypoint' }))).toBe(
      'map.badRequest'
    );
  });

  it('refuses targets with no kind the host supports', () => {
    expect(reasonOf(() => parsePickParams({ targets: [] }))).toBe(
      'map.badRequest'
    );
    expect(
      reasonOf(() => parsePickParams({ targets: ['sounding', 'x'] }))
    ).toBe('map.badRequest');
  });
});

describe('pickedTarget', () => {
  const at: SelectedTarget = {
    target: { kind: 'position', position: [-80.11, 25.76] }
  };
  const fuel: SelectedTarget = {
    target: {
      kind: 'waypoint',
      position: [-80.11, 25.76],
      id: 'w1',
      href: '/resources/waypoints/w1',
      name: 'Fuel dock'
    },
    match: { name: 'Fuel dock' }
  };
  const anchorage: SelectedTarget = {
    target: {
      kind: 'note',
      position: [-80.11, 25.76],
      id: 'n1',
      href: '/resources/notes/n1',
      name: 'Anchorage'
    },
    match: { name: 'Anchorage', properties: { skIcon: 'anchorage' } }
  };
  const ownBoat: SelectedTarget = {
    target: {
      kind: 'vessel',
      position: [-80.11, 25.76],
      context: 'vessels.urn:mrn:imo:mmsi:338123456',
      self: true
    }
  };

  it('yields the point for a position pick, whatever is under it', () => {
    expect(pickedTarget([{ kind: 'position' }], [fuel], at, 'ext')).toBe(
      at.target
    );
  });

  it('yields the first accepted feature in hit order', () => {
    expect(
      pickedTarget(
        [{ kind: 'waypoint' }, { kind: 'note' }],
        [anchorage, fuel],
        at,
        'ext'
      )
    ).toBe(anchorage.target);
  });

  it('skips features the pick does not accept', () => {
    expect(
      pickedTarget([{ kind: 'waypoint' }], [anchorage, fuel], at, 'ext')
    ).toBe(fuel.target);
  });

  it('applies match against the stored resource', () => {
    const rules = [
      {
        kind: 'note' as const,
        match: [{ path: 'properties.skIcon', op: 'eq' as const, value: 'reef' }]
      }
    ];
    expect(pickedTarget(rules, [anchorage], at, 'ext')).toBeNull();
    rules[0].match[0].value = 'anchorage';
    expect(pickedTarget(rules, [anchorage], at, 'ext')).toBe(anchorage.target);
  });

  it('applies self to vessels', () => {
    expect(
      pickedTarget([{ kind: 'vessel', self: false }], [ownBoat], at, 'ext')
    ).toBe(null);
    expect(
      pickedTarget([{ kind: 'vessel', self: true }], [ownBoat], at, 'ext')
    ).toBe(ownBoat.target);
  });

  it('ignores a select on nothing it accepts, so the pick stays on', () => {
    expect(pickedTarget([{ kind: 'waypoint' }], [], at, 'ext')).toBeNull();
    expect(
      pickedTarget([{ kind: 'waypoint' }], [anchorage], at, 'ext')
    ).toBeNull();
  });

  describe('an overlay feature', () => {
    const buoy = (owner: string, overlayId = 'buoys'): SelectedTarget => {
      const properties = { name: 'Station 17' };
      return {
        target: {
          kind: 'overlayFeature',
          position: [-80.11, 25.76],
          overlayId,
          source: 'stations',
          featureId: 'b17',
          properties
        },
        match: { id: 'b17', properties },
        owner
      };
    };

    it('is pickable by the extension that owns its overlay', () => {
      const own = buoy('ext');
      expect(pickedTarget([{ kind: 'overlayFeature' }], [own], at, 'ext')).toBe(
        own.target
      );
    });

    it('is never pickable by another extension', () => {
      expect(
        pickedTarget([{ kind: 'overlayFeature' }], [buoy('other')], at, 'ext')
      ).toBeNull();
      expect(
        pickedTarget(
          [{ kind: 'overlayFeature' }, { kind: 'position' }],
          [buoy('other')],
          at,
          'ext'
        )
      ).toBe(at.target);
    });

    it('narrows to the listed overlays', () => {
      const rules = [{ kind: 'overlayFeature' as const, overlays: ['tides'] }];
      expect(pickedTarget(rules, [buoy('ext')], at, 'ext')).toBeNull();
      expect(pickedTarget(rules, [buoy('ext', 'tides')], at, 'ext')).not.toBe(
        null
      );
    });

    it('takes the topmost of several features it accepts', () => {
      const top = buoy('ext');
      const below = buoy('ext', 'tides');
      expect(
        pickedTarget(
          [{ kind: 'overlayFeature' }, { kind: 'waypoint' }],
          [top, fuel, below],
          at,
          'ext'
        )
      ).toBe(top.target);
    });
  });

  it('falls back to the point when position is among the targets', () => {
    expect(
      pickedTarget(
        [{ kind: 'waypoint' }, { kind: 'position' }],
        [anchorage],
        at,
        'ext'
      )
    ).toBe(at.target);
    expect(
      pickedTarget(
        [{ kind: 'position' }, { kind: 'waypoint' }],
        [fuel],
        at,
        'ext'
      )
    ).toBe(fuel.target);
  });
});
