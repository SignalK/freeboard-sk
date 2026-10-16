import { signal } from '@angular/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Map as OlMap } from 'ol';

import { AppComponent } from './app.component';
import { SPLIT_VIEW_STORAGE_KEY } from './modules/map/split-view/split-view';
import { SplitViewService } from './modules/map/split-view/split-view.service';

// The toolbar's North up and Follow buttons, and the lists' "show on chart"
// actions, act on the active pane of the split view. Exercised on a bare
// prototype instance: the handlers touch only the facade and the service.
const component = (secondaryActive: boolean) => {
  const cmp = Object.create(AppComponent.prototype);
  cmp.app = {
    uiConfig: signal({ mapNorthUp: true, mapMove: false }),
    config: { map: { zoomLevel: 10 } }
  };
  cmp.splitView = {
    secondaryActive: () => secondaryActive,
    northUp: () => true,
    follow: () => false,
    setNorthUp: vi.fn(),
    setFollow: vi.fn(),
    centerOn: vi.fn()
  };
  cmp.mapCenter = signal([0, 0]);
  cmp.focusMap = vi.fn();
  return cmp;
};

describe('AppComponent: map buttons with the chart split', () => {
  it('turns the second pane when it is active', () => {
    const cmp = component(true);
    cmp.toggleNorthUp();
    expect(cmp.splitView.setNorthUp).toHaveBeenCalledWith(false);
    expect(cmp.app.uiConfig().mapNorthUp).toBe(true);
  });

  it('turns the main chart when it is active', () => {
    const cmp = component(false);
    cmp.toggleNorthUp();
    expect(cmp.splitView.setNorthUp).not.toHaveBeenCalled();
    expect(cmp.app.uiConfig().mapNorthUp).toBe(false);
  });

  it('makes the active pane follow the vessel', () => {
    const second = component(true);
    second.toggleFollow();
    expect(second.splitView.setFollow).toHaveBeenCalledWith(true);
    expect(second.app.uiConfig().mapMove).toBe(false);

    const main = component(false);
    main.toggleFollow();
    expect(main.splitView.setFollow).not.toHaveBeenCalled();
    expect(main.app.uiConfig().mapMove).toBe(true);
  });

  it('shows a place from a list in the active pane', () => {
    const second = component(true);
    second.centerAndZoom([23.5, 60.1], 14);
    expect(second.splitView.centerOn).toHaveBeenCalledWith([23.5, 60.1], 14);
    expect(second.mapCenter()).toEqual([0, 0]);

    const main = component(false);
    main.centerAndZoom([23.5, 60.1], 14);
    expect(main.splitView.centerOn).not.toHaveBeenCalled();
    expect(main.mapCenter()).toEqual([23.5, 60.1]);
    expect(main.app.config.map.zoomLevel).toBe(14);
  });

  it("shows a buddy's position in the active pane, and moves the main chart for extensions", () => {
    const second = component(true);
    second.app.uiConfig.set({ mapNorthUp: true, mapMove: true });

    second.applyMapMove({ center: [23.5, 60.1], activePane: true });
    expect(second.splitView.centerOn).toHaveBeenCalledWith(
      [23.5, 60.1],
      undefined
    );
    // The main chart keeps following.
    expect(second.app.uiConfig().mapMove).toBe(true);

    second.applyMapMove({ center: [24, 60], zoom: 9 });
    expect(second.mapCenter()).toEqual([24, 60]);
    expect(second.app.config.map.zoomLevel).toBe(9);
    expect(second.app.uiConfig().mapMove).toBe(false);
  });

  it("shows a buddy's position on the main chart while it is the active one", () => {
    const main = component(false);
    main.app.uiConfig.set({ mapNorthUp: true, mapMove: true });

    main.applyMapMove({ center: [23.5, 60.1], activePane: true });

    expect(main.splitView.centerOn).not.toHaveBeenCalled();
    expect(main.mapCenter()).toEqual([23.5, 60.1]);
    // It stops following to keep the buddy in view.
    expect(main.app.uiConfig().mapMove).toBe(false);
  });

  it('gives the keys back to the active pane after North up and Follow', () => {
    for (const secondaryActive of [true, false]) {
      const cmp = component(secondaryActive);
      cmp.toggleNorthUp();
      cmp.toggleFollow();
      expect(cmp.focusMap).toHaveBeenCalledTimes(2);
    }
  });

  it('zooms the main chart in to a place, never out', () => {
    const main = component(false);
    main.app.config.map.zoomLevel = 15;

    main.centerAndZoom([23.5, 60.1], 12);

    expect(main.mapCenter()).toEqual([23.5, 60.1]);
    expect(main.app.config.map.zoomLevel).toBe(15);
  });
});

describe('AppComponent: map buttons once the second pane is gone', () => {
  afterEach(() => localStorage.removeItem(SPLIT_VIEW_STORAGE_KEY));

  // Kiosk mode or the setting turned off take the pane away (`@if
  // (splitActive())`), and the pane lets go of its map as it goes.
  it('acts on the main chart, even if the second pane was the active one', () => {
    const split = new SplitViewService();
    split.toggle();
    split.setSecondaryMap(new OlMap());
    const cmp = Object.create(AppComponent.prototype);
    cmp.app = { uiConfig: signal({ mapNorthUp: true, mapMove: false }) };
    cmp.splitView = split;
    cmp.focusMap = vi.fn();
    const setFollow = vi.spyOn(split, 'setFollow');
    const setNorthUp = vi.spyOn(split, 'setNorthUp');

    split.setSecondaryMap(null);
    cmp.toggleFollow();
    cmp.toggleNorthUp();

    expect(setFollow).not.toHaveBeenCalled();
    expect(setNorthUp).not.toHaveBeenCalled();
    expect(cmp.app.uiConfig()).toEqual({ mapNorthUp: false, mapMove: true });
  });
});

describe('AppComponent: keyboard focus with the chart split', () => {
  it('hands focus back to the active pane', () => {
    const cmp = component(true);
    const target = document.createElement('div');
    target.tabIndex = -1;
    document.body.append(target);
    cmp.splitView.secondaryMap = () => ({ getTargetElement: () => target });
    cmp.mapSetFocus = signal(0);
    delete cmp.focusMap;

    cmp.focusMap();

    expect(document.activeElement).toBe(target);
    expect(cmp.mapSetFocus()).toBe(0);
    target.remove();
  });
});

describe('AppComponent: when the split shows', () => {
  const shown = (kiosk: boolean, setting = true) => {
    const cmp = Object.create(AppComponent.prototype);
    cmp.app = {
      config: { display: { splitView: setting } },
      kioskMode: signal(kiosk)
    };
    cmp.splitView = { enabled: () => true };
    return cmp.splitActive();
  };

  it('shows while split view is enabled in the settings', () => {
    expect(shown(false)).toBe(true);
  });

  it('stays hidden while the setting is off, even if it was left open', () => {
    expect(shown(false, false)).toBe(false);
  });

  it('never shows in kiosk mode, which has no button to close it', () => {
    expect(shown(true)).toBe(false);
  });
});
