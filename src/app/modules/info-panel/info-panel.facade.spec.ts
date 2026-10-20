import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
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

    const item = facade.item();
    expect(item).not.toBe(before);
    expect(item).toBeDefined();
    expect(item!.resource).toEqual({ name: 'New' });
    expect(item!.id).toBe('n1');
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

describe('InfoPanelFacade.open — a delta while fetching', () => {
  let delta: ReturnType<typeof signal<DeltaSignal>>;
  let deltas: Subject<DeltaSignal>;
  // the worker sets the signal and emits on the stream for each delta
  const send = (update: DeltaSignal) => {
    delta.set(update);
    deltas.next(update);
  };
  let fetched: (r: object) => void;
  let facade: InfoPanelFacade;

  beforeEach(() => {
    TestBed.resetTestingModule();
    delta = signal<DeltaSignal>({ path: '', value: null });
    deltas = new Subject<DeltaSignal>();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SKWorkerService,
          useValue: {
            resourceUpdate: delta,
            resourceDelta$: () => deltas.asObservable()
          }
        },
        {
          provide: SKResourceService,
          useValue: {
            transform: (_type: string, r: object) => ({ ...r }),
            fromServer: () =>
              new Promise<object>((resolve) => (fetched = resolve))
          }
        }
      ]
    });
    facade = TestBed.inject(InfoPanelFacade);
    TestBed.tick();
  });

  it('shows the resource the delta carries, not the fetched copy', async () => {
    const opening = facade.open('notes', 'n1');
    send({ path: 'resources.notes.n1', value: { name: 'New' } });
    TestBed.tick();
    fetched({ name: 'Old' });
    await opening;

    expect(facade.item()?.resource).toEqual({ name: 'New' });
  });

  it('keeps a delta for it when another resource changes after it', async () => {
    const opening = facade.open('notes', 'n1');
    send({ path: 'resources.notes.n1', value: { name: 'New' } });
    TestBed.tick();
    send({ path: 'resources.notes.n2', value: { name: 'Other' } });
    TestBed.tick();
    fetched({ name: 'Old' });
    await opening;

    expect(facade.item()?.resource).toEqual({ name: 'New' });
  });

  it('stays closed when the resource was deleted while fetching', async () => {
    const opening = facade.open('notes', 'n1');
    send({ path: 'resources.notes.n1', value: null });
    TestBed.tick();
    fetched({ name: 'Old' });
    await opening;

    expect(facade.item()).toBeUndefined();
    expect(facade.opened()).toBe(false);
  });

  it('stays closed when it was deleted just before another resource changed', async () => {
    const opening = facade.open('notes', 'n1');
    send({ path: 'resources.notes.n1', value: null });
    send({ path: 'resources.notes.n2', value: { name: 'Other' } });
    TestBed.tick();
    fetched({ name: 'Old' });
    await opening;

    expect(facade.item()).toBeUndefined();
  });

  it('keeps the fetched copy over a delta from before the fetch', async () => {
    send({ path: 'resources.notes.n1', value: { name: 'Older' } });
    TestBed.tick();
    const opening = facade.open('notes', 'n1');
    fetched({ name: 'Fetched' });
    await opening;

    expect(facade.item()?.resource).toEqual({ name: 'Fetched' });
  });
});
