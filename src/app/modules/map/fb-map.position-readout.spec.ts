import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fromLonLat } from 'ol/proj';

import { FBMapComponent } from './fb-map.component';
import {
  FBMapEvent,
  FBPointerDownEvent,
  FBPointerEvent
} from './ol/lib/map.component';
import { CursorPin, MOUSE_REST_MS } from './cursor-marker';
import { Position } from 'src/app/types';

// A bare prototype instance, as in fb-map.split-zoom.spec.ts: only what the
// map-ready, move-end, pointer and follow-mode handlers touch is stubbed.
const bareComponent = () => {
  const cmp = Object.create(FBMapComponent.prototype);
  cmp.mouse = signal({ pixel: null, coords: [0, 0], xy: null });
  // Object.create() skips the field initialisers.
  cmp.readoutOnPointer = false;
  cmp.pointerResting = false;
  cmp.pointerType = 'mouse';
  cmp.cursorHidden = signal(false);
  cmp.cursorInfo = signal(null);
  cmp.cursorPin = new CursorPin(() => cmp.onPinExpired());
  cmp.contextMenuPosition = { x: '', y: '' };
  cmp.app = {
    config: {
      map: { zoomLevel: 10, center: [0, 0] },
      display: { statusBar: { tapFadeSpeed: 2 } }
    },
    data: { vessels: { self: { positionReceived: true, position: VESSEL } } },
    mapZoom: signal(10),
    mapExtent: signal([]),
    mapViewTopCenter: signal([0, 0]),
    mapViewRightCenter: signal([0, 0]),
    mapViewRotation: signal(0),
    saveConfigDebounced: vi.fn()
  };
  cmp.skstream = { postMapView: vi.fn() };
  cmp.trackHistory = { setView: vi.fn() };
  cmp.refollow = { reset: vi.fn(), cancel: vi.fn() };
  cmp.startSaveTimer = vi.fn();
  cmp.startOffsetGrace = vi.fn();
  cmp.drawVesselLines = vi.fn();
  cmp.renderMapContents = vi.fn();
  cmp.updateCursorInfo = vi.fn();
  cmp.modal = false;
  cmp.mapInteract = {
    pick: () => null,
    isDrawing: () => cmp.modal,
    isMeasuring: () => false,
    isModifying: () => false,
    isBoxSelecting: () => false
  };
  cmp.zoneEdit = { edit: (): null => null };
  return cmp;
};

// The vessel, and a chart centre a vessel offset has moved off it.
const VESSEL: Position = [-80.1, 25.7];
const OFFSET_CENTRE: Position = [-80.0, 25.8];

const mouseMove = (lonlat: Position) =>
  ({
    pixel: [10, 20],
    coordinate: [0, 0],
    lonlat,
    originalEvent: { pointerType: 'mouse' }
  }) as unknown as FBPointerEvent;

const touchDown = (lonlat: Position) =>
  ({
    pointerType: 'touch',
    pixel: [10, 20],
    coordinate: [0, 0],
    lonlat,
    clientX: 10,
    clientY: 20
  }) as unknown as FBPointerDownEvent;

const moveEnd = (lonlat: Position) =>
  ({ zoom: 10, lonlat, extent: [] }) as unknown as FBMapEvent;

// Every pointer arms the rest timer; keep it from firing into a later test.
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('FBMapComponent: position readout', () => {
  it('shows the restored chart centre as soon as the map is ready', () => {
    // An untouched reload: no move-end may have reached the component yet.
    const cmp = bareComponent();
    cmp.olMap = {
      getMap: () => ({
        getView: () => ({
          getZoom: () => 10,
          getCenter: () => fromLonLat([178.4, -18.1])
        })
      }),
      getMapExtent: (): number[] => []
    };

    cmp.onMapReady();

    const [lon, lat] = cmp.mouse().coords;
    expect(lon).toBeCloseTo(178.4);
    expect(lat).toBeCloseTo(-18.1);
  });

  it('shows the chart centre before any pointer has been over the chart', () => {
    // A cold load on a touch screen: the view is restored and drawn, but no
    // finger has touched the chart yet.
    const cmp = bareComponent();

    cmp.onMapMoveEnd(moveEnd([178.4, -18.1]));

    expect(cmp.mouse().coords).toEqual([178.4, -18.1]);
  });

  it('keeps showing the pointer once one has been over the chart', () => {
    const cmp = bareComponent();
    cmp.onMapPointerMove({
      pixel: [10, 20],
      coordinate: [0, 0],
      lonlat: [5, 50]
    } as unknown as FBPointerEvent);

    cmp.onMapMoveEnd(moveEnd([178.4, -18.1]));

    expect(cmp.mouse().coords).toEqual([5, 50]);
  });

  it('shows a tap on the split view second pane, and keeps it', () => {
    // A finger raises no pointer move before it taps, on either pane.
    const cmp = bareComponent();
    cmp.contextMenuContent = (): null => null;

    cmp.onSecondaryTap({ kind: 'contextmenu', lonlat: [5, 50], event: {} });
    cmp.onMapMoveEnd(moveEnd([178.4, -18.1]));

    expect(cmp.mouse().coords).toEqual([5, 50]);
  });
});

