import { describe, it, expect, vi } from 'vitest';
import { RpcError } from 'signalk-plotterext-bus/host';
import { createNightModeMethods } from './nightmode-methods';

function setup(state = { enabled: false, auto: false }) {
  const deps = {
    getState: vi.fn(() => state),
    setState: vi.fn()
  };
  const methods = createNightModeMethods(deps);
  // The bus dispatches handlers as (params, ctx); ctx is unused here.
  const call = async (name: string, params?: unknown) =>
    methods[name](params, {} as never);
  return { deps, call };
}

describe('nightMode.get', () => {
  it('returns the current { enabled, auto } state', async () => {
    const { call } = setup({ enabled: true, auto: true });
    expect(await call('nightMode.get')).toEqual({ enabled: true, auto: true });
  });
});

describe('nightMode.set', () => {
  it('forwards a force-on request', async () => {
    const { deps, call } = setup();
    expect(await call('nightMode.set', { enabled: true })).toEqual({});
    expect(deps.setState).toHaveBeenCalledWith({ enabled: true });
  });

  it('forwards a force-off request', async () => {
    const { deps, call } = setup();
    await call('nightMode.set', { enabled: false });
    expect(deps.setState).toHaveBeenCalledWith({ enabled: false });
  });

  it('forwards a follow-server request', async () => {
    const { deps, call } = setup();
    await call('nightMode.set', { auto: true });
    expect(deps.setState).toHaveBeenCalledWith({ auto: true });
  });

  it('forwards both fields when supplied together', async () => {
    const { deps, call } = setup();
    await call('nightMode.set', { enabled: true, auto: false });
    expect(deps.setState).toHaveBeenCalledWith({ enabled: true, auto: false });
  });

  it('rejects an empty set with nightMode.badRequest', async () => {
    const { deps, call } = setup();
    await expect(call('nightMode.set', {})).rejects.toMatchObject({
      reason: 'nightMode.badRequest'
    });
    expect(deps.setState).not.toHaveBeenCalled();
  });

  it('rejects a non-boolean enabled', async () => {
    const { call } = setup();
    const err = await call('nightMode.set', { enabled: 'yes' }).catch(
      (e: RpcError) => e
    );
    expect(err).toBeInstanceOf(RpcError);
    expect((err as RpcError).reason).toBe('nightMode.badRequest');
  });

  it('rejects a non-boolean auto', async () => {
    const { call } = setup();
    await expect(call('nightMode.set', { auto: 1 })).rejects.toMatchObject({
      reason: 'nightMode.badRequest'
    });
  });
});
