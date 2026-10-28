import { signal } from '@angular/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Collection, Feature } from 'ol';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { FeatureLike } from 'ol/Feature';

import { FBMapComponent } from './fb-map.component';
import { SKWaypoint } from '../skresources/resource-classes';
import type { SelectedTarget } from '../plotterext/actions';

const waypoint = new SKWaypoint({
  name: 'Fuel dock',
  feature: {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-80.12, 25.77] },
    properties: {}
  }
} as never);

// One extension action per target kind, standing in for the plotterext
// service: the menu only needs to know what applies.
const actionFor = (kind: string) => ({
  extension: 'dr',
  extensionName: 'Dead Reckoning',
  action: { id: `${kind}-act`, title: `${kind} action` },
  rules: [{ kind }]
});

// A bare prototype instance, as in fb-map.split-tap.spec.ts.
const bareComponent = (offered: string[]) => {
  const cmp = Object.create(FBMapComponent.prototype);
  cmp.app = {
    data: { map: {}, atons: new Map() },
    config: { map: { popoverMulti: false }, display: { statusBar: {} } },
    uiCtrl: signal({ suppressContextMenu: false }),
    debug: (): void => undefined,
    useInfoPanel: () => false
  };
  cmp.mapInteract = {
    pick: (): null => null,
    isMeasuring: () => false,
    isDrawing: () => false,
    isModifying: () => false,
    isBoxSelecting: () => false,
    draw: { features: new Collection(), forSave: {} }
  };
  cmp.zoneEdit = { edit: (): null => null };
  cmp.overlay = signal({ show: false });
  cmp.pointerType = 'mouse';
  cmp.cursorHidden = signal(false);
  cmp.popoverMap = signal(undefined);
  cmp.menuZoom = signal(0);
  cmp.mapZoomLevel = signal(10);
  cmp.modifyMode = false;
  cmp.mouse = signal({ pixel: [10, 10], coords: [-80.11, 25.76], xy: [1, 1] });
  cmp.updateCursorInfo = vi.fn();
  cmp.contextMenu = { openMenu: vi.fn(), closeMenu: vi.fn(), menuData: null };
  cmp.contextMenuPosition = { x: '0px', y: '0px' };
  cmp.infoPanel = { opened: () => false };
  cmp.s57Features = {};
  cmp.s57FeatureLikes = {};
  cmp.skres = {
    fromCache: (type: string, id: string) =>
      type === 'waypoints' && id === 'w1' ? ['w1', waypoint] : undefined
  };
  cmp.routeBuffers = { get: (): undefined => undefined };
  cmp.dfeat = { self: { name: 'Self', position: [0, 0] }, ais: new Map() };
  cmp.plotterExt = {
    addableCellAt: (): null => null,
    actionsFor: (sel: SelectedTarget) =>
      offered.includes(sel.target.kind) ? [actionFor(sel.target.kind)] : []
  };
  const backdrop = document.createElement('div');
  backdrop.className = 'cdk-overlay-backdrop';
  document.body.appendChild(backdrop);
  return cmp;
};

const menuEvent = () =>
  ({
    clientX: 300,
    clientY: 200,
    preventDefault: vi.fn()
  }) as unknown as MouseEvent;

const rightClickOn = (
  cmp: ReturnType<typeof bareComponent>,
  features: FeatureLike[]
) => {
  cmp.onMapRightClick({ features, lonlat: [-80.11, 25.76], worldOffset: 0 });
  cmp.onContextMenu(menuEvent());
};

const wptFeature = () => {
  const f = new Feature(new Point(fromLonLat([-80.12, 25.77])));
  f.setId('waypoint.w1');
  return f;
};

