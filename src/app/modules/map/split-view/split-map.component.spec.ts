import { signal } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Map as OlMap, View } from 'ol';
import { ScaleLine } from 'ol/control';
import MapEvent from 'ol/MapEvent';
import { fromLonLat } from 'ol/proj';
import { Subject } from 'rxjs';
import { WORLD_WIDTH_3857 } from '../route-extend';
import { SPLIT_SHARE_VAR, SPLIT_VIEW_STORAGE_KEY } from './split-view';
import { SplitViewService } from './split-view.service';
import { RESIZING } from 'src/app/modules/map/ol/lib/util';
import { Position } from 'src/app/types';
import { AppFacade } from 'src/app/app.facade';
import { SKStreamFacade } from 'src/app/modules';
import { FBMapInteractService } from '../fbmap-interact.service';

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

  it('does not become the active pane for keys in a popover on it', () => {
    const cmp = bareComponent();
    cmp.map = new OlMap();
    const button = document.createElement('button');
    cmp.map.getOverlayContainerStopEvent().appendChild(button);

    cmp.onKeydown({
      key: 'Enter',
      target: button,
      preventDefault: vi.fn()
    } as unknown as KeyboardEvent);

    expect(cmp.split.activate).not.toHaveBeenCalled();
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

    // The divider at `start` on a `width` x 600 panel (`width` x 600 stacked),
    // pressed `pressedAt` px past it along the split. Frames are drawn at
    // once unless `queued`; then `frames()` draws the ones waiting.
    const dragged = ({
      width = 1000,
      stacked = false,
      start = 0.5,
      pressedAt = 0,
      queued = false
    } = {}) => {
      const waiting: (() => void)[] = [];
      vi.stubGlobal('requestAnimationFrame', (fn: () => void) => {
        if (queued) {
          waiting.push(fn);
        } else {
          fn();
        }
        return 1;
      });
      vi.stubGlobal('cancelAnimationFrame', () => waiting.splice(0));
      const cmp = withDivider(stacked);
      cmp.split.shownRatio = () => start;
      cmp.split.save = vi.fn();
      cmp.split.setPanelSize = vi.fn();
      const panel = document.createElement('div');
      panel.getBoundingClientRect = () =>
        ({ left: 0, top: 0, width, height: 600 }) as DOMRect;
      Object.defineProperty(panel, 'clientWidth', {
        value: width,
        configurable: true
      });
      Object.defineProperty(panel, 'clientHeight', { value: 600 });
      cmp.host = { nativeElement: document.createElement('div') };
      panel.append(cmp.host.nativeElement);
      cmp.dragging = signal(false);
      cmp.overscans = [];
      cmp.zone = {
        runOutsideAngular: vi.fn((fn: () => void) => fn()),
        run: (fn: () => void) => fn()
      };
      cmp.footprint = signal(null);
      const length = stacked ? 600 : width;
      const main = stacked
        ? chart(width, length * start)
        : chart(length * start, 600);
      const pane = stacked
        ? chart(width, length * (1 - start) - 8)
        : chart(length * (1 - start) - 8, 600);
      cmp.mainMap = main.map;
      cmp.map = pane.map;
      const grip = document.createElement('div');
      const press = (more: Partial<PointerEvent> = {}) =>
        cmp.gripDown({
          currentTarget: grip,
          pointerId: 1,
          isPrimary: true,
          button: 0,
          clientX: stacked ? width / 2 : length * start + pressedAt,
          clientY: stacked ? length * start + pressedAt : 300,
          preventDefault: () => undefined,
          ...more
        } as unknown as PointerEvent);
      press();
      const at = (type: string, x: number, y = 300) =>
        grip.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y }));
      const share = () => panel.style.getPropertyValue(SPLIT_SHARE_VAR);
      const frames = () => waiting.splice(0).forEach((fn) => fn());
      return { cmp, at, share, main, pane, press, panel, frames };
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
      const { at, main } = dragged({ width: 390, stacked: true });
      expect(main.target.style.height).toBe('400px');
      expect(main.target.style.transform).toBe('translateY(-50px)');

      at('pointermove', 195, 360);

      expect(main.target.style.transform).toBe('translateY(-20px)');
      expect(main.control.style.translate).toBe('0 20px');
    });

    it('stops where the divider will land', () => {
      // 560 px: the second pane keeps its 200 px, so 0.7 shows as 360 px.
      const { at, share } = dragged({ width: 560 });

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
      const { cmp, at, main, pane } = dragged();
      cmp.stopUseWatch = [];
      cmp.documentListeners = [];
      cmp.onMainMoved = () => undefined;
      cmp.split.setSecondaryMap = vi.fn();
      cmp.split.flush = vi.fn();
      at('pointermove', 620);
      // The pane's own map goes first, as Angular destroys child views first.
      pane.map.setTarget(undefined);

      cmp.ngOnDestroy();

      expect(main.target.style.width).toBe('100%');
      expect(main.target.style.transform).toBe('');
      expect(cmp.split.setSecondaryMap).toHaveBeenCalledWith(null);
    });

    it('keeps controls in step from a pane already at its largest', () => {
      // The main chart at its 70 % is not drawn any bigger for this drag.
      const { at, main } = dragged({ start: 0.7 });
      expect(main.target.style.width).toBe('700px');

      at('pointermove', 600);

      // The chart moves 50 px left in its 600 px pane; the right-hand control
      // moves 100 px with the pane's edge, the centred one 50 px.
      expect(main.target.style.transform).toBe('translateX(-50px)');
      expect(main.control.style.translate).toBe('50px 0');
      expect(main.right.style.translate).toBe('-50px 0');
      expect(main.centred.style.translate).toBe('0px 0');
    });

    it('keeps the divider where the grip was pressed, without a jump', () => {
      const { at, share } = dragged({ pressedAt: 12 });

      at('pointermove', 512);
      expect(share()).toBe('50%');
      at('pointermove', 632);
      expect(share()).toBe('62%');
    });

    it('starts no second drag over the first, from another pointer or button', () => {
      const { cmp, at, main, press } = dragged();
      at('pointermove', 620);

      press({ pointerId: 2, isPrimary: false });
      press({ pointerId: 3 });
      at('pointerup', 620);

      expect(main.target.style.width).toBe('100%');
      expect(main.target.style.transform).toBe('');
      expect(main.target.style.willChange).toBe('');

      press({ button: 2 });
      expect(cmp.dragging()).toBe(false);
      expect(main.target.style.width).toBe('100%');
    });

    it('saves where it was let go, even before the move was drawn', () => {
      const { cmp, at, share, main } = dragged({ queued: true });
      const drawnAt: string[] = [];
      vi.spyOn(main.map, 'updateSize').mockImplementation(() =>
        drawnAt.push(share())
      );

      at('pointermove', 620);
      at('pointerup', 620);

      expect(cmp.split.setRatio.mock.calls).toEqual([[0.62]]);
      // Drawn at the share it keeps, not the last one a frame showed.
      expect(drawnAt).toEqual(['62%']);
    });

    it('ends the drag when the panel changes size under it', () => {
      let resized: () => void = () => undefined;
      vi.stubGlobal(
        'ResizeObserver',
        class {
          constructor(fn: () => void) {
            resized = fn;
          }
          observe() {}
          disconnect() {}
        }
      );
      const { cmp, at, main, panel } = dragged();
      cmp.ngAfterViewInit();
      at('pointermove', 620);
      resized();
      expect(cmp.dragging()).toBe(true);

      Object.defineProperty(panel, 'clientWidth', { value: 610 });
      resized();

      expect(cmp.dragging()).toBe(false);
      expect(main.target.style.width).toBe('100%');
      expect(cmp.split.setRatio.mock.calls).toEqual([[0.62]]);
      // ngAfterViewInit listened on the document: stop, as the pane does
      // when it goes, so later tests' keys don't reach this one.
      for (const [type, fn] of cmp.documentListeners) {
        document.removeEventListener(type, fn, true);
      }
    });

    it('reports a settled view when let go at the size it was drawn at', () => {
      // From half way to the main chart's 70 %: the size it was drawn at, so
      // OL reports no move-end on release (nor ever here, where the charts
      // have no size): the release reports one.
      const { at, main } = dragged();
      at('pointermove', 700);
      const settled = vi.fn();
      main.map.on('moveend', settled);

      at('pointerup', 700);

      expect(settled).toHaveBeenCalledTimes(1);
      expect(main.map.get(RESIZING)).toBe(false);
    });

    it('reports it once when drawing the chart reported it already', () => {
      const { at, main } = dragged();
      at('pointermove', 600);
      vi.mocked(main.map.renderSync).mockImplementation(() => {
        main.map.dispatchEvent(new MapEvent('moveend', main.map));
      });
      const settled = vi.fn();
      main.map.on('moveend', settled);

      at('pointerup', 600);

      expect(settled).toHaveBeenCalledTimes(1);
    });

    it('marks both charts as resizing until they are drawn at their size', () => {
      const { at, main, pane } = dragged();
      expect(main.map.get(RESIZING)).toBe(true);
      expect(pane.map.get(RESIZING)).toBe(true);

      at('pointerup', 500);

      expect(main.map.get(RESIZING)).toBe(false);
      expect(pane.map.get(RESIZING)).toBe(false);
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
  const watched = () => {
    const cmp = bareComponent();
    const map = new OlMap();
    const target = document.createElement('div');
    target.appendChild(map.getViewport());
    map.getTargetElement = () => target;
    cmp.activateOnUse(map, 'secondary');
    const focused = () =>
      map.getViewport().dispatchEvent(new Event('focusin', { bubbles: true }));
    return { cmp, focused, target };
  };

  it('makes a pane active when Tab moves focus onto its chart', () => {
    const { cmp, focused } = watched();

    cmp.onDocumentKey({ key: 'Tab' } as KeyboardEvent);
    focused();

    expect(cmp.split.activate).toHaveBeenCalledWith('secondary');
  });

  it('leaves the active pane when the app moves focus after a key or press', () => {
    const { cmp, focused } = watched();

    // Enter on a toolbar button, which then hands focus back to a chart.
    cmp.onDocumentKey({ key: 'Enter' } as KeyboardEvent);
    focused();
    cmp.onDocumentKey({ key: 'Tab' } as KeyboardEvent);
    cmp.onDocumentPress();
    focused();

    expect(cmp.split.activate).not.toHaveBeenCalled();
  });

  it('puts both charts in the tab order, named, while the split is open', () => {
    const cmp = bareComponent();
    const map = new OlMap();
    const target = document.createElement('div');
    target.tabIndex = -1;
    map.getTargetElement = () => target;

    const restore = cmp.nameChart(map, 'Main chart');
    expect(target.tabIndex).toBe(0);
    expect(target.getAttribute('aria-label')).toBe('Main chart');
    expect(target.getAttribute('role')).toBe('region');

    restore();
    expect(target.tabIndex).toBe(-1);
    expect(target.hasAttribute('aria-label')).toBe(false);
    expect(target.hasAttribute('role')).toBe(false);
  });
});

