import { describe, it, expect, vi } from 'vitest';
import { RpcError } from 'signalk-plotterext-bus/host';
import { createResourceGroupMethods } from './resourcegroup-methods';

function setup(fetchGroup: (id: string) => Promise<unknown>) {
  const deps = {
    fetchGroup: vi.fn(fetchGroup),
    applyGroup: vi.fn(async () => ['routes', 'charts'] as never)
  };
  const methods = createResourceGroupMethods(deps);
  // The bus dispatches handlers as (params, ctx); ctx is unused here.
  const call = async (params?: unknown) =>
    methods['resourceGroup.apply'](params, {} as never);
  const reason = (p: Promise<unknown>) =>
    p.then(
      () => 'resolved',
      (e: RpcError) => e.reason
    );
  return { deps, call, reason };
}

describe('resourceGroup.apply', () => {
  it('fetches the group, applies it and returns { applied }', async () => {
    const group = { name: 'g', routes: ['r1'], charts: [] };
    const { deps, call } = setup(async () => group);
    expect(await call({ id: 'g1' })).toEqual({ applied: ['routes', 'charts'] });
    expect(deps.fetchGroup).toHaveBeenCalledWith('g1');
    expect(deps.applyGroup).toHaveBeenCalledWith('g1', group);
  });

  it('rejects a missing or non-string id with resourceGroups.badRequest', async () => {
    const { deps, call, reason } = setup(async () => ({}));
    expect(await reason(call({}))).toBe('resourceGroups.badRequest');
    expect(await reason(call({ id: 7 }))).toBe('resourceGroups.badRequest');
    expect(await reason(call(undefined))).toBe('resourceGroups.badRequest');
    expect(deps.fetchGroup).not.toHaveBeenCalled();
  });

  it('maps a 404 to resourceGroups.unknownId', async () => {
    const { call, reason } = setup(() => Promise.reject({ status: 404 }));
    expect(await reason(call({ id: 'nope' }))).toBe('resourceGroups.unknownId');
  });

  it('maps any other fetch failure to resourceGroups.fetchFailed', async () => {
    const { call, reason } = setup(() =>
      Promise.reject({ status: 500, message: 'boom' })
    );
    expect(await reason(call({ id: 'g1' }))).toBe('resourceGroups.fetchFailed');
  });

  it('rejects an array response as a malformed group', async () => {
    const { deps, call, reason } = setup(async () => []);
    expect(await reason(call({ id: 'g1' }))).toBe('resourceGroups.badRequest');
    expect(deps.applyGroup).not.toHaveBeenCalled();
  });

  it('rejects a malformed group with resourceGroups.badRequest and applies nothing', async () => {
    const { deps, call, reason } = setup(async () => ({
      name: 'g',
      routes: 'r1'
    }));
    expect(await reason(call({ id: 'g1' }))).toBe('resourceGroups.badRequest');
    expect(deps.applyGroup).not.toHaveBeenCalled();
  });
});