describe('FBMapComponent: extension actions in the chart menu', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('adds position actions after Freeboard’s own items', () => {
    const cmp = bareComponent(['position']);
    rightClickOn(cmp, []);
    const data = cmp.contextMenu.menuData;
    expect(cmp.contextMenu.openMenu).toHaveBeenCalled();
    expect(data.host).toBe(true);
    expect(data.ext).toHaveLength(1);
    expect(data.ext[0].target.target).toEqual({
      kind: 'position',
      position: [-80.11, 25.76]
    });
    expect(data.ext[0].target.label).toBe('This position');
  });

  it('offers a feature’s actions on a right-click on it, before the position’s', () => {
    const cmp = bareComponent(['position', 'waypoint']);
    rightClickOn(cmp, [wptFeature()]);
    const groups = cmp.contextMenu.menuData.ext;
    expect(
      groups.map((g: { target: SelectedTarget }) => g.target.target.kind)
    ).toEqual(['waypoint', 'position']);
    expect(groups[0].target.label).toBe('Fuel dock');
  });

  it('opens a menu of extension actions alone in kiosk mode', () => {
    const cmp = bareComponent(['position']);
    cmp.app.uiCtrl.set({ suppressContextMenu: true });
    rightClickOn(cmp, []);
    expect(cmp.contextMenu.openMenu).toHaveBeenCalled();
    expect(cmp.contextMenu.menuData.host).toBe(false);
    expect(cmp.contextMenu.menuData.ext).toHaveLength(1);
  });

  it('opens a menu of extension actions alone over an open popover', () => {
    const cmp = bareComponent(['position']);
    cmp.overlay.set({ show: true });
    rightClickOn(cmp, []);
    expect(cmp.contextMenu.openMenu).toHaveBeenCalled();
    expect(cmp.contextMenu.menuData.host).toBe(false);
  });

  it('opens no menu in kiosk mode when no extension action applies', () => {
    const cmp = bareComponent([]);
    cmp.app.uiCtrl.set({ suppressContextMenu: true });
    rightClickOn(cmp, []);
    expect(cmp.contextMenu.openMenu).not.toHaveBeenCalled();
  });

  it('offers nothing while drawing, measuring, modifying or box-selecting', () => {
    for (const mode of [
      'isDrawing',
      'isModifying',
      'isMeasuring',
      'isBoxSelecting'
    ]) {
      const cmp = bareComponent(['position']);
      cmp.mapInteract[mode] = () => true;
      // as the interaction service does when one of them starts
      cmp.app.uiCtrl.set({ suppressContextMenu: true });
      cmp.onContextMenu(menuEvent());
      expect(cmp.contextMenu.openMenu).not.toHaveBeenCalled();
    }
  });

  it('keeps Freeboard’s own items, without extension actions, in a guard zone edit', () => {
    const cmp = bareComponent(['position']);
    cmp.zoneEdit = { edit: () => ({}) };
    cmp.onContextMenu(menuEvent());
    expect(cmp.contextMenu.openMenu).toHaveBeenCalled();
    expect(cmp.contextMenu.menuData.host).toBe(true);
    expect(cmp.contextMenu.menuData.ext).toEqual([]);
  });

  it('opens the pane menu with only extension actions over a popover', () => {
    const cmp = bareComponent(['position']);
    cmp.overlay.set({ show: true });
    cmp.onSecondaryTap({
      kind: 'contextmenu',
      event: menuEvent(),
      features: [wptFeature()],
      lonlat: [279.89, 25.76],
      worldOffset: 0,
      map: {},
      zoom: 12
    });
    expect(cmp.contextMenu.openMenu).toHaveBeenCalled();
    const position = cmp.contextMenu.menuData.ext[0].target.target.position;
    // the target is canonical, whichever world copy the pane showed
    expect(position[0]).toBeCloseTo(-80.11);
  });

  it('gives a feature popover the target its extension actions apply to', () => {
    const cmp = bareComponent([]);
    cmp.showPopover = (po: unknown) => cmp.overlay.set(po);
    cmp.formatPopover('waypoint.w1', [-80.11, 25.76]);
    expect(cmp.overlay().target?.target).toMatchObject({
      kind: 'waypoint',
      id: 'w1',
      featurePosition: [-80.12, 25.77]
    });
  });
});