describe("SplitMapComponent: the pane's own view", () => {
  const moved = (follow: boolean, zoom: number, resizing = false) => {
    const cmp = bareComponent(follow);
    cmp.split.zoom = () => 12;
    cmp.split.rememberView = vi.fn();
    const map = new OlMap();
    map.set(RESIZING, resizing);
    cmp.onMoveEnd({ map, zoom, lonlat: [23.5, 60.1] });
    return cmp.split.rememberView;
  };

  it('remembers where the pane was left', () => {
    expect(moved(false, 12)).toHaveBeenCalledWith(12, [23.5, 60.1], true);
  });

  it('keeps a centre that moves with each fix while following, unwritten', () => {
    expect(moved(true, 12)).toHaveBeenCalledWith(12, [23.5, 60.1], false);
    // A new zoom is written down.
    expect(moved(true, 13)).toHaveBeenCalledWith(13, [23.5, 60.1], true);
  });

  it('keeps no view it only passes through while the divider is dragged', () => {
    expect(moved(false, 12, true)).not.toHaveBeenCalled();
  });

  it('reports the view it opened at, before the buttons can act on it', () => {
    // OL reports no move for a map's first frame, so the zoom readout would
    // show the main chart's zoom until the pane was first moved.
    const cmp = bareComponent();
    cmp.zoom.set(9);
    cmp.center.set([23.5, 60.1]);
    cmp.split.rememberView = vi.fn();
    cmp.split.setSecondaryMap = vi.fn();
    cmp.scaleUnits = () => '';
    cmp.stopUseWatch = [];
    cmp.footprint = signal(null);
    const pane = new OlMap();

    // The pane alone: no main chart to mirror.
    cmp.onMapReady({ map: pane, mapService: { getMaps: () => [pane] } });

    expect(cmp.split.rememberView).toHaveBeenCalledWith(9, [23.5, 60.1], false);
    expect(cmp.split.rememberView.mock.invocationCallOrder[0]).toBeLessThan(
      cmp.split.setSecondaryMap.mock.invocationCallOrder[0]
    );
    cmp.stopUseWatch.forEach((stop: () => void) => stop());
  });

  it('opens within the map zoom range, whatever was stored', () => {
    const cmp = bareComponent();
    cmp.app.data = { vessels: { active: { orientation: 0 } } };
    cmp.app.config = { map: { zoomLevel: 10, center: [23, 60] } };
    cmp.heading = signal(0);
    cmp.split.lastView = () => ({ zoom: 40, center: [23.5, 60.1] });
    cmp.skstream = { vessels$: () => new Subject() };
    cmp.split.commands$ = new Subject();

    cmp.ngOnInit();

    expect(cmp.zoom()).toBe(24);
  });

  it("draws its scale bar in the user's distance unit", () => {
    const cmp = bareComponent();
    const scale = new ScaleLine({ units: 'nautical' });
    cmp.map = new OlMap({ controls: [scale] });

    cmp.setScaleUnits('kilometer');

    expect(scale.getUnits()).toBe('metric');
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
      getCoordinateFromPixel: ([x, y]: number[]) => [3 * W + x + 10, 20 - y],
      getView: () => ({
        getCenter: () => [3 * W + 60, -5],
        getProjection: () => ({
          getExtent: () => [-W / 2, -W / 2, W / 2, W / 2]
        })
      })
    };

    cmp.updateFootprint();

    expect(cmp.footprint()[0]).toEqual([10, 20]);
    expect(cmp.footprint()[2]).toEqual([110, -30]);
  });
});

