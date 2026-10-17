import { describe, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { SKResourceService } from './resources.service';
import { SKTrack } from './resource-classes';
import { FBTrack } from 'src/app/types';

/**
 * Moving /resources/tracks into the Track API touches only the server calls
 * and the track selections, so it runs on a bare prototype instance with
 * those stubbed -- no Angular DI needed.
 */
function svcWith(opts: {
  old: string[];
  selected?: string[];
  post?: (body: unknown) => unknown;
  deleteOld?: (id: string) => Promise<void>;
}) {
  const svc = Object.create(SKResourceService.prototype) as SKResourceService;
  const selections = { tracks: opts.selected ?? null };
  (svc as unknown as { app: unknown }).app = {
    config: { selections },
    saveConfig: vi.fn()
  };
  const version = signal(0);
  Object.assign(svc, {
    trackStoreVersionSignal: version,
    trackStoreVersion: version.asReadonly()
  });
  let n = 0;
  const posted: unknown[] = [];
  const deletedNew: string[] = [];
  (svc as unknown as { signalk: unknown }).signalk = {
    api: {
      post: (_v: number, _path: string, body: unknown) => {
        posted.push(body);
        if (opts.post) {
          return opts.post(body);
        }
        n++;
        return of({ id: `tracks:imported:n${n}` });
      },
      delete: (_v: number, path: string) => {
        deletedNew.push(path);
        return of({});
      }
    }
  };
  const list: FBTrack[] = opts.old.map((id) => [
    id,
    new SKTrack({
      feature: {
        type: 'Feature',
        geometry: { type: 'MultiLineString', coordinates: [[[1, 2]]] },
        properties: { name: `Track ${id}` }
      }
    }),
    true
  ]);
  svc.listFromServer = vi.fn(() =>
    Promise.resolve(list)
  ) as unknown as SKResourceService['listFromServer'];
  const deleteFromServer = vi.fn(
    (_c: string, id: string) => opts.deleteOld?.(id) ?? Promise.resolve()
  );
  svc.deleteFromServer = deleteFromServer;
  return { svc, selections, posted, deletedNew, deleteFromServer };
}

describe('migrateResourceTracks', () => {
  it('stores each resource track and deletes the old copy', async () => {
    const { svc, posted, deleteFromServer } = svcWith({ old: ['a', 'b'] });

    expect(await svc.migrateResourceTracks()).toBe(2);
    expect(posted).toHaveLength(2);
    expect(posted[0]).toMatchObject({ properties: { name: 'Track a' } });
    expect(deleteFromServer.mock.calls.map((c) => c[1])).toEqual(['a', 'b']);
    expect(svc.trackStoreVersion()).toBe(1);
  });

  it('carries a shown track over to its new id', async () => {
    const { svc, selections } = svcWith({ old: ['a', 'b'], selected: ['b'] });

    await svc.migrateResourceTracks();

    expect(selections.tracks).toEqual(['tracks:imported:n2']);
  });

  it('removes the new copy when the old one cannot be deleted', async () => {
    const { svc, deletedNew } = svcWith({
      old: ['a'],
      deleteOld: () => Promise.reject(new Error('403'))
    });

    expect(await svc.migrateResourceTracks()).toBe(0);
    expect(deletedNew).toEqual(['/tracks/tracks%3Aimported%3An1']);
  });

  it('skips a track the Track API refuses as invalid', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    let calls = 0;
    const { svc, deleteFromServer } = svcWith({
      old: ['a', 'b'],
      post: () =>
        ++calls === 1
          ? throwError(() => new HttpErrorResponse({ status: 400 }))
          : of({ id: 'tracks:imported:n1' })
    });

    expect(await svc.migrateResourceTracks()).toBe(1);
    expect(deleteFromServer.mock.calls.map((c) => c[1])).toEqual(['b']);
  });

  it('stops at the first track the Track API refuses', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { svc, posted, deleteFromServer } = svcWith({
      old: ['a', 'b'],
      post: () => throwError(() => new Error('403'))
    });

    expect(await svc.migrateResourceTracks()).toBe(0);
    expect(posted).toHaveLength(1);
    expect(deleteFromServer).not.toHaveBeenCalled();
  });
});
