import { getWidth } from 'ol/extent';
import OlMap from 'ol/Map';
import MapBrowserEvent from 'ol/MapBrowserEvent';
import { get as getProjection } from 'ol/proj';
import {
  drawnWaypoints,
  isWaypointSource
} from './resources/route-waypoint-overlap';
import { hitToleranceForPointer, worldCopyOffset } from './util';

/**
 * Snapping route points to the waypoints drawn on the map (#881).
 *
 * A route point drawn, dragged or appended on a waypoint's marker, within the
 * pointer's hit tolerance, takes the waypoint's position. That point is then linked to
 * the waypoint wherever its vertex lies exactly on one (`waypointAt`), so the
 * link follows the geometry: undoing a snapped point, or dragging it off the
 * waypoint, leaves nothing to clean up.
 */

const WORLD_WIDTH = getWidth(getProjection('EPSG:3857').getExtent());

/** Snap radius in pixels: the tolerance map clicks already use. */
export const SNAP_MOUSE_TOLERANCE = 10;
export const SNAP_TOUCH_TOLERANCE = 15;

/** A waypoint drawn on the map, in render space (EPSG:3857). */
export interface DrawnWaypoint {
  id: string;
  coordinate: number[];
}

/**
 * Within this many map units (metres) a vertex counts as lying on a waypoint.
 * A snapped vertex is the waypoint's coordinate shifted by whole worlds, so it
 * differs only by floating-point error; a clicked point never lands this close
 * by chance.
 */
const ON_WAYPOINT_EPSILON = 1e-3;

/** Horizontal offset from `wp` to `coordinate` within one world copy. */
function offsetInWorld(
  coordinate: number[],
  wp: number[],
  worldWidth: number
): number {
  const dx = coordinate[0] - wp[0];
  return dx - worldCopyOffset(dx, worldWidth);
}

/**
 * The waypoint nearest `coordinate` within `maxDistance` map units, with the
 * coordinate to snap to: the waypoint's position in the world copy that
 * `coordinate` is in, so a snap never jumps the pointer a world away.
 */
export function nearestWaypoint(
  coordinate: number[],
  waypoints: DrawnWaypoint[],
  maxDistance: number,
  worldWidth = WORLD_WIDTH
): DrawnWaypoint | null {
  let best: DrawnWaypoint | null = null;
  let bestDistance = maxDistance;
  for (const wp of waypoints) {
    const dx = offsetInWorld(coordinate, wp.coordinate, worldWidth);
    const distance = Math.hypot(dx, coordinate[1] - wp.coordinate[1]);
    if (distance <= bestDistance) {
      best = {
        id: wp.id,
        coordinate: [coordinate[0] - dx, wp.coordinate[1]]
      };
      bestDistance = distance;
    }
  }
  return best;
}

/** Id of the waypoint `coordinate` lies on, in any world copy. */
export function waypointAt(
  coordinate: number[],
  waypoints: DrawnWaypoint[],
  worldWidth = WORLD_WIDTH
): string | undefined {
  return waypoints.find(
    (wp) =>
      Math.hypot(
        offsetInWorld(coordinate, wp.coordinate, worldWidth),
        coordinate[1] - wp.coordinate[1]
      ) <= ON_WAYPOINT_EPSILON
  )?.id;
}

/**
 * The drawn waypoint to snap to at `pixel`, or null. `pointerType` picks the
 * snap radius, as it does for map clicks.
 *
 * The pointer is hit-tested against the waypoint markers as drawn, the way a
 * map click is. A marker icon stands above the waypoint's position (a pin's
 * tip marks the spot), so a click on the icon can be well outside the snap
 * radius of the position itself. The position is tested too, for a waypoint
 * whose marker is not drawn yet.
 */
export function waypointSnapAt(
  map: OlMap,
  pixel: number[],
  pointerType: string | undefined
): DrawnWaypoint | null {
  const resolution = map.getView().getResolution();
  const coordinate = map.getCoordinateFromPixel(pixel);
  if (!resolution || !coordinate) {
    return null;
  }
  const tolerance = hitToleranceForPointer(
    pointerType,
    SNAP_MOUSE_TOLERANCE,
    SNAP_TOUCH_TOLERANCE
  );
  const marked = new Set<string>();
  map.forEachFeatureAtPixel(
    pixel,
    (f) => {
      const id = f.getId();
      if (typeof id === 'string' && id.startsWith('waypoint.')) {
        marked.add(id.slice('waypoint.'.length));
      }
    },
    {
      hitTolerance: tolerance,
      layerFilter: (layer) => isWaypointSource(map, layer.getSource())
    }
  );
  const drawn = drawnWaypoints(map);
  return (
    nearestWaypoint(
      coordinate,
      drawn.filter((wp) => marked.has(wp.id)),
      Infinity
    ) ?? nearestWaypoint(coordinate, drawn, tolerance * resolution)
  );
}

/**
 * Run `handle` with `evt` moved onto the nearest drawn waypoint, if one is in
 * snap range, then restore the event for the interactions that see it next.
 * The coordinate and pixel are replaced, never mutated in place, so whatever
 * `handle` kept of the snapped ones stays as it was.
 */
export function withWaypointSnap<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evt: MapBrowserEvent<any>,
  handle: () => T
): T {
  const pointerType = (evt.originalEvent as PointerEvent | undefined)
    ?.pointerType;
  const snap =
    evt.map && evt.pixel
      ? waypointSnapAt(evt.map, evt.pixel, pointerType)
      : null;
  if (!snap) {
    return handle();
  }
  const { coordinate, pixel } = evt;
  evt.coordinate = snap.coordinate;
  evt.pixel = evt.map.getPixelFromCoordinate(snap.coordinate);
  try {
    return handle();
  } finally {
    evt.coordinate = coordinate;
    evt.pixel = pixel;
  }
}
