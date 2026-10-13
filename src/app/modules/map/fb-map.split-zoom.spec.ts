import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';

import { FBMapComponent } from './fb-map.component';

// The zoom buttons sit on the main chart but act on the active pane of the
// split view. A bare prototype instance, as in fb-map.split-tap.spec.ts.
const bareComponent = (secondaryActive: boolean) => {
  const cmp = Object.create(FBMapComponent.prototype);
  cmp.app = {
    MAP_ZOOM_EXTENT: { min: 2, max: 24 },
    config: { map: { zoomLevel: 10 } }
  };
  cmp.mapZoomLevel = signal(10);
  cmp.splitView = { secondaryActive: () => secondaryActive, zoomBy: vi.fn() };
  return cmp;
};

describe('FBMapComponent: zoom buttons with the chart split', () => {
  it('zoom the second pane when it is active', () => {
    const cmp = bareComponent(true);
    cmp.zoomMap(true);
    cmp.zoomMap(false);
    expect(cmp.splitView.zoomBy.mock.calls).toEqual([[1], [-1]]);
    expect(cmp.mapZoomLevel()).toBe(10);
  });

  it('zoom the main chart when it is active', () => {
    const cmp = bareComponent(false);
    cmp.zoomMap(true);
    expect(cmp.splitView.zoomBy).not.toHaveBeenCalled();
    expect(cmp.mapZoomLevel()).toBe(11);
    expect(cmp.app.config.map.zoomLevel).toBe(11);
  });
});
