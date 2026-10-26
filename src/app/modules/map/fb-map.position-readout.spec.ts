import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { fromLonLat } from 'ol/proj';

import { FBMapComponent } from './fb-map.component';
import { FBMapEvent, FBPointerEvent } from './ol/lib/map.component';
import { Position } from 'src/app/types';

// A bare prototype instance, as in fb-map.split-zoom.spec.ts: only what the
// map-ready, move-end and pointer-move handlers touch is stubbed.
const bareComponent = () => {
  const cmp = Object.create(FBMapComponent.prototype);
  cmp.mouse = signal({ pixel: null, coords: [0, 0], xy: null });
  // Object.create() skips the field initialisers.
  cmp.pointerSeen = false;
  cmp.app = {
    config: { map: { zoomLevel: 10, center: [0, 0] } },
    mapZoom: signal(10),
    mapExtent: signal([]),
    mapViewTopCenter: signal([0, 0]),
    mapViewRightCenter: signal([0, 0]),
    mapViewRotation: signal(0),
    saveConfigDebounced: vi.fn()
  };
  cmp.skstream = { postMapView: vi.fn() };
  cmp.trackHistory = { setView: vi.fn() };
  cmp.refollow = { reset: vi.fn() };
  cmp.drawVesselLines = vi.fn();
  cmp.renderMapContents = vi.fn();
  cmp.updateCursorInfo = vi.fn();
  cmp.mapInteract = { isMeasuring: () => false };
  return cmp;
};

const moveEnd = (lonlat: Position) =>
  ({ zoom: 10, lonlat, extent: [] }) as unknown as FBMapEvent;

describe('FBMapComponent: position readout', () => {
  it('shows the restored chart centre as soon as the map is ready', () => {
    // An untouched reload: no move-end may have reached the component yet.
    const cmp = bareComponent();
    cmp.olMap = {
      getMap: () => ({
        getView: () => ({
          getZoom: () => 10,
          getCenter: () => fromLonLat([178.4, -18.1])
        })
      }),
      getMapExtent: (): number[] => []
    };

    cmp.onMapReady();

    const [lon, lat] = cmp.mouse().coords;
    expect(lon).toBeCloseTo(178.4);
    expect(lat).toBeCloseTo(-18.1);
  });

  it('shows the chart centre before any pointer has been over the chart', () => {
    // A cold load on a touch screen: the view is restored and drawn, but no
    // finger has touched the chart yet.
    const cmp = bareComponent();

    cmp.onMapMoveEnd(moveEnd([178.4, -18.1]));

    expect(cmp.mouse().coords).toEqual([178.4, -18.1]);
  });

  it('keeps showing the pointer once one has been over the chart', () => {
    const cmp = bareComponent();
    cmp.onMapPointerMove({
      pixel: [10, 20],
      coordinate: [0, 0],
      lonlat: [5, 50]
    } as unknown as FBPointerEvent);

    cmp.onMapMoveEnd(moveEnd([178.4, -18.1]));

    expect(cmp.mouse().coords).toEqual([5, 50]);
  });

  it('shows a tap on the split view second pane, and keeps it', () => {
    // A finger raises no pointer move before it taps, on either pane.
    const cmp = bareComponent();
    cmp.contextMenuContent = (): null => null;

    cmp.onSecondaryTap({ kind: 'contextmenu', lonlat: [5, 50] });
    cmp.onMapMoveEnd(moveEnd([178.4, -18.1]));

    expect(cmp.mouse().coords).toEqual([5, 50]);
  });
});
