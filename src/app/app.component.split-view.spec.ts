import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';

import { AppComponent } from './app.component';

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
});
