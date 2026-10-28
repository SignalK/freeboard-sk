import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ChangeDetectorRef,
  ElementRef,
  Injector,
  NgZone,
  runInInjectionContext
} from '@angular/core';
import { Map, MapBrowserEvent, View } from 'ol';
import { MapComponent } from './map.component';
import { MapService } from './map.service';

const zone = {
  run: <T>(fn: () => T) => fn(),
  runOutsideAngular: <T>(fn: () => T) => fn()
};

type ClickHandlers = {
  emitClickEvent: (e: MapBrowserEvent) => void;
  emitDblClickEvent: (e: MapBrowserEvent) => void;
};

function mapComponent(map: Map): MapComponent {
  const injector = Injector.create({
    providers: [
      { provide: ChangeDetectorRef, useValue: { detach: () => undefined } },
      {
        provide: ElementRef,
        useValue: new ElementRef(document.createElement('div'))
      },
      { provide: MapService, useValue: {} },
      { provide: NgZone, useValue: zone }
    ]
  });
  const cmp = runInInjectionContext(injector, () => new MapComponent());
  (cmp as unknown as { map: Map }).map = map;
  return cmp;
}

const handlers = (cmp: MapComponent) => cmp as unknown as ClickHandlers;

function click(map: Map, type: string): MapBrowserEvent {
  const down = new MouseEvent('pointerdown');
  Object.assign(down, { pointerType: 'touch' });
  const e = new MapBrowserEvent(type, map, down as PointerEvent);
  e.pixel = [10, 10];
  e.coordinate = [0, 0];
  return e;
}

/**
 * A hit test reads the map back from the GPU, which on a slow GPU (a Raspberry
 * Pi kiosk) stalls the page until all queued drawing is done, so a tap only
 * pays for the hit tests something listens to.
 */
describe('MapComponent: hit tests for click events', () => {
  let map: Map;
  let hitTest: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    map = new Map({ view: new View({ center: [0, 0], zoom: 2 }) });
    hitTest = vi.fn();
    map.forEachFeatureAtPixel = hitTest as typeof map.forEachFeatureAtPixel;
  });

  afterEach(() => map.dispose());

  it('skips the hit test for a click nobody listens to', () => {
    const cmp = mapComponent(map);

    handlers(cmp).emitClickEvent(click(map, 'click'));
    handlers(cmp).emitDblClickEvent(click(map, 'dblclick'));

    expect(hitTest).not.toHaveBeenCalled();
  });

  it('hit-tests a click for its listener', () => {
    const cmp = mapComponent(map);
    const clicked = vi.fn();
    cmp.mapClick.subscribe(clicked);

    handlers(cmp).emitClickEvent(click(map, 'click'));

    expect(hitTest).toHaveBeenCalledOnce();
    expect(clicked).toHaveBeenCalledOnce();
  });

  it('hit-tests a double click for its listener', () => {
    const cmp = mapComponent(map);
    const clicked = vi.fn();
    cmp.mapDblClick.subscribe(clicked);

    handlers(cmp).emitDblClickEvent(click(map, 'dblclick'));

    expect(hitTest).toHaveBeenCalledOnce();
    expect(clicked).toHaveBeenCalledOnce();
  });
});