describe('SplitMapComponent: taps and the chart menu', () => {
  const pane = (interacting = false) => {
    const cmp = bareComponent();
    cmp.split.forwardTap = vi.fn();
    cmp.mapInteract = {
      isDrawing: () => interacting,
      isModifying: () => false,
      isMeasuring: () => false,
      isBoxSelecting: () => false
    };
    const map = new OlMap({ view: new View({ center: [0, 0], zoom: 9 }) });
    cmp.map = map;
    return { cmp, map };
  };

  it("hands a tap to the main chart, with the pane's map", () => {
    const { cmp, map } = pane();
    cmp.pressedAt = 123;

    cmp.onTap({ lonlat: [23.5, 60.1] });

    expect(cmp.split.forwardTap).toHaveBeenCalledWith({
      kind: 'click',
      event: { lonlat: [23.5, 60.1] },
      map,
      pressedAt: 123
    });
  });

  it('hands on nothing while drawing, measuring or editing', () => {
    const { cmp } = pane(true);
    cmp.onTap({ lonlat: [23.5, 60.1] });
    cmp.onContextMenu({ preventDefault: () => undefined } as MouseEvent);
    expect(cmp.split.forwardTap).not.toHaveBeenCalled();
  });

  it('opens the menu for the pressed point in data space, keeping its world copy', () => {
    const { cmp, map } = pane();
    // The pane looking at the world copy one east of the primary world.
    const at = [
      WORLD_WIDTH_3857 + fromLonLat([23.5, 60.1])[0],
      fromLonLat([23.5, 60.1])[1]
    ];
    map.getEventCoordinate = () => at;
    map.getEventPixel = () => [10, 20];
    map.getFeaturesAtPixel = () => [];
    const event = { preventDefault: vi.fn() } as unknown as MouseEvent;

    cmp.onContextMenu(event);

    const tap = cmp.split.forwardTap.mock.calls[0][0];
    expect(event.preventDefault).toHaveBeenCalled();
    expect(tap.kind).toBe('contextmenu');
    expect(tap.lonlat[0]).toBeCloseTo(23.5);
    expect(tap.lonlat[1]).toBeCloseTo(60.1);
    expect(tap.worldOffset).toBe(WORLD_WIDTH_3857);
    expect(tap.zoom).toBe(9);
    expect(tap.map).toBe(map);
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

// The pane's own effects, run by Angular as in the app; only the template,
// which needs a whole map, is left out.
describe('SplitMapComponent: what it follows and tells', () => {
  let vessel: { positionReceived: boolean; position?: Position };
  let announce: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    vessel = { positionReceived: false };
    announce = vi.fn();
    TestBed.overrideComponent(SplitMapComponent, {
      set: { template: '', imports: [] }
    });
    TestBed.configureTestingModule({
      imports: [SplitMapComponent],
      providers: [
        {
          provide: AppFacade,
          useValue: {
            MAP_ZOOM_EXTENT: { min: 2, max: 24 },
            config: { map: { zoomLevel: 10, center: [24, 60] } },
            data: { vessels: { active: vessel } }
          }
        },
        {
          provide: SKStreamFacade,
          useValue: { vessels$: () => new Subject() }
        },
        { provide: FBMapInteractService, useValue: {} },
        { provide: LiveAnnouncer, useValue: { announce } }
      ]
    });
  });

  afterEach(() => localStorage.removeItem(SPLIT_VIEW_STORAGE_KEY));

  const open = () => {
    const fixture = TestBed.createComponent(SplitMapComponent);
    fixture.detectChanges();
    const pane = fixture.componentInstance as unknown as {
      center: () => Position;
      map: OlMap;
    };
    return { fixture, pane, split: TestBed.inject(SplitViewService) };
  };

  it('tells a screen reader which chart the map buttons move to, but not as it opens', () => {
    TestBed.inject(SplitViewService).toggle();
    const { fixture, split } = open();
    expect(announce).not.toHaveBeenCalled();

    split.setSecondaryMap(new OlMap());
    fixture.detectChanges();
    expect(announce).toHaveBeenLastCalledWith('Second chart active');

    split.activate('main');
    fixture.detectChanges();
    expect(announce).toHaveBeenLastCalledWith('Main chart active');
    expect(announce).toHaveBeenCalledTimes(2);
  });

  it('centres on the vessel when set to follow it', () => {
    const { fixture, pane, split } = open();
    vessel.positionReceived = true;
    vessel.position = [23.5, 60.1];
    fixture.detectChanges();
    expect(pane.center()).toEqual([24, 60]);

    split.setFollow(true);
    fixture.detectChanges();

    expect(pane.center()).toEqual([23.5, 60.1]);
  });

  it("draws the scale bar in the user's distance unit", () => {
    const { fixture, pane } = open();
    const scale = new ScaleLine({ units: 'nautical' });
    pane.map = new OlMap({ controls: [scale] });

    fixture.componentRef.setInput('scaleUnits', 'kilometer');
    fixture.detectChanges();

    expect(scale.getUnits()).toBe('metric');
  });
});
