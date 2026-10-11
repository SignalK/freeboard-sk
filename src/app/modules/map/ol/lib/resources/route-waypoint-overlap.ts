import { getWidth } from 'ol/extent';
import { LineString, Point } from 'ol/geom';
import { unByKey } from 'ol/Observable';
import { get as getProjection } from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import { worldCopyOffset } from '../util';

/**
 * Where a route point is linked to a waypoint drawn on the same spot, only one
 * marker is drawn: the route's start/end marker at the route's ends, the
 * waypoint's icon at every other point (#991).
 *
 * Each layer decides from the other layer's *live* features, not its input
 * data, so the rule keeps holding while a route or waypoint is being edited
 * (OL Modify changes the rendered features long before the edit is saved).
 */

/** Points rendered within this many pixels of each other share a marker. */
export const WAYPOINT_COVER_PX = 3;

const WORLD_WIDTH = getWidth(getProjection('EPSG:3857').getExtent());

/** Per-point route metadata; only the waypoint link matters here. */
export type PointLink = { href?: string } | null | undefined;

/** Waypoint id from a route point's `/resources/waypoints/<id>` link. */
export function linkedWaypointId(link: PointLink): string | undefined {
  return link?.href ? link.href.split('/').slice(-1)[0] : undefined;
}

/**
 * True when two render-space (EPSG:3857) positions are drawn within
 * WAYPOINT_COVER_PX of each other at `resolution` (map units per pixel).
 * A route crossing the antimeridian is rendered unwrapped, so the positions
 * are compared within the same world copy.
 */
export function drawnTogether(
  a: number[],
  b: number[],
  resolution: number
): boolean {
  if (!(resolution > 0)) {
    return false;
  }
  const dx0 = a[0] - b[0];
  const dx = dx0 - worldCopyOffset(dx0, WORLD_WIDTH);
  return Math.hypot(dx, a[1] - b[1]) / resolution <= WAYPOINT_COVER_PX;
}

type Kind = 'routes' | 'waypoints';
type MapSources = Record<Kind, Set<VectorSource>>;

// Keyed by the OL map, so a second map (e.g. a dialog's) never sees these.
const registry = new WeakMap<object, MapSources>();

function sourcesOf(map: object): MapSources {
  let s = registry.get(map);
  if (!s) {
    s = { routes: new Set(), waypoints: new Set() };
    registry.set(map, s);
  }
  return s;
}

/**
 * Register a route or waypoint layer's source with its map. Whenever this
 * source's features change (added, removed, cleared, or edited in place),
 * the other kind of source is told to re-render so its style functions see
 * the change. Returns the function that unregisters it.
 */
export function joinOverlap(
  map: object,
  kind: Kind,
  source: VectorSource
): () => void {
  const sources = sourcesOf(map);
  const other: Kind = kind === 'routes' ? 'waypoints' : 'routes';
  // Only feature events, never 'change': the other source's changed() fires
  // 'change', so listening to it would ping-pong between the two.
  const redrawOther = () => sources[other].forEach((s) => s.changed());
  sources[kind].add(source);
  const keys = source.on(
    ['addfeature', 'removefeature', 'changefeature', 'clear'],
    redrawOther
  );
  redrawOther();
  return () => {
    unByKey(keys);
    sources[kind].delete(source);
    redrawOther();
  };
}

/** Rendered position of waypoint `id`, or undefined when it isn't drawn. */
export function drawnWaypointPosition(
  map: object,
  id: string | undefined
): number[] | undefined {
  if (!id) {
    return undefined;
  }
  for (const s of sourcesOf(map).waypoints) {
    const geom = s.getFeatureById('waypoint.' + id)?.getGeometry();
    if (geom instanceof Point) {
      return geom.getCoordinates();
    }
  }
  return undefined;
}

/**
 * True when a drawn route starts or ends on waypoint `id`, drawn together with
 * the waypoint's position `pos` at `resolution`.
 */
export function isRouteEndAt(
  map: object,
  id: string,
  pos: number[],
  resolution: number
): boolean {
  for (const s of sourcesOf(map).routes) {
    for (const f of s.getFeatures()) {
      const geom = f.getGeometry();
      if (!(geom instanceof LineString)) {
        continue;
      }
      const coords = geom.getCoordinates();
      if (coords.length < 2) {
        continue;
      }
      const meta = f.get('pointMetadata') as PointLink[] | null;
      for (const i of [0, coords.length - 1]) {
        if (
          linkedWaypointId(meta?.[i]) === id &&
          drawnTogether(coords[i], pos, resolution)
        ) {
          return true;
        }
      }
    }
  }
  return false;
}
