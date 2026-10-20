import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InfoPanelFacade } from './info-panel.facade';
import { SKWorkerService } from '../skstream/skstream.service';
import { SKResourceService } from '../skresources/resources.service';
import { DeltaSignal, FBResource } from 'src/app/types';
import { SKNote } from '../skresources/resource-classes';

describe('InfoPanelFacade — resources delta', () => {
  let delta: ReturnType<typeof signal<DeltaSignal>>;
  let transform: ReturnType<typeof vi.fn>;
  let facade: InfoPanelFacade;

  beforeEach(() => {
    TestBed.resetTestingModule();
    delta = signal<DeltaSignal>({ path: '', value: null });
    transform = vi.fn((_type: string, r: object) => ({ ...r }));
    TestBed.configureTestingModule({
      providers: [
        { provide: SKWorkerService, useValue: { resourceUpdate: delta } },
        { provide: SKResourceService, useValue: { transform } }
      ]
    });
    facade = TestBed.inject(InfoPanelFacade);
    facade.openWith('notes', [
      'n1',
      Object.assign(new SKNote(), { name: 'Old' }),
      false
    ] as FBResource);
    TestBed.tick();
  });

  it('publishes a new item carrying the changed resource', () => {
    const before = facade.item();
    delta.set({ path: 'resources.notes.n1', value: { name: 'New' } });
    TestBed.tick();

    expect(facade.item()).not.toBe(before);
    expect(facade.item().resource).toEqual({ name: 'New' });
    expect(facade.item().id).toBe('n1');
  });

  it('applies each delta once', () => {
    delta.set({ path: 'resources.notes.n1', value: { name: 'New' } });
    TestBed.tick();
    TestBed.tick();

    expect(transform).toHaveBeenCalledTimes(1);
  });

  it('leaves the item alone for a delta to another resource', () => {
    const before = facade.item();
    delta.set({ path: 'resources.notes.n2', value: { name: 'Other' } });
    TestBed.tick();

    expect(facade.item()).toBe(before);
  });
});
