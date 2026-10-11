import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Collection, Feature } from 'ol';
import { Point } from 'ol/geom';
import { Draw, Modify } from 'ol/interaction';
import OlMap from 'ol/Map';
import MapBrowserEvent from 'ol/MapBrowserEvent';
import VectorSource from 'ol/source/Vector';
import {
  nearestWaypoint,
  waypointAt,
  waypointSnapAt,
  withWaypointSnap
} from './waypoint-snap';
import { joinOverlap } from './resources/route-waypoint-overlap';
import { WaypointSnappingDraw } from './interactions/interaction-draw.component';
import { WaypointSnappingModify } from './interactions/interaction-modify.component';

/**
 * Route points drawn, dragged or appended near a waypoint snap onto it (#881),
 * within the pointer's hit tolerance (10 px mouse, 15 px touch) and in the
 * world copy the pointer is in.
 */

const W = 1000; // world width for the pure helpers
const WP = [{ id: 'a', coordinate: [100, 50] }];

describe('nearestWaypoint', () => {
  it('snaps to a waypoint within range', () => {
    expect(nearestWaypoint([105, 52], WP, 10, W)).toEqual({
      id: 'a',
      coordinate: [100, 50]
    });
  });

  it('ignores a waypoint out of range', () => {
    expect(nearestWaypoint([115, 50], WP, 10, W)).toBeNull();
  });

  it('picks the nearest of several in range', () => {
    const wps = [...WP, { id: 'b', coordinate: [108, 50] }];
    expect(nearestWaypoint([105, 50], wps, 10, W)?.id).toBe('b');
  });

  it('snaps in the world copy the pointer is in', () => {
    // The pointer is one world east of the waypoint's stored position.
    expect(nearestWaypoint([W + 103, 50], WP, 10, W)).toEqual({
      id: 'a',
      coordinate: [W + 100, 50]
    });
  });
});

describe('waypointAt', () => {
  it('finds the waypoint a point lies on, in any world copy', () => {
    expect(waypointAt([100, 50], WP, W)).toBe('a');
    expect(waypointAt([-W + 100, 50], WP, W)).toBe('a');
  });

  it('ignores a point merely near a waypoint', () => {
    expect(waypointAt([101, 50], WP, W)).toBeUndefined();
  });
});

/** Modify's pointer handlers, protected in its typings. */
type PointerHandlers = {
  handleDragEvent(e: MapBrowserEvent<PointerEvent>): void;
  handleDownEvent(e: MapBrowserEvent<PointerEvent>): boolean;
};
const handlers = (m: Modify) => m as unknown as PointerHandlers;

// A map stand-in: 10 map units per pixel, pixel axes aligned with the map's.
// `markerAt` stands in for hit detection: the features whose drawn marker is
// under a pixel, with the layer source each belongs to.
const RES = 10;
type MarkerHit = { feature: Feature; source: unknown };
let markerAt: (pixel: number[], tolerance: number) => MarkerHit[] = () => [];
function stubMap() {
  return {
    getView: () => ({ getResolution: () => RES }),
    forEachFeatureAtPixel: (
      pixel: number[],
      cb: (f: Feature) => unknown,
      opts: {
        hitTolerance: number;
        layerFilter: (l: { getSource: () => unknown }) => boolean;
      }
    ) => {
      for (const hit of markerAt(pixel, opts.hitTolerance)) {
        if (opts.layerFilter({ getSource: () => hit.source })) {
          cb(hit.feature);
        }
      }
    },
    getCoordinateFromPixel: (p: number[]) => [p[0] * RES, p[1] * RES],
    getPixelFromCoordinate: (c: number[]) => [c[0] / RES, c[1] / RES],
    // Events built from a raw browser event (Draw's long-press timer) read
    // their pixel from it.
    getEventPixel: (e: PointerEvent) => [e.clientX, e.clientY]
  } as unknown as OlMap;
}

function pointerEvent(
  map: OlMap,
  type: string,
  pixel: number[],
  pointerType = 'mouse'
): MapBrowserEvent<PointerEvent> {
  const evt = new MapBrowserEvent(type, map, {
    pointerType
  } as PointerEvent);
  evt.pixel = pixel;
  return evt;
}

