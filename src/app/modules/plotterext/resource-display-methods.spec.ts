import { describe, it, expect, vi } from 'vitest';
import { RpcError } from 'signalk-plotterext-bus/host';
import { createResourceDisplayMethods } from './resource-display-methods';

function setup() {
  const deps = {
    setVisible: vi.fn(async () => undefined),
    showNotes: vi.fn()
  };
  const methods = createResourceDisplayMethods(deps);
  // The bus dispatches handlers as (params, ctx); ctx is unused here.
  const show = (params?: unknown) =>
    Promise.resolve(methods['resources.show'](params, {} as never));
  const hide = (params?: unknown) =>
    Promise.resolve(methods['resources.hide'](params, {} as never));
  const failure = (p: Promise<unknown>) =>
    p.then(
      () => null,
      (e: RpcError) => e
    );
  return { deps, show, hide, failure };
}

describe('resources.show / resources.hide', () => {
  it.each(['routes', 'waypoints', 'regions', 'charts'])(
    'passes %s through to the per-item display',
    async (type) => {
      const { deps, show, hide } = setup();
      expect(await show({ type, ids: ['a', 'b'] })).toEqual({});
      expect(deps.setVisible).toHaveBeenLastCalledWith(type, ['a', 'b'], true);
      expect(await hide({ type, ids: ['a'] })).toEqual({});
      expect(deps.setVisible).toHaveBeenLastCalledWith(type, ['a'], false);
    }
  );

  it('shows notes by turning the notes layer on', async () => {
    const { deps, show } = setup();
    expect(await show({ type: 'notes', ids: ['n1'] })).toEqual({});
    expect(deps.showNotes).toHaveBeenCalledOnce();
    expect(deps.setVisible).not.toHaveBeenCalled();
  });

  it('refuses to hide notes, which have no per-note display', async () => {
    const { deps, hide, failure } = setup();
    const err = await failure(hide({ type: 'notes', ids: ['n1'] }));
    expect(err?.reason).toBe('resources.typeNotSupported');
    expect(err?.data).toMatchObject({ type: 'notes' });
    expect(deps.showNotes).not.toHaveBeenCalled();
  });

  it('refuses a type Freeboard does not display', async () => {
    const { deps, show, failure } = setup();
    const err = await failure(show({ type: 'tracks', ids: ['t1'] }));
    expect(err?.reason).toBe('resources.typeNotSupported');
    expect(deps.setVisible).not.toHaveBeenCalled();
  });

  it('rejects malformed params with resources.badRequest', async () => {
    const { deps, show, failure } = setup();
    for (const params of [
      undefined,
      {},
      { type: 'waypoints' },
      { type: 'waypoints', ids: [] },
      { type: 'waypoints', ids: [7] },
      { type: 'waypoints', ids: [''] },
      { type: '', ids: ['a'] }
    ]) {
      expect((await failure(show(params)))?.reason).toBe(
        'resources.badRequest'
      );
    }
    expect(deps.setVisible).not.toHaveBeenCalled();
  });
});
