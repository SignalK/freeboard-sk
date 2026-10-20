// Map targets for extension actions (capability `actions`): turn what the user
// selected on the chart into the target object the API delivers. Pure, so the
// id conventions of the map's features are tested without a map.

import type { FeatureLike } from 'ol/Feature';
import type RenderFeature from 'ol/render/Feature';
import { toLonLat } from 'ol/proj';

import { GeoUtils } from 'src/app/lib/geoutils';
import type {
  FBNote,
  FBRegion,
  FBRoute,
  FBTrack,
  FBWaypoint,
  Position
} from 'src/app/types';
import type {
  SKAtoN,
  SKVessel
} from 'src/app/modules/skresources/resource-classes';
import type { RouteBuffer } from 'src/app/modules/plotterext/route-buffer.registry';
import type {
  MapTarget,
  SelectedTarget
} from 'src/app/modules/plotterext/actions';
import { isStoredTrack } from 'src/app/modules/skresources/track-store';
import type { OverlayHit } from './ol/lib/data-overlay/overlay-hits';
import { S57_NAMES } from './popovers';

/** What the map knows about the features a target can be made from. */
export interface TargetSources {
  waypoint(id: string): FBWaypoint | undefined;
  note(id: string): FBNote | undefined;
  route(id: string): FBRoute | undefined;
  region(id: string): FBRegion | undefined;
  track(id: string): FBTrack | undefined;
  /** A drawn route that is unsaved or has unsaved edits, by its `routeId`. */
  draftRoute(routeId: string): RouteBuffer | undefined;
  /** The visible-set `routeId` of a stored route (capability `routes`). */
  visibleRouteId(id: string): string | undefined;
  self(): SKVessel | undefined;
  /** An AIS vessel by context (`vessels.<urn>`). */
  vessel(context: string): SKVessel | undefined;
  /** An aid to navigation by context. */
  aton(context: string): SKAtoN | undefined;
}

/** A target selected on the chart, with the header the host names it by. */
export interface ChartTarget extends SelectedTarget {
  /** Names the target in a menu header. */
  label: string;
}

const canon = (p: Position): [number, number] => {
  const [lon, lat] = GeoUtils.normaliseCoords(p);
  return [lon, lat];
};

/** A usable `[lon, lat]`, or undefined. */
const pointOf = (p: unknown): [number, number] | undefined =>
  Array.isArray(p) &&
  typeof p[0] === 'number' &&
  typeof p[1] === 'number' &&
  Number.isFinite(p[0]) &&
  Number.isFinite(p[1])
    ? canon([p[0], p[1]])
    : undefined;

/** Copy only the defined optional fields, so a target carries no `undefined`. */
const defined = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

/** The point the user selected, as a target. */
export function positionTarget(at: Position): ChartTarget {
  const position = canon(at);
  return { target: { kind: 'position', position }, label: '' };
}

/**
 * The target of one of the map's own features, by the feature id the map
 * gives it (`waypoint.<id>`, `ais-vessels.<urn>` …), or null when it is not
 * something actions apply to.
 */
