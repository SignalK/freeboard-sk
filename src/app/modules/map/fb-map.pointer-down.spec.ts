import { afterEach, describe, expect, it } from 'vitest';
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