describe('FBMapComponent: position readout while following the vessel (#1203)', () => {
  const following = () => {
    const cmp = bareComponent();
    cmp.movingMap = true;
    return cmp;
  };

  it('shows the vessel, not a chart centre the vessel offset moved off it', () => {
    const cmp = following();

    cmp.onMapMoveEnd(moveEnd(OFFSET_CENTRE));

    expect(cmp.mouse().coords).toEqual(VESSEL);
  });

  it('hands a resting mouse back to the vessel, and keeps following it', () => {
    const cmp = following();
    cmp.cursorInfo.set({ bearing: 1, distance: 2, timeToGo: null });
    cmp.onMapPointerMove(mouseMove([5, 50]));

    vi.advanceTimersByTime(MOUSE_REST_MS - 1);
    expect(cmp.mouse().coords).toEqual([5, 50]);
    expect(cmp.cursorHidden()).toBe(false);

    vi.advanceTimersByTime(1);
    expect(cmp.mouse().coords).toEqual(VESSEL);
    expect(cmp.cursorInfo()).toBeNull();
    expect(cmp.cursorHidden()).toBe(true);

    // The vessel moves on, and the chart with it.
    cmp.app.data.vessels.self.position = [-80.2, 25.6];
    cmp.onMapMoveEnd(moveEnd(OFFSET_CENTRE));
    expect(cmp.mouse().coords).toEqual([-80.2, 25.6]);
  });

  it('shows the mouse and its position again once it moves', () => {
    const cmp = following();
    cmp.onMapPointerMove(mouseMove([5, 50]));
    vi.advanceTimersByTime(MOUSE_REST_MS);

    cmp.onMapPointerMove(mouseMove([6, 51]));

    expect(cmp.cursorHidden()).toBe(false);
    expect(cmp.mouse().coords).toEqual([6, 51]);
    cmp.onMapMoveEnd(moveEnd(OFFSET_CENTRE));
    expect(cmp.mouse().coords).toEqual([6, 51]);
  });

  it('hands a tap back once its pinned readout has faded, not before', () => {
    const cmp = following();
    cmp.onMapPointerDown(touchDown([5, 50]));
    // The pin lands on singleclick, after OpenLayers' double-tap wait.
    vi.advanceTimersByTime(250);
    cmp.cursorPin.pin([5, 50], 0, 2000);

    vi.advanceTimersByTime(1999);
    expect(cmp.mouse().coords).toEqual([5, 50]);

    vi.advanceTimersByTime(1);
    expect(cmp.mouse().coords).toEqual(VESSEL);
    // A finger leaves no cursor to hide.
    expect(cmp.cursorHidden()).toBe(false);
  });

  it('hands a plain tap back after the fade time when nothing is pinned', () => {
    const cmp = following();
    cmp.onMapPointerDown(touchDown([5, 50]));

    vi.advanceTimersByTime(2000);

    expect(cmp.mouse().coords).toEqual(VESSEL);
  });

  it('waits for a pin that outlasts the mouse rest', () => {
    const cmp = following();
    cmp.onMapPointerMove(mouseMove([5, 50]));
    cmp.cursorPin.pin([5, 50], 0, MOUSE_REST_MS + 5000);

    vi.advanceTimersByTime(MOUSE_REST_MS);
    expect(cmp.mouse().coords).toEqual([5, 50]);

    vi.advanceTimersByTime(5000);
    expect(cmp.mouse().coords).toEqual(VESSEL);
  });

  it('leaves a resting pointer on the readout while not following', () => {
    const cmp = bareComponent();
    cmp.onMapPointerMove(mouseMove([5, 50]));

    vi.advanceTimersByTime(MOUSE_REST_MS);

    expect(cmp.mouse().coords).toEqual([5, 50]);
    expect(cmp.cursorHidden()).toBe(false);
  });

  it('keeps the readout and cursor while drawing, until the drawing ends', () => {
    const cmp = following();
    cmp.modal = true;
    cmp.onMapPointerMove(mouseMove([5, 50]));

    vi.advanceTimersByTime(MOUSE_REST_MS * 3);
    expect(cmp.mouse().coords).toEqual([5, 50]);
    expect(cmp.cursorHidden()).toBe(false);

    // Finished from the toolbar or a key: the pointer never moved.
    cmp.modal = false;
    vi.advanceTimersByTime(MOUSE_REST_MS);
    expect(cmp.mouse().coords).toEqual(VESSEL);
    expect(cmp.cursorHidden()).toBe(true);
  });

  it('keeps the readout and cursor when following starts mid-drawing', () => {
    const cmp = bareComponent();
    cmp.modal = true;
    cmp.onMapPointerMove(mouseMove([5, 50]));
    vi.advanceTimersByTime(MOUSE_REST_MS);

    cmp.movingMap = true;
    cmp.ngOnChanges({
      movingMap: { currentValue: true, firstChange: false }
    });
    expect(cmp.mouse().coords).toEqual([5, 50]);
    expect(cmp.cursorHidden()).toBe(false);

    cmp.modal = false;
    vi.advanceTimersByTime(MOUSE_REST_MS);
    expect(cmp.mouse().coords).toEqual(VESSEL);
  });

  it('leaves a live bearing alone when a pane whose pin lapsed closes', () => {
    const cmp = following();
    cmp.popoverMap = signal(undefined);
    cmp.bearingMap = signal(undefined);
    cmp.pinMap = signal({});
    cmp.onMapPointerMove(mouseMove([5, 50]));
    const live = { bearing: 1, distance: 2, timeToGo: null };
    cmp.cursorInfo.set(live);

    cmp.onPaneChanged(null);

    expect(cmp.cursorInfo()).toBe(live);
  });

  it('shows the mouse again when following stops', () => {
    const cmp = following();
    cmp.onMapPointerMove(mouseMove([5, 50]));
    vi.advanceTimersByTime(MOUSE_REST_MS);
    cmp.stopSaveTimer = vi.fn();
    cmp.stopOffsetGrace = vi.fn();

    cmp.movingMap = false;
    cmp.ngOnChanges({
      movingMap: { currentValue: false, firstChange: false }
    });

    expect(cmp.cursorHidden()).toBe(false);
  });

  it('hands a tap on the second pane back after its fade, by its pointer type', () => {
    const cmp = following();

    cmp.onSecondaryPointer([5, 50], 'touch');
    vi.advanceTimersByTime(2000);

    expect(cmp.mouse().coords).toEqual(VESSEL);
  });

  it('hands a tap back when the pane it is pinned on closes', () => {
    const cmp = following();
    const pane = {};
    cmp.popoverMap = signal(undefined);
    cmp.bearingMap = signal(undefined);
    cmp.pinMap = signal(pane);
    cmp.onSecondaryPointer([5, 50], 'touch');
    vi.advanceTimersByTime(250);
    cmp.cursorPin.pin([5, 50], 0, 2000);
    cmp.cursorInfo.set({ bearing: 1, distance: 2, timeToGo: null });
    // The rest time runs out while the pin still holds the readout.
    vi.advanceTimersByTime(1800);

    cmp.onPaneChanged(null);

    expect(cmp.mouse().coords).toEqual(VESSEL);
    expect(cmp.cursorInfo()).toBeNull();
  });

  it('hands an already resting pointer back when following starts', () => {
    const cmp = bareComponent();
    cmp.onMapPointerMove(mouseMove([5, 50]));
    vi.advanceTimersByTime(MOUSE_REST_MS);

    cmp.movingMap = true;
    cmp.ngOnChanges({
      movingMap: { currentValue: true, firstChange: false }
    });

    expect(cmp.mouse().coords).toEqual(VESSEL);
  });
});
