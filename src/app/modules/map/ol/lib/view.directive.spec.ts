import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SimpleChange } from '@angular/core';
import { Map as OlMap } from 'ol';
import type { AnimationOptions } from 'ol/View';
import ViewHint from 'ol/ViewHint';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from './map.component';
import { ViewDirective } from './view.directive';

describe('ViewDirective: settled view changes', () => {
  let map: OlMap | null;

  beforeEach(() => {
    vi.useFakeTimers();
    map = new OlMap({});
  });
  afterEach(() => vi.useRealTimers());

  const mounted = () => {
    const directive = new ViewDirective(
      { detach: (): void => undefined } as never,
      { getMap: () => map } as unknown as MapComponent
    );
    directive.ngOnInit();
    directive.ngAfterViewInit();
    const emitted = vi.fn();
    directive.centerChange.subscribe(emitted);
    directive.zoomChange.subscribe(emitted);
    directive.rotationChange.subscribe(emitted);
    const moveView = () => {
      const view = directive.getView()!;
      view.setCenter([1000, 0]);
      view.setZoom(5);
      view.setRotation(0.3);
    };
    return { directive, emitted, moveView };
  };

  it('reports a change once it has settled', () => {
    const { emitted, moveView } = mounted();
    moveView();
    expect(emitted).not.toHaveBeenCalled();

    vi.runAllTimers();

    expect(emitted).toHaveBeenCalledTimes(3);
  });

  it('reports nothing once its map has gone, mid change', () => {
    const { directive, emitted, moveView } = mounted();
    moveView();

    directive.ngOnDestroy();
    map = null;

    expect(() => vi.runAllTimers()).not.toThrow();
    expect(emitted).not.toHaveBeenCalled();
  });
});

describe('ViewDirective: animation', () => {
  let map: OlMap;

  beforeEach(() => {
    vi.useFakeTimers();
    map = new OlMap({});
  });
  afterEach(() => vi.useRealTimers());

  const mounted = (enableAnimation: boolean, center = [0, 0]) => {
    const directive = new ViewDirective(
      { detach: (): void => undefined } as never,
      { getMap: () => map } as unknown as MapComponent
    );
    directive.enableAnimation = enableAnimation;
    directive.ngOnChanges({
      center: new SimpleChange(undefined, center, true),
      zoom: new SimpleChange(undefined, 10, true)
    });
    directive.ngOnInit();
    const view = directive.getView()!;
    const animate = vi.spyOn(view, 'animate');
    // Angular sets the input before it calls ngOnChanges.
    const change = (key: string, value: unknown) => {
      Object.assign(directive, { [key]: value });
      directive.ngOnChanges({
        [key]: new SimpleChange(undefined, value, false)
      });
    };
    return { directive, view, animate, change };
  };

  it('moves the view at once when animation is off', () => {
    const { view, animate, change } = mounted(false);
    change('center', [10, 20]);
    change('rotation', 0.5);

    expect(animate).not.toHaveBeenCalled();
    expect(view.getCenter()).toEqual(fromLonLat([10, 20]));
    expect(view.getRotation()).toBe(0.5);
  });

  it('glides to a new centre and rotation when animation is on', () => {
    const { view, animate, change } = mounted(true);
    change('center', [10, 20]);
    change('rotation', 0.5);

    expect(animate).toHaveBeenCalledTimes(2);
    expect(animate.mock.calls[0][0]).toMatchObject({
      center: fromLonLat([10, 20])
    });
    // The second change keeps the centre on its way.
    expect(animate.mock.calls[1][0]).toMatchObject({
      center: fromLonLat([10, 20]),
      rotation: 0.5
    });
    expect(view.getAnimating()).toBe(true);
  });

  it('keeps gliding after the replaced animation reports its cancel', () => {
    const { animate, change } = mounted(true);
    change('center', [10, 20]);
    change('center', [10.001, 20]);
    // OpenLayers reports the cancelled animation in a zero-delay timeout.
    vi.advanceTimersByTime(0);
    change('center', [10.002, 20]);

    expect(animate).toHaveBeenCalledTimes(3);
  });

  it('glides continuously while the centre changes once a second', () => {
    const { animate, change } = mounted(true);
    change('center', [10, 20]);
    vi.advanceTimersByTime(1000);
    change('center', [10.001, 20]);

    const follow = animate.mock.calls[1][0] as AnimationOptions;
    expect(follow.duration).toBe(900);
    expect(follow.easing?.(0.5)).toBe(0.5);
  });

  it('zooms quickly', () => {
    const { animate, change } = mounted(true);
    change('zoom', 12);

    expect(animate.mock.calls[0][0]).toMatchObject({ zoom: 12, duration: 250 });
  });

  it('does not restart for an unchanged centre', () => {
    const { animate, change } = mounted(true);
    change('center', [0, 0]);

    expect(animate).not.toHaveBeenCalled();
  });

  it('crosses the antimeridian into the world copy on screen', () => {
    const { animate, change } = mounted(true, [179.9, 0]);
    change('center', [-179.9, 0]);

    const target = (animate.mock.calls[0][0] as AnimationOptions).center!;
    const world = 2 * 20037508.342789244;
    expect(target[0]).toBeCloseTo(fromLonLat([-179.9, 0])[0] + world, 3);
  });

  it('leaves a gesture animation to finish', () => {
    const { view, animate, change } = mounted(true);
    view.animate({ zoom: 11, duration: 250 });
    animate.mockClear();
    change('center', [10, 20]);

    expect(animate).not.toHaveBeenCalled();
  });

  it('follows the gesture while the user interacts', () => {
    const { view, animate, change } = mounted(true);
    view.setHint(ViewHint.INTERACTING, 1);
    change('center', [10, 20]);

    expect(animate).not.toHaveBeenCalled();
    expect(view.getCenter()).toEqual(fromLonLat([10, 20]));
  });
});
