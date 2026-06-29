import { describe, it, expect } from 'vitest';
import { createRouteMethods } from './route-methods';
import { RouteBufferRegistry } from './route-buffer.registry';

function setup() {
  const registry = new RouteBufferRegistry();
  const methods = createRouteMethods(registry);
  // The bus dispatches handlers as (params, ctx); ctx is unused here.
  const call = async (name: string, params?: unknown) =>
    methods[name](params, {} as never);
  return { registry, methods, call };
}

describe('route methods (host handlers)', () => {
  it('route.create creates a buffer and returns routeId + rev', async () => {
    const { call, registry } = setup();
    const res = (await call('route.create', {
      name: 'A',
      points: [{ position: [1, 2] }, { position: [3, 4] }]
    })) as { routeId: string; rev: number };
    expect(res.rev).toBe(1);
    expect(typeof res.routeId).toBe('string');
    expect(registry.get(res.routeId)?.name).toBe('A');
    expect(registry.get(res.routeId)?.points).toHaveLength(2);
  });

  it('route.get returns the buffer snapshot', async () => {
    const { call } = setup();
    const { routeId } = (await call('route.create', {
      name: 'A',
      points: [{ position: [0, 0] }, { position: [1, 1] }]
    })) as {
      routeId: string;
    };
    const b = await call('route.get', { routeId });
    expect(b).toMatchObject({
      routeId,
      name: 'A',
      rev: 1,
      saved: false,
      dirty: true,
      points: [{ position: [0, 0] }, { position: [1, 1] }]
    });
  });

  it('route.list returns { routes }', async () => {
    const { call } = setup();
    await call('route.create', {
      name: 'A',
      points: [{ position: [0, 0] }, { position: [1, 1] }]
    });
    await call('route.create', {
      name: 'B',
      points: [{ position: [0, 0] }, { position: [1, 1] }]
    });
    const res = (await call('route.list')) as { routes: unknown[] };
    expect(res.routes).toHaveLength(2);
  });

  it('route.hide removes the buffer and returns {}', async () => {
    const { call, registry } = setup();
    const { routeId } = (await call('route.create', {
      points: [{ position: [0, 0] }, { position: [1, 1] }]
    })) as { routeId: string };
    const res = await call('route.hide', { routeId });
    expect(res).toEqual({});
    expect(registry.has(routeId)).toBe(false);
  });

  it('route.get on an unknown id rejects with routes.unknownId', async () => {
    const { call } = setup();
    await expect(call('route.get', { routeId: 'nope' })).rejects.toHaveProperty(
      'reason',
      'routes.unknownId'
    );
  });

  it('route.hide on an unknown id rejects with routes.unknownId', async () => {
    const { call } = setup();
    await expect(
      call('route.hide', { routeId: 'nope' })
    ).rejects.toHaveProperty('reason', 'routes.unknownId');
  });

  it('route.show without an onShow handler rejects routes.notSupported', async () => {
    const { call } = setup();
    await expect(
      call('route.show', { ref: 'routes/abc' })
    ).rejects.toHaveProperty('reason', 'routes.notSupported');
  });

  it('route.show without a ref rejects routes.badRef', async () => {
    const methods = createRouteMethods(new RouteBufferRegistry(), {
      onShow: async () => ({ routeId: 'r', rev: 1 })
    });
    await expect(
      (async () => methods['route.show']({}, {} as never))()
    ).rejects.toHaveProperty('reason', 'routes.badRef');
  });

  it('route.show delegates to onShow and returns its result', async () => {
    const seen: string[] = [];
    const methods = createRouteMethods(new RouteBufferRegistry(), {
      onShow: async (ref) => {
        seen.push(ref);
        return { routeId: 'route-shown', rev: 3 };
      }
    });
    const res = await methods['route.show']({ ref: 'routes/abc' }, {} as never);
    expect(res).toEqual({ routeId: 'route-shown', rev: 3 });
    expect(seen).toEqual(['routes/abc']);
  });

  it('route.get without a routeId rejects', async () => {
    const { call } = setup();
    await expect(call('route.get', {})).rejects.toBeInstanceOf(Error);
  });

  it('route.replace sets points and returns the new rev', async () => {
    const { call, registry } = setup();
    const { routeId } = (await call('route.create', {
      points: [{ position: [0, 0] }, { position: [1, 1] }]
    })) as { routeId: string };
    const res = (await call('route.replace', {
      routeId,
      points: [{ position: [1, 1] }, { position: [2, 2] }]
    })) as { rev: number };
    expect(res.rev).toBe(2);
    expect(registry.get(routeId)?.points).toHaveLength(2);
  });

  it('route.replace on an unknown id rejects with routes.unknownId', async () => {
    const { call } = setup();
    await expect(
      call('route.replace', {
        routeId: 'nope',
        points: [{ position: [0, 0] }, { position: [1, 1] }]
      })
    ).rejects.toHaveProperty('reason', 'routes.unknownId');
  });

  it('route.replace with fewer than two points rejects routes.badRequest', async () => {
    const { call, registry } = setup();
    const { routeId } = registry.create({
      points: [{ position: [0, 0] }, { position: [1, 1] }]
    });
    await expect(
      call('route.replace', { routeId, points: [{ position: [9, 9] }] })
    ).rejects.toHaveProperty('reason', 'routes.badRequest');
  });
  it('route.save delegates to onSave and returns its result', async () => {
    const registry = new RouteBufferRegistry();
    const seen: string[] = [];
    const methods = createRouteMethods(registry, {
      onSave: async (routeId) => {
        seen.push(routeId);
        return { href: 'routes/abc', rev: 5 };
      }
    });
    const { routeId } = registry.create({ name: 'A' });
    const res = await methods['route.save']({ routeId }, {} as never);
    expect(res).toEqual({ href: 'routes/abc', rev: 5 });
    expect(seen).toEqual([routeId]);
  });

  it('route.save without an onSave handler rejects routes.notSupported', async () => {
    const registry = new RouteBufferRegistry();
    const methods = createRouteMethods(registry);
    const { routeId } = registry.create();
    await expect(
      (async () => methods['route.save']({ routeId }, {} as never))()
    ).rejects.toHaveProperty('reason', 'routes.notSupported');
  });

  it('route.save on an unknown id rejects routes.unknownId', async () => {
    const registry = new RouteBufferRegistry();
    const methods = createRouteMethods(registry, {
      onSave: async () => ({ href: 'x', rev: 1 })
    });
    await expect(
      (async () => methods['route.save']({ routeId: 'nope' }, {} as never))()
    ).rejects.toHaveProperty('reason', 'routes.unknownId');
  });

  it('route.create with fewer than two points rejects routes.badRequest', async () => {
    const { call } = setup();
    await expect(
      call('route.create', { points: [{ position: [0, 0] }] })
    ).rejects.toHaveProperty('reason', 'routes.badRequest');
    await expect(call('route.create', {})).rejects.toHaveProperty(
      'reason',
      'routes.badRequest'
    );
  });

  it('route.create rejects points without a numeric [lon, lat] position', async () => {
    const { call } = setup();
    await expect(
      call('route.create', { points: [{}, {}] })
    ).rejects.toHaveProperty('reason', 'routes.badRequest');
    await expect(
      call('route.create', {
        points: [{ position: [0, 0] }, { position: ['x', 1] }]
      })
    ).rejects.toHaveProperty('reason', 'routes.badRequest');
  });

  it('route.hide delegates to onHide when provided', async () => {
    const registry = new RouteBufferRegistry();
    const seen: string[] = [];
    const methods = createRouteMethods(registry, {
      onHide: (routeId) => {
        seen.push(routeId);
      }
    });
    const { routeId } = registry.create({
      points: [{ position: [0, 0] }, { position: [1, 1] }]
    });
    await methods['route.hide']({ routeId }, {} as never);
    expect(seen).toEqual([routeId]);
  });

  it('route.delete delegates to onDelete; falls back to discarding the buffer', async () => {
    const registry = new RouteBufferRegistry();
    const seen: string[] = [];
    const withHandler = createRouteMethods(registry, {
      onDelete: (routeId) => {
        seen.push(routeId);
      }
    });
    const a = registry.create({
      points: [{ position: [0, 0] }, { position: [1, 1] }]
    });
    await withHandler['route.delete']({ routeId: a.routeId }, {} as never);
    expect(seen).toEqual([a.routeId]);

    // No handler — discards the buffer (draft semantics).
    const noHandler = createRouteMethods(registry);
    const b = registry.create({
      points: [{ position: [0, 0] }, { position: [1, 1] }]
    });
    await noHandler['route.delete']({ routeId: b.routeId }, {} as never);
    expect(registry.has(b.routeId)).toBe(false);
  });
});
