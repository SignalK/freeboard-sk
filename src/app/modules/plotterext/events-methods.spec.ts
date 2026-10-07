import { describe, it, expect, vi } from 'vitest';
import { RpcError } from 'signalk-plotterext-bus/host';
import { createEventsMethods, publishEvent } from './events-methods';

function setup(extension = 'ext-a') {
  const deps = { broadcast: vi.fn(), publishToExtension: vi.fn() };
  const methods = createEventsMethods(deps, extension);
  // The bus dispatches handlers as (params, ctx); ctx is unused here.
  const call = async (params?: unknown) =>
    methods['events.publish'](params, {} as never);
  return { deps, call };
}

describe('events.publish', () => {
  it('broadcasts to every extension by default', async () => {
    const { deps, call } = setup();
    expect(
      await call({ topic: 'ext-a.refresh', params: { radius: 20 } })
    ).toEqual({});
    expect(deps.broadcast).toHaveBeenCalledWith('ext-a.refresh', {
      radius: 20
    });
    expect(deps.publishToExtension).not.toHaveBeenCalled();
  });

  it('broadcasts for an explicit scope all', async () => {
    const { deps, call } = setup();
    await call({ topic: 'ext-a.refresh', scope: 'all' });
    expect(deps.broadcast).toHaveBeenCalledWith('ext-a.refresh', undefined);
  });

  it("scope extension stays within the publisher's own extension", async () => {
    const { deps, call } = setup('ext-a');
    await call({ topic: 'ext-a.refresh', params: 1, scope: 'extension' });
    expect(deps.publishToExtension).toHaveBeenCalledWith(
      'ext-a',
      'ext-a.refresh',
      1
    );
    expect(deps.broadcast).not.toHaveBeenCalled();
  });

  it('passes host event names through unpoliced', async () => {
    const { deps, call } = setup();
    const payload = { routeId: 'r1', saved: true, dirty: false };
    await call({ topic: 'route.saved', params: payload });
    expect(deps.broadcast).toHaveBeenCalledWith('route.saved', payload);
  });

  it.each([
    ['missing params', undefined],
    ['empty topic', { topic: '' }],
    ['wildcard topic', { topic: 'ext-a.*' }],
    ['bus namespace', { topic: 'bus.handshake' }],
    ['unknown scope', { topic: 't', scope: 'everyone' }]
  ])('rejects %s with events.badRequest', async (_label, params) => {
    const { deps, call } = setup();
    const err = await call(params).catch((e: RpcError) => e);
    expect(err).toBeInstanceOf(RpcError);
    expect((err as RpcError).reason).toBe('events.badRequest');
    expect(deps.broadcast).not.toHaveBeenCalled();
    expect(deps.publishToExtension).not.toHaveBeenCalled();
  });
});

describe('publishEvent', () => {
  it('routes on behalf of the given extension', () => {
    const deps = { broadcast: vi.fn(), publishToExtension: vi.fn() };
    publishEvent(deps, 'ext-b', { topic: 'x.y', scope: 'extension' });
    expect(deps.publishToExtension).toHaveBeenCalledWith(
      'ext-b',
      'x.y',
      undefined
    );
  });
});
