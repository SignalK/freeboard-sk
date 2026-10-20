import { getWidth } from 'ol/extent';
import { LineString, Point } from 'ol/geom';
import OlMap from 'ol/Map';
import { unByKey } from 'ol/Observable';
import { get as getProjection } from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import { worldCopyOffset } from '../util';
import type { DrawnWaypoint } from '../waypoint-snap';

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

// EPSG:3857 is built into OpenLayers, so the lookup always finds it
const WORLD_WIDTH = getWidth(getProjection('EPSG:3857')!.getExtent());

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
const registry = new WeakMap<OlMap, MapSources>();

function sourcesOf(map: OlMap): MapSources {
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
  map: OlMap,
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

/** True when `source` is a waypoint layer's source on `map`. */
export function isWaypointSource(map: OlMap, source: unknown): boolean {
  return sourcesOf(map).waypoints.has(source as VectorSource);
}

/** Every waypoint drawn on `map`: its id and rendered position. */
export function drawnWaypoints(map: OlMap): DrawnWaypoint[] {
  const drawn: DrawnWaypoint[] = [];
  for (const s of sourcesOf(map).waypoints) {
    for (const f of s.getFeatures()) {
      const geom = f.getGeometry();
      const fid = f.getId();
      if (geom instanceof Point && typeof fid === 'string') {
        drawn.push({
          id: fid.slice('waypoint.'.length),
          coordinate: geom.getCoordinates()
        });
      }
    }
  }
  return drawn;
}

/** Rendered position of waypoint `id`, or undefined when it isn't drawn. */
export function drawnWaypointPosition(
  map: OlMap,
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
  map: OlMap,
  id: string,
  pos: number[],
  resolution: number
): boolean {
  for (const s of sourcesOf(map).routes) {
    for (const f of s.getFeatures()) {
      const geom = f.getGeometry();
      if (
        !(geom instanceof LineString) ||
        geom.getFlatCoordinates().length < 2 * geom.getStride()
      ) {
        continue;
      }
      const meta = f.get('pointMetadata') as PointLink[] | null;
      // The end's link is the last metadata entry, not the one at the last
      // vertex index: mid-drag, OL Modify has already inserted a vertex that
      // the metadata gains only at modifyend (always between two vertices).
      const ends: Array<[PointLink, number[]]> = [
        [meta?.[0], geom.getFirstCoordinate()],
        [meta?.[meta.length - 1], geom.getLastCoordinate()]
      ];
      if (
        ends.some(
          ([link, coord]) =>
            linkedWaypointId(link) === id &&
            drawnTogether(coord, pos, resolution)
        )
      ) {
        return true;
      }
    }
  }
  return false;
}
