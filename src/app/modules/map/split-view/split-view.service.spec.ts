import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('SplitViewService: the pointer over the second pane', () => {
  it('passes it on for the position readout', () => {
    const split = new SplitViewService();
    const seen: number[][] = [];
    split.pointer$.subscribe((lonlat) => seen.push(lonlat));

    split.forwardPointer([23.5, 60.1]);

    expect(seen).toEqual([[23.5, 60.1]]);
  });
});

describe('SplitViewService: layout and saving', () => {
  const stored = () =>
    JSON.parse(localStorage.getItem(SPLIT_VIEW_STORAGE_KEY) ?? 'null');
  beforeEach(() => localStorage.removeItem(SPLIT_VIEW_STORAGE_KEY));
  afterEach(() => {
    vi.useRealTimers();
    localStorage.removeItem(SPLIT_VIEW_STORAGE_KEY);
  });

  it('stacks the panes when the panel is taller than it is wide', () => {
    const split = new SplitViewService();
    split.setPanelSize(1280, 720);
    expect(split.stacked()).toBe(false);
    split.setPanelSize(390, 760);
    expect(split.stacked()).toBe(true);
  });

  it('keeps both panes wide enough for a popover', () => {
    const split = new SplitViewService();
    split.setRatio(0.7);
    split.setPanelSize(844, 340);

    expect(split.ratio()).toBe(0.7);
    expect((1 - split.shownRatio()) * 844).toBeGreaterThanOrEqual(339.9);
  });

  it('saves a dragged divider once, when asked', () => {
    const split = new SplitViewService();
    split.setRatio(0.4, false);
    expect(stored()).toBeNull();

    split.save();

    expect(stored().ratio).toBe(0.4);
  });

  it('saves the pane view once its moves settle', () => {
    vi.useFakeTimers();
    const split = new SplitViewService();
    split.rememberView(11, [23.5, 60.1]);
    split.rememberView(12, [23.6, 60.1]);
    expect(stored()).toBeNull();

    vi.advanceTimersByTime(600);

    expect(stored().zoom).toBe(12);
  });
});
