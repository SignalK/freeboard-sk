import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { Map as OlMap } from 'ol';
import { Subject } from 'rxjs';
import { Position } from 'src/app/types';

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

describe('SplitMapComponent: where the pane opens', () => {
  const FIX: Position = [23.5, 60.1];
  const opened = (o: { fix: boolean; follow: boolean; stored?: Position }) => {
    const cmp = bareComponent(o.follow);
    cmp.app = {
      MAP_ZOOM_EXTENT: { min: 2, max: 24 },
      config: { map: { zoomLevel: 14, center: [24.9, 60.2] } },
      data: {
        vessels: {
          // The vessel the main chart follows: own ship or one in focus.
          active: {
            positionReceived: o.fix,
            position: o.fix ? FIX : [0, 0],
            orientation: 1
          }
        }
      }
    };
    cmp.heading = signal(0);
    cmp.split.lastView = () => ({ zoom: null, center: o.stored ?? null });
    cmp.split.commands$ = new Subject();
    cmp.skstream = { vessels$: () => new Subject() };
    cmp.ngOnInit();
    return cmp;
  };

  it('centres on the vessel the main chart follows', () => {
    expect(opened({ fix: true, follow: true }).center()).toEqual(FIX);
  });

  it('opens where the main chart was, not at 0,0, before the first fix', () => {
    expect(opened({ fix: false, follow: true }).center()).toEqual([24.9, 60.2]);
  });

  it('opens where it was left when not following', () => {
    expect(
      opened({ fix: true, follow: false, stored: [22, 59] }).center()
    ).toEqual([22, 59]);
  });
});
