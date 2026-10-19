import { describe, expect, it } from 'vitest';

import {
  actionApplies,
  invocationParams,
  parseTargetEntry,
  usableActions,
  type MapTarget,
  type SelectedTarget
} from './actions';

const publish = { type: 'publish', topic: 'x.go' };

const action = (targets: unknown[], extra: Record<string, unknown> = {}) => ({
  id: 'go',
  title: 'Go',
  targets,
  action: publish,
  ...extra
});

const at: [number, number] = [-80.1, 25.7];

const usable = (actions: unknown, apiVersion = '1') =>
  usableActions('ext', 'Ext', actions, apiVersion, (p) => p === 'viewer');

describe('parseTargetEntry', () => {
  it('takes the kinds this host offers, as strings or objects', () => {
    expect(parseTargetEntry('waypoint')).toEqual({ kind: 'waypoint' });
    expect(parseTargetEntry({ kind: 'chartFeature' })).toEqual({
      kind: 'chartFeature'
    });
  });

  it('ignores kinds it does not offer, overlay features included', () => {
    expect(parseTargetEntry('rainbow')).toBeNull();
    expect(parseTargetEntry('overlayFeature')).toBeNull();
    expect(parseTargetEntry({ kind: 'overlayFeature' })).toBeNull();
    expect(parseTargetEntry(42)).toBeNull();
  });

  it('keeps match and self only on the kinds that take them', () => {
    const match = [{ path: 'name', op: 'eq', value: 'A' }];
    expect(parseTargetEntry({ kind: 'note', match })).toEqual({
      kind: 'note',
      match
    });
    expect(parseTargetEntry({ kind: 'vessel', self: false })).toEqual({
      kind: 'vessel',
      self: false
    });
    // a kind narrowed with a field it does not take is ignored
    expect(parseTargetEntry({ kind: 'position', match })).toBeNull();
    expect(parseTargetEntry({ kind: 'vessel', match })).toBeNull();
    expect(parseTargetEntry({ kind: 'note', self: true })).toBeNull();
    expect(parseTargetEntry({ kind: 'note', overlays: ['a'] })).toBeNull();
  });

  it('ignores an entry with a malformed narrowing', () => {
    expect(parseTargetEntry({ kind: 'note', match: [{}] })).toBeNull();
    expect(parseTargetEntry({ kind: 'note', match: 'x' })).toBeNull();
    expect(parseTargetEntry({ kind: 'vessel', self: 'yes' })).toBeNull();
  });
});

describe('usableActions', () => {
  it('keeps complete actions with a usable target, in manifest order', () => {
    const list = usable(
      [
        action(['position'], { id: 'a' }),
        action(['overlayFeature'], { id: 'b' }),
        action(['rainbow', 'route'], { id: 'c' })
      ],
      '1'
    );
    expect(list.map((a) => a.action.id)).toEqual(['a', 'c']);
    expect(list[1].rules).toEqual([{ kind: 'route' }]);
    expect(list[0]).toMatchObject({ extension: 'ext', extensionName: 'Ext' });
  });

  it('leaves out an action that lacks a required field', () => {
    const list = usable(
      [
        action(['position'], { id: '' }),
        action(['position'], { title: ' ' }),
        action(['position'], { action: undefined }),
        action(['position'], { action: { type: 'dance' } }),
        { id: 'x', title: 'X', action: publish },
        action(['position'], { apiVersion: '2' })
      ],
      '1'
    );
    expect(list).toEqual([]);
  });

  it('leaves out an action that cannot do anything when chosen', () => {
    const list = usable([
      action(['position'], { id: 'a', action: { type: 'publish' } }),
      action(['position'], { id: 'b', action: { type: 'openPanel' } }),
      action(['position'], {
        id: 'c',
        action: { type: 'openWindow', panel: 'gone' }
      }),
      action(['position'], {
        id: 'd',
        action: { type: 'toggleWindow', panel: 'viewer' }
      }),
      action(['position'], {
        id: 'e',
        action: { type: 'sendMessage', topic: 'x.go' }
      })
    ]);
    expect(list.map((a) => a.action.id)).toEqual(['d', 'e']);
  });

  it('keeps the first of two actions with one id', () => {
    const list = usable(
      [action(['position'], { title: 'One' }), action(['note'])],
      '1'
    );
    expect(list.map((a) => a.action.title)).toEqual(['One']);
  });

  it('takes no actions from a manifest without a list of them', () => {
    expect(usable(undefined, '1')).toEqual([]);
    expect(usable({ id: 'x' }, '1')).toEqual([]);
  });
});

describe('actionApplies', () => {
  const one = (targets: unknown[]) => usable([action(targets)], '1')[0];

  const note = (skIcon: string): SelectedTarget => ({
    target: {
      kind: 'note',
      position: at,
      id: 'n1',
      href: '/resources/notes/n1'
    },
    match: { name: 'Bay', properties: { skIcon } }
  });

  it('applies by kind', () => {
    const a = one(['position', 'waypoint']);
    expect(
      actionApplies(a, { target: { kind: 'position', position: at } })
    ).toBe(true);
    expect(actionApplies(a, note('x'))).toBe(false);
  });

  it('narrows a stored resource with match', () => {
    const a = one([
      {
        kind: 'note',
        match: [{ path: 'properties.skIcon', op: 'eq', value: 'anchorage' }]
      }
    ]);
    expect(actionApplies(a, note('anchorage'))).toBe(true);
    // symbol references compare namespace-tolerant, as in resources.setFilter
    expect(actionApplies(a, note('default:anchorage'))).toBe(true);
    expect(actionApplies(a, note('marina'))).toBe(false);
  });

  it('narrows a vessel with self', () => {
    const a = one([{ kind: 'vessel', self: false }]);
    const vessel = (self: boolean): SelectedTarget => ({
      target: { kind: 'vessel', position: at, context: 'vessels.x', self }
    });
    expect(actionApplies(a, vessel(false))).toBe(true);
    expect(actionApplies(a, vessel(true))).toBe(false);
    expect(actionApplies(one(['vessel']), vessel(true))).toBe(true);
  });

  it('matches a chart feature on its class and attributes', () => {
    const a = one([
      {
        kind: 'chartFeature',
        match: [{ path: 'class', op: 'in', value: ['LNDMRK', 'LIGHTS'] }]
      }
    ]);
    const feature = (cls: string): SelectedTarget => {
      const target: MapTarget = {
        kind: 'chartFeature',
        position: at,
        class: cls,
        properties: {}
      };
      return { target, match: target };
    };
    expect(actionApplies(a, feature('LNDMRK'))).toBe(true);
    expect(actionApplies(a, feature('BOYLAT'))).toBe(false);
  });
});

describe('invocationParams', () => {
  const inv = {
    actionId: 'go',
    target: { kind: 'position' as const, position: at }
  };

  it('adds the invocation to the action params', () => {
    expect(invocationParams({ speed: 6 }, inv)).toEqual({
      speed: 6,
      actionId: 'go',
      target: inv.target
    });
  });

  it('makes params of its own when the action has none to add to', () => {
    expect(invocationParams(undefined, inv)).toEqual({
      actionId: 'go',
      target: inv.target
    });
    expect(invocationParams([1, 2], inv)).toEqual({
      actionId: 'go',
      target: inv.target
    });
  });
});
