import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { Map as OlMap } from 'ol';

import { SplitMapComponent } from './split-map.component';

// A bare prototype instance: these handlers read only the pane's view signals
// and the split view service, and a TestBed fixture would need a whole map.
const bareComponent = (follow = false) => {
  const cmp = Object.create(SplitMapComponent.prototype);
  cmp.app = { MAP_ZOOM_EXTENT: { min: 2, max: 24 } };
  cmp.zoom = signal(10);
  cmp.center = signal([0, 0]);
  cmp.split = { follow: () => follow, setFollow: vi.fn(), activate: vi.fn() };
  return cmp;
};

describe('SplitMapComponent: the shared map buttons', () => {
  it('zooms by whole steps, within the map zoom range', () => {
    const cmp = bareComponent();
    cmp.zoom.set(9.6);
    cmp.onCommand({ kind: 'zoom', step: 1 });
    expect(cmp.zoom()).toBe(11);

    cmp.zoom.set(24);
    cmp.onCommand({ kind: 'zoom', step: 1 });
    expect(cmp.zoom()).toBe(24);
  });

  it('shows a place, and stops following the vessel to keep it in view', () => {
    const cmp = bareComponent(true);

    cmp.onCommand({ kind: 'center', position: [23.5, 60.1], zoom: 14 });

    expect(cmp.split.setFollow).toHaveBeenCalledWith(false);
    expect(cmp.center()).toEqual([23.5, 60.1]);
    expect(cmp.zoom()).toBe(14);
  });

  it('keeps the zoom when a place comes without one', () => {
    const cmp = bareComponent();

    cmp.onCommand({ kind: 'center', position: [23.5, 60.1] });

    expect(cmp.split.setFollow).not.toHaveBeenCalled();
    expect(cmp.zoom()).toBe(10);
  });
});

describe('SplitMapComponent: choosing the active pane', () => {
  const press = (target: EventTarget) =>
    target.dispatchEvent(new Event('pointerdown', { bubbles: true }));

  it('makes a pane active when its chart is pressed', () => {
    const cmp = bareComponent();
    const map = new OlMap();
    cmp.activateOnPress(map, 'secondary');

    press(map.getViewport());

    expect(cmp.split.activate).toHaveBeenCalledWith('secondary');
  });

  it("ignores presses on a pane's buttons and popovers", () => {
    const cmp = bareComponent();
    const map = new OlMap();
    const button = document.createElement('button');
    map.getOverlayContainerStopEvent().appendChild(button);
    cmp.activateOnPress(map, 'main');

    press(button);

    expect(cmp.split.activate).not.toHaveBeenCalled();
  });

  it('stops listening when asked', () => {
    const cmp = bareComponent();
    const map = new OlMap();
    const stop = cmp.activateOnPress(map, 'secondary');

    stop();
    press(map.getViewport());

    expect(cmp.split.activate).not.toHaveBeenCalled();
  });
});
