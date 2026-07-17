import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CompiledFeature } from './feature-corpus';
import { FeatureCorpusService } from './feature-corpus.service';
import { eventKeys, unseenEvents } from './whats-new';
import { WhatsNewService } from './whats-new.service';

/** Minimal CompiledFeature with one event per given PR. */
function feature(id: string, prs: number[]): CompiledFeature {
  return {
    id,
    title: id,
    category: 'General',
    body: '',
    since: null,
    latestKind: 'new',
    events: prs.map((pr) => ({ pr, date: null, title: `change ${pr}` })),
    images: []
  };
}

describe('eventKeys', () => {
  it('keys every change event as <feature-id>:<pr>', () => {
    expect(eventKeys([feature('a', [1, 2]), feature('b', [3])])).toEqual([
      'a:1',
      'a:2',
      'b:3'
    ]);
  });

  it('yields nothing for an event-less corpus', () => {
    expect(eventKeys([feature('a', [])])).toEqual([]);
  });
});

describe('unseenEvents', () => {
  it('treats everything as unseen when nothing (or garbage) is stored', () => {
    expect(unseenEvents(['a:1', 'b:2'], null)).toEqual(['a:1', 'b:2']);
    expect(unseenEvents(['a:1'], 'not-a-list')).toEqual(['a:1']);
  });

  it('reports only events missing from the stored list', () => {
    expect(unseenEvents(['a:1', 'a:2', 'b:3'], ['a:1', 'b:3'])).toEqual([
      'a:2'
    ]);
  });

  it('ignores non-string entries in a stored list', () => {
    expect(unseenEvents(['a:1'], [42, null, 'a:1'])).toEqual([]);
  });
});

describe('WhatsNewService', () => {
  let corpus: CompiledFeature[];

  const makeService = () => {
    TestBed.configureTestingModule({
      providers: [
        WhatsNewService,
        {
          provide: FeatureCorpusService,
          useValue: { load: async () => corpus }
        }
      ]
    });
    return TestBed.inject(WhatsNewService);
  };

  beforeEach(() => {
    localStorage.clear();
    corpus = [feature('radar', [100])];
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('first run: everything is unseen — a new user gets a lit bulb', async () => {
    const svc = makeService();
    await svc.init();
    expect(svc.hasUnseen()).toBe(true);
    // nothing persisted until the user actually opens the browser
    expect(localStorage.getItem('fb-whats-new-seen')).toBeNull();
  });

  it('lights when an unseen event exists', async () => {
    localStorage.setItem('fb-whats-new-seen', JSON.stringify([]));
    const svc = makeService();
    await svc.init();
    expect(svc.hasUnseen()).toBe(true);
  });

  it('an enhancement to an already-seen feature re-lights the bulb', async () => {
    // user saw the feature's original release...
    localStorage.setItem('fb-whats-new-seen', JSON.stringify(['radar:100']));
    // ...then a later release enhances it (a second ledger event)
    corpus = [feature('radar', [100, 200])];
    const svc = makeService();
    await svc.init();
    expect(svc.hasUnseen()).toBe(true);
  });

  it('markAllSeen extinguishes the bulb and persists across a re-init', async () => {
    localStorage.setItem('fb-whats-new-seen', JSON.stringify([]));
    const svc = makeService();
    await svc.init();
    expect(svc.hasUnseen()).toBe(true);

    await svc.markAllSeen();
    expect(svc.hasUnseen()).toBe(false);

    // a fresh service (new session) over the same corpus stays clean
    TestBed.resetTestingModule();
    const svc2 = makeService();
    await svc2.init();
    expect(svc2.hasUnseen()).toBe(false);
  });
});
