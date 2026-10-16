import { describe, expect, it, vi } from 'vitest';
import { Map as OlMap } from 'ol';
import { ViewFootprintComponent } from './layer-view-footprint.component';

/**
 * The outline lives on the split view's second pane, whose map component lets
 * go of its map before this layer goes: it must still leave that map.
 */
describe('ViewFootprintComponent', () => {
  it('leaves the map it was drawn on, even once its map component has none', () => {
    const map = new OlMap();
    let current: OlMap | null = map;
    const footprint = new ViewFootprintComponent(
      { detach: () => undefined } as never,
      { getMap: () => current } as never
    );
    footprint.ngOnInit();
    expect(map.getLayers().getLength()).toBe(1);
    const layer = map.getLayers().item(0);
    const dispose = vi.spyOn(layer, 'dispose');

    current = null;
    footprint.ngOnDestroy();

    expect(map.getLayers().getLength()).toBe(0);
    expect(dispose).toHaveBeenCalled();
  });
});
