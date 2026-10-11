import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChangeDetectorRef, ElementRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fromLonLat } from 'ol/proj';

import { FBMapComponent } from './fb-map.component';
import { FBPointerDownEvent, MapComponent } from './ol/lib/map.component';
import { MapService } from './ol/lib/map.service';

// onMapPointerDown is exercised on a bare prototype instance: the component's
// constructor wires up a dozen injected services none of which this handler
// touches, and a TestBed fixture would import the whole map template graph.
const bareComponent = () => {
  const cmp = Object.create(FBMapComponent.prototype);
  cmp.mouse = signal({ coords: [0, 0] });
  cmp.contextMenuPosition = { x: '0px', y: '0px' };
  return cmp;
};

// The ol-map MapComponent with just enough of an OL map behind it for its
// viewport `pointerdown` handler to run. Built in an injection context rather
// than as a fixture so ngOnInit never creates a real OL map.
const olMapComponent = () => {
  TestBed.configureTestingModule({
    providers: [
      { provide: ChangeDetectorRef, useValue: { detach: () => undefined } },
      { provide: ElementRef, useValue: new ElementRef(null) },
      { provide: MapService, useValue: { clearFeatureUrls: () => undefined } }
    ]
  });
  const cmp = TestBed.runInInjectionContext(() => new MapComponent());
  const props = new Map<string, unknown>();
  Object.assign(cmp, {
    map: {
      get: (k: string) => props.get(k),
      set: (k: string, v: unknown) => props.set(k, v),
      getInteractions: () => ({ getArray: () => [] }),
      getEventCoordinate: () => fromLonLat([-80.1, 25.7]),
      getEventPixel: () => [120, 45],
      getView: () => ({
        getProjection: () => ({
          getExtent: () => [
            -20037508.34, -20037508.34, 20037508.34, 20037508.34
          ]
        })
      })
    }
  });
  return cmp;
};

describe('FBMapComponent.onMapPointerDown', () => {
  let ol: MapComponent;

  afterEach(() => {
    // Drop the long-press timer the press scheduled.
    (ol as unknown as { clearTouchTimer: () => void })?.clearTouchTimer();
  });

  it('anchors the context menu at the position of the press ol-map emits', () => {
    // ol-map emits a map press straight from a DOM `pointerdown` listener, so
    // the event has clientX/clientY of its own and no OL `originalEvent`.
    // Reading `originalEvent.clientX` threw on every press.
    ol = olMapComponent();
    let emitted: FBPointerDownEvent;
    ol.mapPointerDown.subscribe((e) => (emitted = e));

    (
      ol as unknown as { pointerDownHandler: (e: Event) => void }
    ).pointerDownHandler(
      new MouseEvent('pointerdown', { clientX: 120, clientY: 45 })
    );

    const cmp = bareComponent();
    expect(() => cmp.onMapPointerDown(emitted)).not.toThrow();
    expect(cmp.contextMenuPosition).toEqual({ x: '120px', y: '45px' });
    const [lon, lat] = cmp.mouse().coords;
    expect(lon).toBeCloseTo(-80.1);
    expect(lat).toBeCloseTo(25.7);
  });
});

describe('FBMapComponent long-press before any pointer move (#979)', () => {
  let ol: MapComponent;
  let backdrop: HTMLElement;

  afterEach(() => {
    (ol as unknown as { clearTouchTimer: () => void })?.clearTouchTimer();
    backdrop?.remove();
  });

  it('opens the chart menu when the first gesture is a long-press', () => {
    // A finger raises no pointer moves until it drags, so on a fresh load the
    // press is the only position the component has seen.
    ol = olMapComponent();
    let emitted: FBPointerDownEvent;
    ol.mapPointerDown.subscribe((e) => (emitted = e));
    (
      ol as unknown as { pointerDownHandler: (e: Event) => void }
    ).pointerDownHandler(
      new MouseEvent('pointerdown', { clientX: 120, clientY: 45 })
    );

    const cmp = bareComponent();
    cmp.mouse = signal({ pixel: null, coords: [0, 0], xy: null });
    const openMenu = vi.fn();
    Object.assign(cmp, {
      app: {
        debug: () => undefined,
        data: { map: { atClick: null } },
        uiCtrl: () => ({ suppressContextMenu: false })
      },
      overlay: () => ({ show: false }),
      plotterExt: { addableCellAt: () => null },
      mapInteract: { isMeasuring: () => false },
      modifyMode: false,
      contextMenu: { menuData: null, openMenu, closeMenu: () => undefined }
    });
    // openMenu() would create the overlay backdrop the handler then listens on.
    backdrop = document.createElement('div');
    backdrop.className = 'cdk-overlay-backdrop';
    document.body.appendChild(backdrop);

    cmp.onMapPointerDown(emitted);
    cmp.onContextMenu(
      new MouseEvent('contextmenu', { clientX: 120, clientY: 45 })
    );

    expect(openMenu).toHaveBeenCalledOnce();
    const [lon, lat] = cmp.contextMenu.menuData.item;
    expect(lon).toBeCloseTo(-80.1);
    expect(lat).toBeCloseTo(25.7);
  });
});
