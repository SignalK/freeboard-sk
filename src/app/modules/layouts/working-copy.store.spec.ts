import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { defaultConfig } from '../../app.config';
import type { PlotterExtensionWidget } from '../../types';
import {
  WORKING_COPY_STORAGE_KEY,
  WorkingCopyStore
} from './working-copy.store';

const widget = (instanceId: string): PlotterExtensionWidget => ({
  instanceId,
  extension: 'ext',
  widget: 'gauge',
  anchor: 'tr',
  col: 0,
  row: 0
});

const stored = () =>
  JSON.parse(localStorage.getItem(WORKING_COPY_STORAGE_KEY) ?? 'null');

describe('WorkingCopyStore', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  it('takes no copy until the starting layout is settled', () => {
    const store = TestBed.inject(WorkingCopyStore);
    const config = defaultConfig();
    config.plotterExtensions.widgets = [widget('a')];

    store.snapshot(config);
    expect(stored()).toBeNull();
    expect(store.existedAtStart).toBe(false);

    store.start(config, null);
    config.plotterExtensions.widgets.push(widget('b'));
    store.snapshot(config);
    expect(stored().content.widgets).toEqual([widget('a'), widget('b')]);
  });

  it('puts this screen’s copy over settings synced from another screen', () => {
    localStorage.setItem(
      WORKING_COPY_STORAGE_KEY,
      JSON.stringify({
        content: {
          widgets: [widget('mine')],
          instances: { ext: { mine: { v: 1 } } }
        },
        link: null
      })
    );
    const store = TestBed.inject(WorkingCopyStore);
    const synced = defaultConfig();
    synced.plotterExtensions.widgets = [widget('theirs')];
    synced.plotterExtensions.state = {
      ext: { extension: { keep: true }, instances: { theirs: { v: 2 } } }
    };

    store.overlay(synced);

    expect(store.existedAtStart).toBe(true);
    expect(synced.plotterExtensions.widgets).toEqual([widget('mine')]);
    expect(synced.plotterExtensions.state).toEqual({
      ext: { extension: { keep: true }, instances: { mine: { v: 1 } } }
    });
  });

  it('marks every save as made by a release with named layouts', () => {
    const store = TestBed.inject(WorkingCopyStore);
    store.start(defaultConfig(), null);
    // settings that load after the start, such as a user's on sign-in
    const signedIn = defaultConfig();

    store.snapshot(signedIn);

    expect(signedIn.plotterExtensions.namedLayouts).toBe(true);
  });

  it('ignores a stored copy that is not one', () => {
    localStorage.setItem(WORKING_COPY_STORAGE_KEY, '{"content":');
    const store = TestBed.inject(WorkingCopyStore);

    expect(store.copy()).toBeNull();
    expect(store.existedAtStart).toBe(false);
  });
});
