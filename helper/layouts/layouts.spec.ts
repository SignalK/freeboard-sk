import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { LayoutStore } from './layouts.js';

const helm = { name: 'Helm', widgets: [{ instanceId: 'a' }], instances: {} };

describe('LayoutStore', () => {
  let dir: string;
  let store: LayoutStore;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'fsk-layouts-'));
    store = new LayoutStore(path.join(dir, 'layouts'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('lists nothing before the first save', async () => {
    expect(await store.list()).toEqual({});
  });

  it('stamps a revision that rises with every save', async () => {
    const first = await store.set('helm', helm);
    const second = await store.set('helm', { ...helm, name: 'Helm 2' });

    expect(first.revision).toBe(1);
    expect(second.revision).toBe(2);
    expect(await store.get('helm')).toMatchObject({
      name: 'Helm 2',
      revision: 2
    });
    expect(Object.keys(await store.list())).toEqual(['helm']);
  });

  it('refuses a save made from an out-of-date copy', async () => {
    await store.set('helm', helm);
    await store.set('helm', { ...helm, baseRevision: 1 });

    await expect(
      store.set('helm', { ...helm, baseRevision: 1 })
    ).rejects.toThrow(/revision 2/);
    expect((await store.get('helm')).revision).toBe(2);
  });

  it('refuses a save made from a copy of a layout deleted since', async () => {
    await expect(
      store.set('helm', { ...helm, baseRevision: 1 })
    ).rejects.toThrow(/no longer exists/);
    expect(await store.list()).toEqual({});
  });

  it('saves without a base revision whatever is stored', async () => {
    await store.set('helm', helm);
    await store.set('helm', { ...helm, baseRevision: 1 });

    expect((await store.set('helm', helm)).revision).toBe(3);
  });

  it('lets only one of two saves from the same copy through', async () => {
    await store.set('helm', helm);
    const results = await Promise.allSettled([
      store.set('helm', { ...helm, baseRevision: 1 }),
      store.set('helm', { ...helm, baseRevision: 1 })
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([
      'fulfilled',
      'rejected'
    ]);
  });

  it('keeps no base revision in what it stores', async () => {
    await store.set('helm', helm);
    await store.set('helm', { ...helm, baseRevision: 1 });

    expect(await store.get('helm')).not.toHaveProperty('baseRevision');
  });

  it('rejects a layout without a name or widgets list', async () => {
    await expect(store.set('x', { ...helm, name: ' ' })).rejects.toThrow();
    await expect(
      store.set('x', { name: 'X', widgets: 'none' })
    ).rejects.toThrow();
  });

  it('refuses an id that is not a plain file name', async () => {
    await expect(store.set('../escape', helm)).rejects.toThrow(
      /Invalid layout id/
    );
    await expect(store.get('../escape')).rejects.toThrow(/Invalid layout id/);
  });

  it('deletes a layout, and a missing one without error', async () => {
    await store.set('helm', helm);
    await store.delete('helm');
    await store.delete('helm');

    expect(await store.list()).toEqual({});
    await expect(store.get('helm')).rejects.toThrow(/not found/);
  });

  it('lists the readable layouts past an unreadable file', async () => {
    await store.set('helm', helm);
    await writeFile(path.join(dir, 'layouts', 'broken.json'), '{');

    expect(Object.keys(await store.list())).toEqual(['helm']);
    expect(await readdir(path.join(dir, 'layouts'))).toContain('broken.json');
  });
});
