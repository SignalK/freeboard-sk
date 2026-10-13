import { signal } from '@angular/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Map as OlMap } from 'ol';

import { FBMapComponent } from './fb-map.component';

// A bare prototype instance, as in fb-map.zone-edit-click.spec.ts: the tap
// handlers read a few services, and a TestBed fixture would import the whole map.
const bareComponent = (secondPane: OlMap | null) => {
  const cmp = Object.create(FBMapComponent.prototype);
  cmp.app = {
    data: { map: {} },
    config: { map: { popoverMulti: false } },
    uiCtrl: () => ({ suppressContextMenu: false }),
    debug: () => undefined
  };
  cmp.mapInteract = {
    isMeasuring: () => false,
    isDrawing: () => false,
    isModifying: () => false
  };
  cmp.zoneEdit = { edit: () => undefined };
  cmp.overlay = signal({ show: false });
  cmp.tapMap = signal(undefined);
  cmp.splitView = { secondaryMap: signal(secondPane) };
  cmp.processMapClick = vi.fn();
  cmp.pinCursorAtTap = vi.fn();
  return cmp;
};

const tap = { features: [], lonlat: [23.5, 60.1], worldOffset: 0 };

describe('FBMapComponent: taps on the split view second pane', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('handles the tap as its own and opens the popover in that pane', () => {
    const pane = new OlMap();
    const cmp = bareComponent(pane);

    cmp.onSecondaryTap({ kind: 'click', event: tap, map: pane });

    expect(cmp.processMapClick).toHaveBeenCalledWith(tap);
    expect(cmp.tapPane()).toBe(pane);
  });

  it('opens popovers on the main chart again after a tap there', () => {
    const pane = new OlMap();
    const cmp = bareComponent(pane);
    cmp.onSecondaryTap({ kind: 'click', event: tap, map: pane });

    cmp.onMapSingleClick(tap);

    expect(cmp.tapPane()).toBeUndefined();
  });

  it('opens popovers on the main chart again once the pane has closed', () => {
    const pane = new OlMap();
    const cmp = bareComponent(pane);
    cmp.onSecondaryTap({ kind: 'click', event: tap, map: pane });

    cmp.splitView.secondaryMap.set(null);

    expect(cmp.tapPane()).toBeUndefined();
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
      map: pane
    });

    expect(cmp.contextMenu.openMenu).toHaveBeenCalled();
    expect(cmp.contextMenu.menuData).toEqual({ item: [23.5, 60.1] });
    expect(cmp.contextMenuPosition).toEqual({ x: '300px', y: '200px' });
    expect(cmp.app.data.map.atClick.lonlat).toEqual([23.5, 60.1]);
  });
});
