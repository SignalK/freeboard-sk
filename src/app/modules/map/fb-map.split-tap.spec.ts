import { signal } from '@angular/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Collection, Feature, Map as OlMap } from 'ol';
import { LineString } from 'ol/geom';
import { fromLonLat } from 'ol/proj';

import { FBMapComponent } from './fb-map.component';
import { WORLD_WIDTH_3857 } from './route-extend';

// A bare prototype instance, as in fb-map.zone-edit-click.spec.ts: the tap
// handlers read a few services, and a TestBed fixture would import the whole map.
const bareComponent = (secondPane: OlMap | null) => {
  const cmp = Object.create(FBMapComponent.prototype);
  cmp.app = {
    data: { map: {} },
    config: { map: { popoverMulti: false }, display: { statusBar: {} } },
    uiCtrl: () => ({ suppressContextMenu: false }),
    debug: () => undefined
  };
  cmp.mapInteract = {
    isMeasuring: () => false,
    isDrawing: () => false,
    isModifying: () => false,
    draw: { features: new Collection(), forSave: {} }
  };
  cmp.s57Features = {};
  cmp.zoneEdit = { edit: () => undefined };
  cmp.overlay = signal({ show: false });
  cmp.popoverMap = signal(undefined);
  cmp.pinMap = signal(undefined);
  cmp.bearingMap = signal(undefined);
  cmp.menuZoom = signal(0);
  cmp.splitView = { secondaryMap: signal(secondPane) };
  // Stands in for a tap on a feature: it opens that feature's popover.
  cmp.processMapClick = vi.fn(() => cmp.formatPopover('s57.x', [23.5, 60.1]));
  cmp.pinCursorAtTap = vi.fn();
  return cmp;
};

const tap = { features: [], lonlat: [23.5, 60.1], worldOffset: 0 };
const paneTap = (map: OlMap, event = tap) => ({
  kind: 'click',
  event,
  map,
  pressedAt: Date.now()
});

describe('FBMapComponent: taps on the split view second pane', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('handles the tap as its own and opens the popover in that pane', () => {
    const pane = new OlMap();
    const cmp = bareComponent(pane);

    cmp.onSecondaryTap(paneTap(pane));

    expect(cmp.processMapClick).toHaveBeenCalledWith(tap);
    expect(cmp.popoverPane()).toBe(pane);
  });

  it('opens popovers on the main chart again after a tap there', () => {
    const pane = new OlMap();
    const cmp = bareComponent(pane);
    cmp.onSecondaryTap(paneTap(pane));

    cmp.onMapSingleClick(tap);

    expect(cmp.popoverPane()).toBeUndefined();
  });

  it('keeps an open popover in its pane when a tap opens nothing', () => {
    const pane = new OlMap();
    const cmp = bareComponent(pane);
    cmp.app.config.map.popoverMulti = true;
    cmp.onSecondaryTap(paneTap(pane));
    // A tap in open water on the main chart opens no popover.
    cmp.processMapClick = vi.fn();

    cmp.onMapSingleClick(tap);

    expect(cmp.popoverPane()).toBe(pane);
  });

  it('opens popovers on the main chart again once the pane has closed', () => {
    const pane = new OlMap();
    const cmp = bareComponent(pane);
    cmp.onSecondaryTap(paneTap(pane));

    cmp.splitView.secondaryMap.set(null);

    expect(cmp.popoverPane()).toBeUndefined();
  });

  it('times the tap from the press on the pane', () => {
    const pane = new OlMap();
    const cmp = bareComponent(pane);
    cmp.pointerDownAt = 0;

    cmp.onSecondaryTap({ ...paneTap(pane), pressedAt: 12345 });

    expect(cmp.pointerDownAt).toBe(12345);
  });

  it('opens the chart menu for the pressed point, wherever the pointer was', () => {
    const pane = new OlMap();
    const cmp = bareComponent(pane);
    cmp.mouse = signal({ pixel: null, coords: [0, 0], xy: null });
    cmp.contextMenu = { openMenu: vi.fn(), closeMenu: vi.fn(), menuData: null };
    cmp.contextMenuPosition = { x: '0px', y: '0px' };
    cmp.plotterExt = { addableCellAt: () => null };
    cmp.modifyMode = false;
    const backdrop = document.createElement('div');
    backdrop.className = 'cdk-overlay-backdrop';
    document.body.appendChild(backdrop);
    const event = { clientX: 300, clientY: 200, preventDefault: vi.fn() };

    cmp.onSecondaryTap({
      kind: 'contextmenu',
      event,
      features: [],
      lonlat: [23.5, 60.1],
      worldOffset: 0,
      map: pane,
      zoom: 15
    });

    expect(cmp.contextMenu.openMenu).toHaveBeenCalled();
    // "Add Note here" goes by the zoom of the pane the menu opened on.
    expect(cmp.menuZoom()).toBe(15);
    expect(cmp.contextMenu.menuData).toEqual({ item: [23.5, 60.1] });
    expect(cmp.contextMenuPosition).toEqual({ x: '300px', y: '200px' });
    expect(cmp.app.data.map.atClick.lonlat).toEqual([23.5, 60.1]);
  });

  it('shows a Bearing & Distance from the pane menu in that pane', () => {
    const pane = new OlMap();
    const cmp = bareComponent(pane);
    cmp.mapInteract.showBearingDistanceFromVessel = vi.fn();
    cmp.onMapRightClick(tap, pane);

    cmp.onContextMenuAction('bearing_dist', [23.5, 60.1]);

    expect(cmp.bearingPane()).toBe(pane);
  });
});

