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
          'overlayFeature',
          { kind: 'overlayFeature', overlays: ['buoys'] },
          'sounding',
          { kind: 'position', match: [] },
          'waypoint'
        ]
      }).rules
    ).toEqual([{ kind: 'waypoint' }]);
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
      reasonOf(() => parsePickParams({ targets: ['overlayFeature', 'x'] }))
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
    expect(pickedTarget([{ kind: 'position' }], [fuel], at)).toBe(at.target);
  });

  it('yields the first accepted feature in hit order', () => {
    expect(
      pickedTarget(
        [{ kind: 'waypoint' }, { kind: 'note' }],
        [anchorage, fuel],
        at
      )
    ).toBe(anchorage.target);
  });

  it('skips features the pick does not accept', () => {
    expect(pickedTarget([{ kind: 'waypoint' }], [anchorage, fuel], at)).toBe(
      fuel.target
    );
  });

  it('applies match against the stored resource', () => {
    const rules = [
      {
        kind: 'note' as const,
        match: [{ path: 'properties.skIcon', op: 'eq' as const, value: 'reef' }]
      }
    ];
    expect(pickedTarget(rules, [anchorage], at)).toBeNull();
    rules[0].match[0].value = 'anchorage';
    expect(pickedTarget(rules, [anchorage], at)).toBe(anchorage.target);
  });

  it('applies self to vessels', () => {
    expect(pickedTarget([{ kind: 'vessel', self: false }], [ownBoat], at)).toBe(
      null
    );
    expect(pickedTarget([{ kind: 'vessel', self: true }], [ownBoat], at)).toBe(
      ownBoat.target
    );
  });

  it('ignores a select on nothing it accepts, so the pick stays on', () => {
    expect(pickedTarget([{ kind: 'waypoint' }], [], at)).toBeNull();
    expect(pickedTarget([{ kind: 'waypoint' }], [anchorage], at)).toBeNull();
  });

  it('falls back to the point when position is among the targets', () => {
    expect(
      pickedTarget(
        [{ kind: 'waypoint' }, { kind: 'position' }],
        [anchorage],
        at
      )
    ).toBe(at.target);
    expect(
      pickedTarget([{ kind: 'position' }, { kind: 'waypoint' }], [fuel], at)
    ).toBe(fuel.target);
  });
});
