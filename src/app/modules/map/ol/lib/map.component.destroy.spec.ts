import { afterEach, describe, expect, it, vi } from 'vitest';
import { MapComponent } from './map.component';

/**
 * A map can be destroyed at runtime (the split view's second pane), with a
 * resize still waiting from its window-resize throttle.
 */
describe('MapComponent: destroyed with a resize pending', () => {
  afterEach(() => vi.useRealTimers());

  it('cancels the resize, which would act on a map that has gone', () => {
    vi.useFakeTimers();
    const cmp = Object.create(MapComponent.prototype);
    const resized = vi.fn();
    cmp.timeoutId = setTimeout(resized, 100);

    cmp.ngOnDestroy();
    vi.advanceTimersByTime(200);

    expect(resized).not.toHaveBeenCalled();
  });
});
