import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ChangeDetectorRef,
  ElementRef,
  Injector,
  NgZone,
  runInInjectionContext
} from '@angular/core';
import { Map, View } from 'ol';
import { MapComponent } from './map.component';
import { MapService } from './map.service';

const zone = {
  run: <T>(fn: () => T) => fn(),
  runOutsideAngular: <T>(fn: () => T) => fn()
};

function mapComponent(map: Map): MapComponent {
  const injector = Injector.create({
    providers: [
      { provide: ChangeDetectorRef, useValue: { detach: () => undefined } },
      {
        provide: ElementRef,
        useValue: new ElementRef(document.createElement('div'))
      },
      { provide: MapService, useValue: { clearFeatureUrls: () => undefined } },
      { provide: NgZone, useValue: zone }
    ]
  });
  const cmp = runInInjectionContext(injector, () => new MapComponent());
  (cmp as unknown as { map: Map }).map = map;
  return cmp;
}

function press(cmp: MapComponent, pointerType: string) {
  const down = new MouseEvent('pointerdown', { clientX: 10, clientY: 10 });
  Object.assign(down, { pointerId: 1, pointerType });
  (
    cmp as unknown as { pointerDownHandler: (e: PointerEvent) => void }
  ).pointerDownHandler(down as PointerEvent);
}

/**
 * Holding a press still opens the chart menu, which hit-tests the map. On a
 * slow GPU that hit test stalls the page, so it must not run for a mouse,
 * which opens the menu with its right button.
 */
describe('MapComponent: long-press', () => {
  let map: Map;

  beforeEach(() => {
    vi.useFakeTimers();
    map = new Map({ view: new View({ center: [0, 0], zoom: 2 }) });
    // a map that has not rendered cannot place a pointer event yet
    vi.spyOn(map, 'getEventCoordinate').mockReturnValue([0, 0]);
    vi.spyOn(map, 'getEventPixel').mockReturnValue([10, 10]);
  });

  afterEach(() => {
    vi.useRealTimers();
    map.dispose();
  });

  it('opens the chart menu after a finger is held still', () => {
    const cmp = mapComponent(map);
    const menu = vi.fn();
    cmp.mapContextMenu.subscribe(menu);

    press(cmp, 'touch');
    vi.advanceTimersByTime(600);

    expect(menu).toHaveBeenCalledOnce();
  });

  it('leaves a held mouse button alone', () => {
    const cmp = mapComponent(map);
    const menu = vi.fn();
    cmp.mapContextMenu.subscribe(menu);

    press(cmp, 'mouse');
    vi.advanceTimersByTime(2000);

    expect(menu).not.toHaveBeenCalled();
  });
});
