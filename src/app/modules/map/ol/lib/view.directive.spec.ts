import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Map as OlMap } from 'ol';
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
      const view = directive.getView();
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
