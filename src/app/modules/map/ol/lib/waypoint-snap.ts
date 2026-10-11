import OlMap from 'ol/Map';
import MapBrowserEvent from 'ol/MapBrowserEvent';
import { WORLD_WIDTH_3857 as WORLD_WIDTH } from '../../route-extend';
import {
  drawnWaypoints,
  isWaypointSource
} from './resources/route-waypoint-overlap';
import { hitToleranceForPointer, worldCopyOffset } from './util';

/**
 * Snapping route points to the waypoints drawn on the map (#881).
 *
 * A route point drawn, dragged or appended on a waypoint's marker, within the
 * pointer's hit tolerance, takes the waypoint's position. That point is then
 * linked to the waypoint wherever its vertex lies exactly on one
 * (`waypointAt`), so the link follows the geometry: undoing a snapped point,
 * or dragging it off the waypoint, leaves nothing to clean up.
 */

/**
 * Snap radius in pixels: the radius route editing already uses (Modify's vertex
 * tolerance and the route-extend guard), wider than a map click's.
 */
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

/** The drawn waypoint to snap `evt` to, or null. */
export function eventWaypointSnap(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evt: MapBrowserEvent<any>
): DrawnWaypoint | null {
  const pointerType = (evt.originalEvent as PointerEvent | undefined)
    ?.pointerType;
  return evt.map && evt.pixel
    ? waypointSnapAt(evt.map, evt.pixel, pointerType)
    : null;
}

/**
 * Run `handle` with `evt` at `coordinate` and `pixel`, then restore the event
 * for the interactions that see it next. The coordinate and pixel are
 * replaced, never mutated in place, so whatever `handle` kept of them stays as
 * it was.
 */
function withEventAt<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evt: MapBrowserEvent<any>,
  coordinate: number[],
  pixel: number[],
  handle: () => T
): T {
  const original = { coordinate: evt.coordinate, pixel: evt.pixel };
  evt.coordinate = coordinate;
  evt.pixel = pixel;
  try {
    return handle();
  } finally {
    evt.coordinate = original.coordinate;
    evt.pixel = original.pixel;
  }
}

/**
 * Run `handle` with `evt` moved onto the nearest drawn waypoint, if one is in
 * snap range.
 */
export function withWaypointSnap<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evt: MapBrowserEvent<any>,
  handle: () => T
): T {
  const snap = eventWaypointSnap(evt);
  return snap
    ? withEventAt(
        evt,
        snap.coordinate,
        evt.map.getPixelFromCoordinate(snap.coordinate),
        handle
      )
    : handle();
}

/** A press, and how the gesture it begins is snapped. */
export interface SnapPress {
  /** Where the press landed. */
  pixel: number[];
  /** The waypoint it snapped to, or null. */
  snap: DrawnWaypoint | null;
  /**
   * The snap's pixel offset, fixed at the press: a slip pans the map under the
   * gesture, so recomputing it later would add the pan to the slip.
   */
  offset: number[];
}

/** The press `evt` makes: where it landed and how it snaps. */
export function snapPress(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evt: MapBrowserEvent<any>
): SnapPress {
  const pixel = evt.pixel;
  const snap = eventWaypointSnap(evt);
  const snapPx = snap ? evt.map.getPixelFromCoordinate(snap.coordinate) : pixel;
  return {
    pixel,
    snap,
    offset: [snapPx[0] - pixel[0], snapPx[1] - pixel[1]]
  };
}

/**
 * Run `handle` with an event of the gesture `press` began, snapped the way the
 * press was.
 *
 * An interaction that tells a click from a drag by how far the pointer moved
 * since the press must see the same distances it would without snapping. So
 * every pixel of the gesture is shifted by the press's snap offset, never
 * snapped on its own: a release snapped while its press was not (or the
 * reverse), or a press replayed unsnapped, would look like a drag and the
 * click would be lost.
 *
 * The coordinate is what gets placed. A release within `clickTolerance` of the
 * press is a click, landing exactly on the press's waypoint (or where it was
 * clicked, when the press snapped to none); further away, the pointer snaps as
 * it would anywhere. The pixel then stays shifted by the press's offset, so a
 * long-press drag that began on a waypoint icon tests for finishing the route
 * that far from the pointer.
 */
export function withPressSnap<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evt: MapBrowserEvent<any>,
  press: SnapPress,
  clickTolerance: number,
  handle: () => T
): T {
  const raw = evt.pixel;
  const pixel = [raw[0] + press.offset[0], raw[1] + press.offset[1]];
  const isClick =
    Math.hypot(raw[0] - press.pixel[0], raw[1] - press.pixel[1]) <=
    clickTolerance;
  const coordinate = isClick
    ? (press.snap?.coordinate ?? evt.coordinate)
    : (eventWaypointSnap(evt)?.coordinate ?? evt.coordinate);
  return withEventAt(evt, coordinate, pixel, handle);
}