export function featureTarget(
  featureId: string,
  at: Position,
  src: TargetSources
): ChartTarget | null {
  const position = canon(at);
  const dot = featureId.indexOf('.');
  const prefix = dot < 0 ? featureId : featureId.slice(0, dot);
  const rest = dot < 0 ? '' : featureId.slice(dot + 1);

  const stored = (
    kind: 'waypoint' | 'note' | 'region',
    item: FBWaypoint | FBNote | FBRegion | undefined,
    featurePosition?: [number, number]
  ): ChartTarget | null => {
    if (!item) return null;
    const name = item[1].name || undefined;
    return {
      target: defined({
        kind,
        position,
        id: item[0],
        href: `/resources/${kind}s/${item[0]}`,
        name,
        featurePosition
      }) as MapTarget,
      match: item[1],
      label: name ?? kind[0].toUpperCase() + kind.slice(1)
    };
  };

  switch (prefix) {
    case 'waypoint': {
      const w = src.waypoint(rest);
      return stored(
        'waypoint',
        w,
        pointOf(w?.[1].feature?.geometry?.coordinates)
      );
    }
    case 'note': {
      const n = src.note(rest);
      const p = n?.[1].position;
      return stored(
        'note',
        n,
        p ? pointOf([p.longitude, p.latitude]) : undefined
      );
    }
    case 'region':
      return stored('region', src.region(rest));
    case 'route': {
      const draft = src.draftRoute(rest);
      if (draft && !draft.saved) {
        const name = draft.name || undefined;
        return {
          target: defined({
            kind: 'route',
            position,
            routeId: draft.routeId,
            name
          }) as MapTarget,
          match: { name: draft.name ?? '' },
          label: name ?? 'Route (unsaved)'
        };
      }
      const r = src.route(draft?.href ?? rest);
      if (!r) return null;
      const name = (draft?.name ?? r[1].name) || undefined;
      return {
        target: defined({
          kind: 'route',
          position,
          id: r[0],
          href: `/resources/routes/${r[0]}`,
          routeId: draft?.routeId ?? src.visibleRouteId(r[0]),
          name
        }) as MapTarget,
        match: r[1],
        label: name ?? 'Route'
      };
    }
    case 'track': {
      const t = src.track(rest);
      if (!t) return null;
      const name = t[1].name || undefined;
      return {
        target: defined({
          kind: 'track',
          position,
          id: t[0],
          href: isStoredTrack(t[1].feature)
            ? `/tracks/${encodeURIComponent(t[0])}`
            : `/resources/tracks/${t[0]}`,
          name
        }) as MapTarget,
        match: { name: t[1].name, description: t[1].description },
        label: name ?? 'Track'
      };
    }
    case 'vessels': {
      // The own vessel's feature id is its context (`vessels.<urn>`, the
      // server's self id); AIS vessels are `ais-vessels.*`.
      if (!rest) return null;
      const v = src.self();
      const name = v?.name || undefined;
      return {
        target: defined({
          kind: 'vessel',
          position,
          context: featureId,
          self: true,
          name,
          featurePosition: pointOf(v?.position)
        }) as MapTarget,
        label: name ?? 'Own vessel'
      };
    }
    case 'ais-vessels': {
      const context = `vessels.${rest}`;
      const v = src.vessel(context);
      if (!v) return null;
      const name = v.name || undefined;
      return {
        target: defined({
          kind: 'vessel',
          position,
          context,
          self: false,
          name,
          featurePosition: pointOf(v.position)
        }) as MapTarget,
        label: name ?? v.mmsi ?? 'Vessel'
      };
    }
    case 'atons':
    case 'aton':
    case 'shore': {
      const a = src.aton(featureId);
      if (!a) return null;
      const name = a.name || undefined;
      return {
        target: defined({
          kind: 'aton',
          position,
          context: featureId,
          name,
          featurePosition: pointOf(a.position)
        }) as MapTarget,
        label: name ?? a.mmsi ?? 'Aid to navigation'
      };
    }
    default:
      return null;
  }
}

/** Keys the chart's tile reader adds, which are not the feature's attributes. */
const NOT_ATTRIBUTES = new Set(['layer', 'geometry']);

/**
 * The target of an S-57 chart feature, from its tile properties: `layer` is
 * the object class, `OBJNAM` its name. A point feature's own position comes
 * from its geometry, in the map's projection.
 */
export function chartFeatureTarget(
  props: Record<string, unknown>,
  at: Position,
  feature?: FeatureLike
): ChartTarget {
  const cls = String(props['layer'] ?? '');
  const properties = Object.fromEntries(
    Object.entries(props).filter(([k]) => !NOT_ATTRIBUTES.has(k))
  );
  const name =
    typeof props['OBJNAM'] === 'string' && props['OBJNAM']
      ? props['OBJNAM']
      : undefined;
  const target = defined({
    kind: 'chartFeature',
    position: canon(at),
    class: cls,
    properties,
    name,
    featurePosition: featurePoint(feature)
  }) as MapTarget;
  return {
    target,
    match: target,
    label: name ?? S57_NAMES[cls] ?? (cls || 'Chart feature')
  };
}

/** What a target needs to know about the data overlay a feature belongs to. */
export interface TargetOverlay {
  /** The extension that owns the overlay. */
  extension: string;
  id: string;
  title: string;
  /** The feature property that names a feature. */
  titleProperty: string;
}

/**
 * The target of a selectable data-overlay feature (capability
 * `actions.overlay`). It is the owning extension's alone: `owner` keeps any
 * other extension's actions and picks off it. Named by its `titleProperty`,
 * and headed by the overlay's title when it has none.
 */
export function overlayFeatureTarget(
  hit: OverlayHit,
  overlay: TargetOverlay,
  at: Position
): ChartTarget {
  const title = hit.properties[overlay.titleProperty];
  const named =
    (typeof title === 'string' && title.length > 0) ||
    (typeof title === 'number' && Number.isFinite(title));
  const name = named ? String(title) : undefined;
  const target = defined({
    kind: 'overlayFeature',
    position: canon(at),
    overlayId: overlay.id,
    source: hit.source,
    featureId: hit.featureId,
    properties: hit.properties,
    name,
    featurePosition: featurePoint(hit.feature)
  }) as MapTarget;
  return {
    target,
    match: { id: hit.featureId, properties: hit.properties },
    owner: overlay.extension,
    label: name ?? overlay.title
  };
}

/** A point feature's position as `[lon, lat]`; undefined for any other shape. */
function featurePoint(feature?: FeatureLike): [number, number] | undefined {
  if (!feature) return undefined;
  const geom = (feature as RenderFeature).getGeometry?.();
  if (!geom || geom.getType() !== 'Point') return undefined;
  const flat = (
    geom as unknown as { getFlatCoordinates(): number[] }
  ).getFlatCoordinates();
  return pointOf(toLonLat([flat[0], flat[1]]));
}