describe('FBMapComponent: Modify picked on the second pane', () => {
  // A route around 23.5E, picked in the pane's copy of the world one to the east.
  const route = () =>
    new Feature(
      new LineString([fromLonLat([23.4, 60.1]), fromLonLat([23.6, 60.1])])
    );
  const editable = (pane: OlMap, worldOffset: number) => {
    const cmp = bareComponent(pane);
    const feature = route();
    cmp.mapInteract.draw = {
      features: new Collection([feature]),
      forSave: {}
    };
    cmp.mapInteract.startModifying = vi.fn();
    cmp.routeBuffers = { has: () => false };
    cmp.mapCenterPositon = signal([0, 0]);
    cmp.movingMap = false;
    cmp.onSecondaryTap(paneTap(pane, { ...tap, worldOffset }));
    cmp.overlay.set({ show: true, position: [23.5, 60.1], type: 'waypoint' });
    return { cmp, feature };
  };

  it('brings the main chart to the feature', () => {
    const { cmp } = editable(new OlMap(), 0);

    cmp.modifyFeature();

    expect(cmp.mapCenterPositon()).toEqual([23.5, 60.1]);
  });

  it('edits in the primary world, where the main chart is centred', () => {
    const { cmp, feature } = editable(new OlMap(), WORLD_WIDTH_3857);
    const before = feature.getGeometry().getExtent();

    cmp.modifyFeature();

    expect(feature.getGeometry().getExtent()).toEqual(before);
  });

  it('centres on the tapped point for a feature with no popover', () => {
    const pane = new OlMap();
    const { cmp } = editable(pane, 0);
    cmp.overlay.set({ show: false, position: [0, 0] });

    cmp.modifyFeature('anchor', [23.55, 60.12]);

    expect(cmp.mapCenterPositon()).toEqual([23.55, 60.12]);
  });
});

describe('FBMapComponent: layers shown from some zoom on, with the chart split', () => {
  it('keeps the notes layer while either pane is zoomed in for notes', () => {
    const cmp = bareComponent(new OlMap());
    cmp.app.config.ui = { showNotes: true };
    cmp.app.config.resources = { notes: { minZoom: 12 } };

    cmp.paneZoomMax = () => 13;
    expect(cmp.notesShown()).toBe(true);
    cmp.paneZoomMax = () => 11;
    expect(cmp.notesShown()).toBe(false);
  });

  it('hides such a layer below its zoom on each map, that zoom included', () => {
    const cmp = bareComponent(null);
    cmp.zoomGates = new Map();

    const gate = cmp.shownFrom(12);

    expect(gate.minZoom).toBeLessThan(12);
    expect(gate.minZoom).toBeGreaterThan(11.99);
    // The same object every time, so the layer is not updated on every check.
    expect(cmp.shownFrom(12)).toBe(gate);
  });
});

describe('FBMapComponent: the position readout with the split view open', () => {
  it('follows the pointer over the second pane, keeping its own for the menu', () => {
    const cmp = bareComponent(new OlMap());
    cmp.mouse = signal({ pixel: [10, 20], xy: [1000, 2000], coords: [23, 60] });

    // a pointer over a world copy east of the primary world
    cmp.onSecondaryPointer([383.5, 60.1]);

    expect(cmp.mouse()).toEqual({
      pixel: [10, 20],
      xy: [1000, 2000],
      coords: [23.5, 60.1]
    });
  });
});
