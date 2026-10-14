import { signal } from '@angular/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Map as OlMap } from 'ol';
import { Subject } from 'rxjs';
import { WORLD_WIDTH_3857 } from '../route-extend';
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
  it('zooms one level per step, within the map zoom range', () => {
    const cmp = bareComponent();
    cmp.zoom.set(9.6);
    cmp.onCommand({ kind: 'zoom', step: 1 });
    expect(cmp.zoom()).toBe(10.6);

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

  it('never zooms out to show a place', () => {
    const cmp = bareComponent();
    cmp.zoom.set(12);

    cmp.onCommand({ kind: 'center', position: [23.5, 60.1], zoom: 9 });

    expect(cmp.zoom()).toBe(12);
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
    cmp.activateOnUse(map, 'secondary');

    press(map.getViewport());

    expect(cmp.split.activate).toHaveBeenCalledWith('secondary');
  });

  it("ignores presses on a pane's buttons and popovers", () => {
    const cmp = bareComponent();
    const map = new OlMap();
    const button = document.createElement('button');
    map.getOverlayContainerStopEvent().appendChild(button);
    cmp.activateOnUse(map, 'main');

    press(button);

    expect(cmp.split.activate).not.toHaveBeenCalled();
  });

  it('stops listening when asked', () => {
    const cmp = bareComponent();
    const map = new OlMap();
    const stop = cmp.activateOnUse(map, 'secondary');

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

describe('SplitMapComponent: double-click and keys', () => {
  const key = (k: string) =>
    ({ key: k, preventDefault: vi.fn() }) as unknown as KeyboardEvent;

  it('zooms on double-click only when the user has turned that on', () => {
    const cmp = bareComponent();
    cmp.app.config = { map: { doubleClickZoom: false } };
    const off = cmp.interactions();
    expect(off.map((i) => i.name)).not.toContain('doubleclickzoom');
    expect(cmp.interactions()).toBe(off);

    cmp.app.config.map.doubleClickZoom = true;

    expect(cmp.interactions().map((i) => i.name)).toContain('doubleclickzoom');
  });

  it('becomes the active pane and zooms with + and -', () => {
    const cmp = bareComponent();

    cmp.onKeydown(key('+'));

    expect(cmp.split.activate).toHaveBeenCalledWith('secondary');
    expect(cmp.zoom()).toBe(11);
  });

  it('stops following when the keys pan it', () => {
    const cmp = bareComponent(true);

    cmp.onKeydown(key('ArrowLeft'));

    expect(cmp.split.setFollow).toHaveBeenCalledWith(false);
  });
});

describe('SplitMapComponent: the divider', () => {
  const key = (k: string) =>
    ({ key: k, preventDefault: vi.fn() }) as unknown as KeyboardEvent;
  const withDivider = (stacked: boolean) => {
    const cmp = bareComponent();
    cmp.split.stacked = () => stacked;
    cmp.split.shownRatio = () => 0.5;
    cmp.split.setRatio = vi.fn();
    return cmp;
  };

  it('moves with the arrow keys along the split', () => {
    const side = withDivider(false);
    side.gripKey(key('ArrowRight'));
    expect(side.split.setRatio).toHaveBeenCalledWith(0.55);

    const stacked = withDivider(true);
    stacked.gripKey(key('ArrowUp'));
    expect(stacked.split.setRatio).toHaveBeenCalledWith(0.45);
  });

  describe('dragged', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('saves where it was let go, even before the move was drawn', () => {
      const frames: (() => void)[] = [];
      vi.stubGlobal('requestAnimationFrame', (fn: () => void) =>
        frames.push(fn)
      );
      vi.stubGlobal('cancelAnimationFrame', () => undefined);
      const cmp = withDivider(false);
      cmp.split.save = vi.fn();
      cmp.gripRect = { left: 0, top: 0, width: 1000, height: 600 };
      cmp.gripStacked = false;

      cmp.gripMove({ clientX: 620, clientY: 300 } as PointerEvent);
      cmp.gripUp();

      // The final position is set and saved (save defaults to true).
      expect(cmp.split.setRatio).toHaveBeenCalledWith(0.62);
      expect(cmp.split.setRatio.mock.calls[0]).toHaveLength(1);
    });

    it('saves once when the last move was already drawn', () => {
      vi.stubGlobal('requestAnimationFrame', (fn: () => void) => {
        fn();
        return 1;
      });
      vi.stubGlobal('cancelAnimationFrame', () => undefined);
      const cmp = withDivider(false);
      cmp.split.save = vi.fn();
      cmp.gripRect = { left: 0, top: 0, width: 1000, height: 600 };
      cmp.gripStacked = false;

      cmp.gripMove({ clientX: 620, clientY: 300 } as PointerEvent);
      cmp.gripUp();

      expect(cmp.split.setRatio).toHaveBeenCalledWith(0.62, false);
      expect(cmp.split.save).toHaveBeenCalledOnce();
    });
  });

  it('goes to either end with Home and End', () => {
    const cmp = withDivider(false);
    cmp.gripKey(key('Home'));
    cmp.gripKey(key('End'));
    expect(cmp.split.setRatio.mock.calls).toEqual([[0.3], [0.7]]);
  });
});

describe('SplitMapComponent: keyboard focus', () => {
  it('makes a pane active when the keyboard moves focus onto its chart', () => {
    const cmp = bareComponent();
    const map = new OlMap();
    const target = document.createElement('div');
    target.appendChild(map.getViewport());
    map.getTargetElement = () => target;
    cmp.activateOnUse(map, 'secondary');
    const focused = (visible: boolean) => {
      const viewport = map.getViewport();
      viewport.matches = (q: string) => q === ':focus-visible' && visible;
      viewport.dispatchEvent(new Event('focusin', { bubbles: true }));
    };

    focused(false);
    expect(cmp.split.activate).not.toHaveBeenCalled();
    focused(true);
    expect(cmp.split.activate).toHaveBeenCalledWith('secondary');
  });
});

describe('SplitMapComponent: the main chart outline', () => {
  it('draws it in the primary world, wherever the main chart was panned', () => {
    const cmp = bareComponent();
    cmp.footprint = signal(null);
    const W = WORLD_WIDTH_3857;
    // The main chart panned three worlds east of the primary one.
    cmp.mainMap = {
      getSize: () => [100, 50],
      getCoordinateFromPixel: ([x, y]: number[]) => [3 * W + x, -y],
      getView: () => ({
        getCenter: () => [3 * W + 50, -25],
        getProjection: () => ({
          getExtent: () => [-W / 2, -W / 2, W / 2, W / 2]
        })
      })
    };

    cmp.updateFootprint();

    expect(cmp.footprint()[0]).toEqual([0, -0]);
    expect(cmp.footprint()[2]).toEqual([100, -50]);
  });
});