describe('snapping map events onto drawn waypoints', () => {
  let map: OlMap;
  let leave: () => void;
  let source: VectorSource;
  let wpt: Feature;

  beforeEach(() => {
    map = stubMap();
    source = new VectorSource();
    wpt = new Feature(new Point([1000, 500])); // pixel [100, 50]
    wpt.setId('waypoint.a');
    source.addFeature(wpt);
    leave = joinOverlap(map, 'waypoints', source);
  });

  afterEach(() => {
    leave();
    markerAt = () => [];
    vi.restoreAllMocks();
  });

  it('snaps a click on the marker icon, drawn above the waypoint position', () => {
    // A pin icon 30 px tall standing on the position: its body is far beyond
    // the snap radius of the position, yet clicking it means this waypoint.
    markerAt = (p, tol) =>
      Math.abs(p[0] - 100) <= 8 + tol && p[1] >= 20 - tol && p[1] <= 50 + tol
        ? [{ feature: wpt, source }]
        : [];
    expect(waypointSnapAt(map, [102, 30], 'mouse')).toEqual({
      id: 'a',
      coordinate: [1000, 500]
    });
  });

  it('ignores a marker hit on a layer other than the waypoints', () => {
    markerAt = () => [{ feature: wpt, source: new VectorSource() }];
    expect(waypointSnapAt(map, [102, 30], 'mouse')).toBeNull();
  });

  it('uses the mouse radius for a mouse and the touch radius for a finger', () => {
    // 12 px away: outside 10 px, inside 15 px.
    expect(waypointSnapAt(map, [112, 50], 'mouse')).toBeNull();
    expect(waypointSnapAt(map, [112, 50], 'touch')?.id).toBe('a');
  });

  it('moves the event onto the waypoint while handling it, then restores it', () => {
    const evt = pointerEvent(map, 'pointermove', [104, 53]);
    const seen = withWaypointSnap(evt, () => ({
      coordinate: evt.coordinate,
      pixel: evt.pixel
    }));
    expect(seen).toEqual({ coordinate: [1000, 500], pixel: [100, 50] });
    expect(evt.pixel).toEqual([104, 53]);
    expect(evt.coordinate).toEqual([1040, 530]);
  });

  it('leaves an event out of range as it is', () => {
    const evt = pointerEvent(map, 'pointermove', [130, 50]);
    const seen = withWaypointSnap(evt, () => evt.coordinate);
    expect(seen).toEqual([1300, 500]);
  });

  it('snaps every pointer event a route Draw handles', () => {
    let seen: number[] | undefined;
    vi.spyOn(Draw.prototype, 'handleEvent').mockImplementation(function (
      e: MapBrowserEvent<PointerEvent>
    ) {
      seen = e.coordinate;
      return true;
    });
    const draw = new WaypointSnappingDraw({ type: 'LineString' });
    draw.handleEvent(pointerEvent(map, 'pointerup', [105, 50]));
    expect(seen).toEqual([1000, 500]);
  });

  describe('a real route Draw, press to release', () => {
    // A pin icon 30 px tall standing on the waypoint, as in the test above.
    const onIcon = (p: number[], tol: number) =>
      Math.abs(p[0] - 100) <= 8 + tol && p[1] >= 20 - tol && p[1] <= 50 + tol;

    // A real pointer gesture: Draw tracks pointers by id and reads modifiers.
    function gesture(type: string, pixel: number[], pointerType = 'touch') {
      const original = {
        type,
        pointerId: 1,
        pointerType,
        button: 0,
        isPrimary: true,
        clientX: pixel[0],
        clientY: pixel[1],
        preventDefault: () => undefined
      } as unknown as PointerEvent;
      // Pointers still down after the event: none once it is released.
      const active = type === 'pointerup' ? [] : [original];
      const evt = new MapBrowserEvent(
        type,
        map,
        original,
        false,
        undefined,
        active
      );
      evt.pixel = pixel;
      return evt;
    }

    // The point a click starts the route at: Draw's private startDrawing_,
    // which needs a real map to build the sketch, so it is stubbed here.
    function startedAt(draw: WaypointSnappingDraw) {
      return vi
        .spyOn(
          draw as unknown as { startDrawing_: () => void },
          'startDrawing_'
        )
        .mockImplementation(() => undefined);
    }

    beforeEach(() => {
      vi.useFakeTimers();
      markerAt = (p, tol) => (onIcon(p, tol) ? [{ feature: wpt, source }] : []);
    });

    afterEach(() => vi.useRealTimers());

    it('wraps a pointer-move handler Draw still has', () => {
      // WaypointSnappingDraw wraps this private handler: if an OL upgrade
      // renames it, held clicks on a waypoint would silently stop working.
      const internals = new Draw({ type: 'LineString' }) as unknown as {
        handlePointerMove_?: unknown;
      };
      expect(typeof internals.handlePointerMove_).toBe('function');
    });

    it('adds a point on the waypoint for a press held on its icon', () => {
      // Draw's long-press timer replays the press unsnapped; the click must
      // survive it rather than read as a drag.
      const draw = new WaypointSnappingDraw({ type: 'LineString' });
      const start = startedAt(draw);
      draw.handleEvent(gesture('pointerdown', [102, 30]));
      vi.advanceTimersByTime(600);
      draw.handleEvent(gesture('pointerup', [102, 30]));
      expect(start).toHaveBeenCalledWith([1000, 500]);
    });

    it('adds a point on the waypoint when the release slips off the icon', () => {
      const draw = new WaypointSnappingDraw({ type: 'LineString' });
      const start = startedAt(draw);
      draw.handleEvent(gesture('pointerdown', [100, 22]));
      draw.handleEvent(gesture('pointerup', [100, 17]));
      expect(start).toHaveBeenCalledWith([1000, 500]);
    });

    it('adds no point for a drag that starts and ends on the icon', () => {
      const draw = new WaypointSnappingDraw({ type: 'LineString' });
      const start = startedAt(draw);
      draw.handleEvent(gesture('pointerdown', [100, 48]));
      draw.handleEvent(gesture('pointerup', [100, 25]));
      expect(start).not.toHaveBeenCalled();
    });
  });

  it('snaps a vertex dragged by a route Modify', () => {
    let seen: number[] | undefined;
    vi.spyOn(handlers(Modify.prototype), 'handleDragEvent').mockImplementation(
      function (e: MapBrowserEvent<PointerEvent>) {
        seen = e.coordinate;
      }
    );
    const modify = new WaypointSnappingModify({ features: new Collection() });
    handlers(modify).handleDragEvent(
      pointerEvent(map, 'pointerdrag', [95, 46])
    );
    expect(seen).toEqual([1000, 500]);
  });

  it('never snaps the press that grabs a vertex, so it grabs what is under it', () => {
    let seen: number[] | undefined;
    vi.spyOn(handlers(Modify.prototype), 'handleDownEvent').mockImplementation(
      function (e: MapBrowserEvent<PointerEvent>) {
        seen = e.coordinate;
        return false;
      }
    );
    const modify = new WaypointSnappingModify({ features: new Collection() });
    handlers(modify).handleDownEvent(
      pointerEvent(map, 'pointerdown', [95, 46])
    );
    expect(seen).toEqual([950, 460]);
  });
});
