import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import '@vitest/web-worker';
import { SKWorkerService } from './skstream.service';
import { DeltaSignal } from 'src/app/types';

describe('SKWorkerService — resources deltas', () => {
  it('emits every resources delta, where the signal keeps the last', () => {
    const service = TestBed.inject(SKWorkerService);
    const seen: DeltaSignal[] = [];
    const sub = service.resourceDelta$().subscribe((d) => seen.push(d));
    const receive = (result: DeltaSignal) =>
      (
        service as unknown as { handleMessage(msg: unknown): void }
      ).handleMessage({ action: 'resource', result });

    receive({ path: 'resources.notes.n1', value: null });
    receive({ path: 'resources.notes.n2', value: { name: 'Other' } });
    sub.unsubscribe();
    service.terminate();

    expect(seen.map((d) => d.path)).toEqual([
      'resources.notes.n1',
      'resources.notes.n2'
    ]);
    expect(service.resourceUpdate().path).toBe('resources.notes.n2');
  });
});
