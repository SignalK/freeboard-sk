import { signal } from '@angular/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Map as OlMap, View } from 'ol';
import { Subject } from 'rxjs';
import { WORLD_WIDTH_3857 } from '../route-extend';
import { SPLIT_SHARE_VAR } from './split-view';
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

    // A chart in a pane `width` x `height` with three controls: one pinned to
    // the top left (the scale bar), one 50 px in from the right (the zoom
    // buttons) and one centred (the position readout).
    const chart = (width: number, height: number) => {
      const target = document.createElement('div');
      target.style.width = '100%';
      target.style.height = '100%';
      const drawn = () =>
        target.style.width.endsWith('px')
          ? parseFloat(target.style.width)
          : width;
      target.getBoundingClientRect = () => ({ width, height }) as DOMRect;
      const map = new OlMap({ target, view: new View() });
      const control = (left: () => number) => {
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.getBoundingClientRect = () =>
          ({ left: left(), top: 10, width: 40, height: 20 }) as DOMRect;
        // An inline wrapper, as an Angular ol-control element is.
        const wrapper = document.createElement('span');
        wrapper.append(el);
        map.getOverlayContainerStopEvent().append(wrapper);
        return el;
      };
      const pinned = control(() => 10);
      const right = control(() => drawn() - 50);
      const centred = control(() => drawn() / 2 - 20);
      vi.spyOn(map, 'renderSync');
      return { map, target, control: pinned, right, centred };
    };

    // The divider at half way on a `width` x 600 panel, pressed.
    const dragged = (width = 1000, stacked = false) => {
      vi.stubGlobal('requestAnimationFrame', (fn: () => void) => {
        fn();
        return 1;
      });
      vi.stubGlobal('cancelAnimationFrame', () => undefined);
      const cmp = withDivider(stacked);
      cmp.split.save = vi.fn();
      const panel = document.createElement('div');
      panel.getBoundingClientRect = () =>
        ({ left: 0, top: 0, width, height: 600 }) as DOMRect;
      cmp.host = { nativeElement: document.createElement('div') };
      panel.append(cmp.host.nativeElement);
      cmp.dragging = signal(false);
      cmp.overscans = [];
      cmp.zone = {
        runOutsideAngular: vi.fn((fn: () => void) => fn()),
        run: (fn: () => void) => fn()
      };
      cmp.footprint = signal(null);
      const main = stacked ? chart(width, 300) : chart(width / 2, 600);
      const pane = stacked ? chart(width, 292) : chart(width / 2 - 8, 600);
      cmp.mainMap = main.map;
      cmp.map = pane.map;
      const grip = document.createElement('div');
      cmp.gripDown({
        currentTarget: grip,
        pointerId: 1,
        preventDefault: () => undefined
      } as unknown as PointerEvent);
      const at = (type: string, x: number, y = 300) =>
        grip.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y }));
      const share = () => panel.style.getPropertyValue(SPLIT_SHARE_VAR);
      return { cmp, at, share, main, pane };
    };

    it('draws each chart once, at the largest size this drag can give it', () => {
      const { cmp, main, pane } = dragged();
      expect(cmp.dragging()).toBe(true);

      // The main chart can grow to 70 %, the second pane to 70 % less its border.
      expect(main.target.style.width).toBe('700px');
      expect(pane.target.style.width).toBe('692px');
      // Centred on its pane, as OL keeps the centre of a resized map.
      expect(main.target.style.transform).toBe('translateX(-100px)');
      expect(pane.target.style.transform).toBe('translateX(-100px)');
      expect(main.control.style.translate).toBe('100px 0');
      expect(main.map.renderSync).toHaveBeenCalledTimes(1);
      expect(pane.map.renderSync).toHaveBeenCalledTimes(1);
    });

    it('keeps each control where it sits in a pane of the size shown', () => {
      const { at, main } = dragged();
      at('pointermove', 620);

      // The chart is moved 40 px left within its 620 px pane.
      expect(main.control.style.translate).toBe('40px 0');
      // 50 px in from the pane's right edge: 700 - 50 - 40 - 40 = 570.
      expect(main.right.style.translate).toBe('-40px 0');
      // Centred: the chart's own centre is already mid-pane.
      expect(main.centred.style.translate).toBe('0px 0');
    });

    it('moves the charts, without drawing them again, as the divider moves', () => {
      const { cmp, at, share, main, pane } = dragged();

      at('pointermove', 600);
      at('pointermove', 620);

      expect(share()).toBe('62%');
      expect(main.target.style.transform).toBe('translateX(-40px)');
      expect(pane.target.style.transform).toBe('translateX(-160px)');
      expect(main.control.style.translate).toBe('40px 0');
      expect(main.target.style.width).toBe('700px');
      expect(main.map.renderSync).toHaveBeenCalledTimes(1);
      expect(pane.map.renderSync).toHaveBeenCalledTimes(1);
      expect(cmp.split.setRatio).not.toHaveBeenCalled();
    });

    it('fills its pane again, drawn at that size, when let go', () => {
      const { cmp, at, share, main, pane } = dragged();
      at('pointermove', 620);

      at('pointerup', 620);

      expect(cmp.split.setRatio.mock.calls).toEqual([[0.62]]);
      expect(share()).toBe('');
      expect(cmp.dragging()).toBe(false);
      for (const { target, map, control, right } of [main, pane]) {
        expect(target.style.width).toBe('100%');
        expect(target.style.transform).toBe('');
        expect(control.style.translate).toBe('');
        expect(right.style.translate).toBe('');
        expect(map.renderSync).toHaveBeenCalledTimes(2);
      }
    });

    it('moves the charts up and down when the panes are stacked', () => {
      // 600 px tall: the second pane keeps 200 px, so the main chart's most is
      // 400 px, from 300 px.
      const { at, main } = dragged(390, true);
      expect(main.target.style.height).toBe('400px');
      expect(main.target.style.transform).toBe('translateY(-50px)');

      at('pointermove', 195, 360);

      expect(main.target.style.transform).toBe('translateY(-20px)');
      expect(main.control.style.translate).toBe('0 20px');
    });

    it('stops where the divider will land', () => {
      // 560 px: the second pane keeps its 200 px, so 0.7 shows as 360 px.
      const { at, share } = dragged(560);

      at('pointermove', 520);

      expect(parseFloat(share()) * 5.6).toBeCloseTo(360);
    });

    it('changes nothing when pressed and let go without a move', () => {
      const { cmp, at, main } = dragged();

      at('pointerup', 500);

      expect(cmp.split.setRatio).not.toHaveBeenCalled();
      expect(cmp.split.save).not.toHaveBeenCalled();
      expect(main.target.style.width).toBe('100%');
    });

    it('follows the pointer outside Angular, and stops at the release', () => {
      const { cmp, at, share } = dragged();
      expect(cmp.zone.runOutsideAngular).toHaveBeenCalled();

      at('pointermove', 400);
      at('pointerup', 400);
      at('pointermove', 600);

      expect(cmp.split.setRatio.mock.calls).toEqual([[0.4]]);
      expect(share()).toBe('');
    });

    it('gives the main chart back its pane if the split closes mid-drag', () => {
      const { cmp, at, main } = dragged();
      cmp.stopUseWatch = [];
      cmp.onMainMoved = () => undefined;
      cmp.split.setSecondaryMap = vi.fn();
      at('pointermove', 620);

      cmp.ngOnDestroy();

      expect(main.target.style.width).toBe('100%');
      expect(main.target.style.transform).toBe('');
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

describe('SplitMapComponent: the position readout', () => {
  it('hands the pointer position to the main chart readout', () => {
    const cmp = bareComponent();
    cmp.split.forwardPointer = vi.fn();

    cmp.onPointerMove({ lonlat: [23.5, 60.1] });

    expect(cmp.split.forwardPointer).toHaveBeenCalledWith([23.5, 60.1]);
  });
});
