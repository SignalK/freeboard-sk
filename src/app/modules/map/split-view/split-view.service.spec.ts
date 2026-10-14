import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Map as OlMap } from 'ol';

import { MIN_PANE_PX, SPLIT_VIEW_STORAGE_KEY } from './split-view';
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

  it('keeps a pane from collapsing on a small panel', () => {
    const split = new SplitViewService();
    split.setRatio(0.7);
    split.setPanelSize(560, 340);

    expect(split.ratio()).toBe(0.7);
    expect((1 - split.shownRatio()) * 560).toBeCloseTo(MIN_PANE_PX);
  });

  it('tells the divider how far it can go on the panel it has', () => {
    const split = new SplitViewService();
    expect(split.shownRange()).toEqual({ min: 0.3, max: 0.7 });

    // 560 px: each pane keeps its 200 px.
    split.setPanelSize(560, 340);
    expect(split.shownRange().min * 560).toBeCloseTo(MIN_PANE_PX);
    expect((1 - split.shownRange().max) * 560).toBeCloseTo(MIN_PANE_PX);
  });

  it('leaves a phone the divider to drag', () => {
    // A phone held upright, in a browser: about 390 x 664.
    const split = new SplitViewService();
    split.setPanelSize(390, 664);

    split.setRatio(0.3);
    const top = split.shownRatio();
    split.setRatio(0.7);
    const bottom = split.shownRatio();

    expect(bottom - top).toBeGreaterThan(0.35);
  });

  it('saves the divider as soon as it is set', () => {
    const split = new SplitViewService();

    split.setRatio(0.4);

    expect(stored().ratio).toBe(0.4);
  });

  it('writes a view still waiting to be saved when told to', () => {
    vi.useFakeTimers();
    const split = new SplitViewService();
    split.flush();
    expect(stored()).toBeNull();

    split.rememberView(11, [23.5, 60.1]);
    split.flush();

    expect(stored()).toMatchObject({ zoom: 11, center: [23.5, 60.1] });
  });

  it('saves where a pane following the vessel was when it stops following', () => {
    const split = new SplitViewService();
    split.setFollow(true);
    // Fixes move the pane; its centre is kept, not written each time.
    split.rememberView(12, [23.5, 60.1], false);
    split.rememberView(12, [23.6, 60.2], false);
    expect(stored().center).toBeNull();

    split.setFollow(false);
    split.toggle();

    // Opened again, it is where following stopped.
    expect(new SplitViewService().lastView()).toEqual({
      zoom: 12,
      center: [23.6, 60.2]
    });
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
