import { describe, it, expect } from 'vitest';
import {
  RouteBufferRegistry,
  RouteRegistryEvent
} from './route-buffer.registry';

describe('RouteBufferRegistry', () => {
  it('creates a buffer with rev 1 and returns it via get', () => {
    const reg = new RouteBufferRegistry();
    const { routeId, rev } = reg.create({
      name: 'Test',
      points: [{ position: [-80.1, 25.7] }]
    });
    expect(rev).toBe(1);
    const b = reg.get(routeId);
    expect(b?.name).toBe('Test');
    expect(b?.rev).toBe(1);
    expect(b?.saved).toBe(false);
    expect(b?.dirty).toBe(true);
    expect(b?.points).toHaveLength(1);
    expect(b?.points[0].position).toEqual([-80.1, 25.7]);
  });

  it('defaults name to null and points to empty', () => {
    const reg = new RouteBufferRegistry();
    const { routeId } = reg.create();
    const b = reg.get(routeId);
    expect(b?.name).toBeNull();
    expect(b?.points).toEqual([]);
  });

  it('lists all live buffers as summaries', () => {
    const reg = new RouteBufferRegistry();
    const a = reg.create({ name: 'A' });
    const b = reg.create({ name: 'B' });
    const ids = reg
      .list()
      .map((s) => s.routeId)
      .sort();
    expect(ids).toEqual([a.routeId, b.routeId].sort());
    const sumA = reg.list().find((s) => s.routeId === a.routeId);
    expect(sumA).toMatchObject({
      name: 'A',
      rev: 1,
      pointCount: 0,
      saved: false,
      dirty: true
    });
  });

  it('returns undefined for an unknown id and false when deleting it', () => {
    const reg = new RouteBufferRegistry();
    expect(reg.get('nope')).toBeUndefined();
    expect(reg.has('nope')).toBe(false);
    expect(reg.delete('nope')).toBe(false);
  });

  it('deletes a buffer, removing it from get and list', () => {
    const reg = new RouteBufferRegistry();
    const { routeId } = reg.create({ name: 'X' });
    expect(reg.delete(routeId)).toBe(true);
    expect(reg.get(routeId)).toBeUndefined();
    expect(reg.list()).toEqual([]);
  });

  it('assigns a unique id to each buffer', () => {
    const reg = new RouteBufferRegistry();
    const a = reg.create();
    const b = reg.create();
    expect(a.routeId).not.toBe(b.routeId);
  });

  it('emits visible then hidden with a monotonic rev and flags', () => {
    const reg = new RouteBufferRegistry();
    const seen: RouteRegistryEvent[] = [];
    reg.events$.subscribe((e) => seen.push(e));
    const { routeId } = reg.create({
      name: 'X',
      points: [{ position: [0, 0] }]
    });
    reg.delete(routeId);
    expect(seen).toHaveLength(2);
    expect(seen[0]).toMatchObject({
      type: 'visible',
      routeId,
      rev: 1,
      name: 'X',
      pointCount: 1,
      saved: false,
      dirty: true
    });
    // A draft hidden ⇒ deleted: saved:false.
    expect(seen[1]).toMatchObject({
      type: 'hidden',
      routeId,
      rev: 2,
      saved: false
    });
  });

  it('show() adds a saved+clean addressable route with an href, emitting visible', () => {
    const reg = new RouteBufferRegistry();
    const seen: RouteRegistryEvent[] = [];
    reg.events$.subscribe((e) => seen.push(e));
    const b = reg.show({
      routeId: 'res-1',
      name: 'Stored',
      points: [{ position: [0, 0] }, { position: [1, 1] }],
      href: 'res-1'
    });
    expect(b.saved).toBe(true);
    expect(b.dirty).toBe(false);
    expect(b.href).toBe('res-1');
    expect(reg.get('res-1')?.points).toHaveLength(2);
    expect(seen[0]).toMatchObject({
      type: 'visible',
      routeId: 'res-1',
      saved: true,
      dirty: false,
      pointCount: 2
    });
  });

  it('markSaved flips a draft to saved+clean, keeping it addressable', () => {
    const reg = new RouteBufferRegistry();
    const { routeId } = reg.create({
      name: 'P',
      points: [{ position: [0, 0] }]
    });
    const rev = reg.markSaved(routeId, 'routes/saved-1');
    expect(rev).toBe(2);
    const b = reg.get(routeId);
    expect(b?.saved).toBe(true);
    expect(b?.dirty).toBe(false);
    // Still in the visible set under the same id.
    expect(reg.list().map((s) => s.routeId)).toContain(routeId);
  });

  it('tracks a route-level description (create + markSaved updates it)', () => {
    const reg = new RouteBufferRegistry();
    const { routeId } = reg.create({
      name: 'D',
      description: 'around the shoal',
      points: [{ position: [0, 0] }]
    });
    expect(reg.get(routeId)?.description).toBe('around the shoal');
    reg.markSaved(routeId, 'routes/abc', 'D', 'updated note');
    expect(reg.get(routeId)?.description).toBe('updated note');
  });

  it('snapshots defensively — mutating a returned buffer does not affect the registry', () => {
    const reg = new RouteBufferRegistry();
    const { routeId } = reg.create({ points: [{ position: [1, 2] }] });
    const b = reg.get(routeId)!;
    b.points[0].position[0] = 999;
    b.points.push({ position: [3, 4] });
    const fresh = reg.get(routeId)!;
    expect(fresh.points).toHaveLength(1);
    expect(fresh.points[0].position[0]).toBe(1);
  });

  it('replace sets all points, bumps rev, and emits a dirty event', () => {
    const reg = new RouteBufferRegistry();
    const { routeId } = reg.create({ points: [{ position: [0, 0] }] });
    const events: RouteRegistryEvent[] = [];
    reg.events$.subscribe((e) => events.push(e));
    const updated = reg.replace(routeId, [
      { position: [1, 1] },
      { position: [2, 2] }
    ]);
    expect(updated?.rev).toBe(2);
    expect(updated?.points).toHaveLength(2);
    expect(reg.get(routeId)?.points[1].position).toEqual([2, 2]);
    expect(events).toEqual([
      { type: 'dirty', routeId, rev: 2, reason: 'replaced' }
    ]);
  });

  it('replace on an unknown id returns undefined', () => {
    const reg = new RouteBufferRegistry();
    expect(reg.replace('nope', [])).toBeUndefined();
  });

  it('exposes a reactive live() signal that tracks create/replace/delete', () => {
    const reg = new RouteBufferRegistry();
    expect(reg.live()).toEqual([]);
    const { routeId } = reg.create({ name: 'A', points: [{ position: [0, 0] }] });
    expect(reg.live()).toHaveLength(1);
    expect(reg.live()[0].routeId).toBe(routeId);
    reg.replace(routeId, [{ position: [1, 1] }, { position: [2, 2] }]);
    expect(reg.live()[0].points).toHaveLength(2);
    reg.delete(routeId);
    expect(reg.live()).toEqual([]);
  });
});
