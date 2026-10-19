import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';

import { Map as OlMap } from 'ol';
import { FBMapComponent } from './fb-map.component';
import { FBMapEvent } from './ol/lib/map.component';
import { RESIZING } from './ol/lib/util';

// The zoom buttons sit on the main chart but act on the active pane of the
// split view. A bare prototype instance, as in fb-map.split-tap.spec.ts.
const bareComponent = (secondaryActive: boolean) => {
  const cmp = Object.create(FBMapComponent.prototype);
  cmp.app = {
    MAP_ZOOM_EXTENT: { min: 2, max: 24 },
    config: { map: { zoomLevel: 10 } }
  };
  cmp.mapZoomLevel = signal(10);
  cmp.splitView = {
    secondaryActive: () => secondaryActive,
    zoomBy: vi.fn(),
    activate: vi.fn()
  };
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

describe('FBMapComponent: keys with the chart split', () => {
  it('make the main chart the active pane, as it has focus', () => {
    const cmp = bareComponent(true);

    cmp.onMapKeydown({ key: 'a' } as KeyboardEvent);

    expect(cmp.splitView.activate).toHaveBeenCalledWith('main');
  });

  it('leave the active pane alone on its controls, as the zoom buttons', () => {
    const cmp = bareComponent(true);
    const map = new OlMap();
    cmp.olMap = { getMap: () => map };
    const button = document.createElement('button');
    map.getOverlayContainerStopEvent()?.append(button);

    cmp.onMapKeydown({
      key: 'Enter',
      target: button
    } as unknown as KeyboardEvent);

    expect(cmp.splitView.activate).not.toHaveBeenCalled();
  });
});

describe('FBMapComponent: the view while the split divider is dragged', () => {
  it('keeps no view the chart passes through drawn larger than it shows', () => {
    const cmp = bareComponent(false);
    const map = new OlMap();
    map.set(RESIZING, true);

    cmp.onMapMoveEnd({ map, zoom: 14 } as unknown as FBMapEvent);

    expect(cmp.app.config.map.zoomLevel).toBe(10);
  });
});
