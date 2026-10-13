import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Map as OlMap } from 'ol';

import { SPLIT_VIEW_STORAGE_KEY } from './split-view';
import { PaneCommand, SplitViewService } from './split-view.service';

describe('SplitViewService: the active pane', () => {
  beforeEach(() => localStorage.removeItem(SPLIT_VIEW_STORAGE_KEY));
  afterEach(() => localStorage.removeItem(SPLIT_VIEW_STORAGE_KEY));

  it('gives the shared buttons to a pane that has just opened, once it has a map', () => {
    const split = new SplitViewService();
    split.toggle();
    expect(split.secondaryActive()).toBe(false);

    split.setSecondaryMap(new OlMap());

    expect(split.secondaryActive()).toBe(true);
  });

  it('gives them to whichever pane was pressed last', () => {
    const split = new SplitViewService();
    split.toggle();
    split.setSecondaryMap(new OlMap());

    split.activate('main');
    expect(split.secondaryActive()).toBe(false);
    split.activate('secondary');
    expect(split.secondaryActive()).toBe(true);
  });

  it('gives them back to the main chart when the split closes', () => {
    const split = new SplitViewService();
    split.toggle();
    split.setSecondaryMap(new OlMap());

    split.toggle();

    expect(split.secondaryActive()).toBe(false);
  });

  it('never gives them to a pane that is not showing', () => {
    const split = new SplitViewService();
    split.activate('secondary');
    expect(split.secondaryActive()).toBe(false);
  });

  it('passes zoom and centre requests on to the pane', () => {
    const split = new SplitViewService();
    const seen: PaneCommand[] = [];
    split.commands$.subscribe((c) => seen.push(c));

    split.zoomBy(-1);
    split.centerOn([23.5, 60.1], 9);

    expect(seen).toEqual([
      { kind: 'zoom', step: -1 },
      { kind: 'center', position: [23.5, 60.1], zoom: 9 }
    ]);
  });
});
