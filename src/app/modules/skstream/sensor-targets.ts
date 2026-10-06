import {
  SKSensorTarget,
  SKVessel
} from 'src/app/modules/skresources/resource-classes';
import { GeoUtils } from 'src/app/lib/geoutils';
import { PathValue, Position } from 'src/app/types';

/*
 * Radar, camera and other sensor targets: `targets.<type>:<id>` contexts that
 * report the same navigation paths as a vessel. A target can name the context
 * it is the same object as in `sameAs` (an AIS vessel, or the target that
 * first saw a boat without AIS), set by a fusion plugin.
 */

/**
 * A target its sensor stopped updating is dropped after this long, well
 * before the AIS age: a radar or camera that still sees a boat reports it
 * every few seconds.
 */
export const TARGET_MAX_AGE_MS = 60_000;

/**
 * Whether the target's sensor has stopped reporting it. A target that has no
 * position yet counts from its last value of any kind, so a link that
 * arrives before the position is not lost.
 */
export function isSilent(target: SKSensorTarget, now: number): boolean {
  const seen = target.positionUpdatedAt || target.lastUpdated.valueOf();
  return now - seen > TARGET_MAX_AGE_MS;
}

/**
 * Apply one delta value to the target with context `id`. A null position means
 * the sensor lost the track, so the target is dropped. A lost track stays in
 * the server's data model with null values, which a null value for a target
 * not held here must not bring back.
 * @param cogLineMinutes length of the course line, in minutes of travel at
 * the target's speed, as for AIS vessels
 * @returns false when the target was dropped
 */
export function processSensorTarget(
  targets: Map<string, SKSensorTarget>,
  id: string,
  v: PathValue,
  cogLineMinutes: number
): boolean {
  if (v.path === 'navigation.position' && !isLonLat(v.value)) {
    targets.delete(id);
    return false;
  }
  if (v.value === null && !targets.has(id)) {
    return false;
  }
  let d = targets.get(id);
  if (!d) {
    d = new SKSensorTarget();
    d.id = id;
    d.position = null;
    const type = id.slice('targets.'.length).split(':')[0];
    d.type.name = `${type.charAt(0).toUpperCase()}${type.slice(1)} target`;
    targets.set(id, d);
  }
  d.lastUpdated = new Date();
  const value = v.value as Record<string, unknown>;
  switch (v.path) {
    case '':
      if (typeof value?.name === 'string') {
        d.name = value.name;
      }
      if (typeof value?.mmsi === 'string') {
        d.mmsi = value.mmsi;
      }
      break;
    case 'name':
      d.name = v.value as string;
      break;
    case 'mmsi':
      d.mmsi = v.value as string;
      break;
    case 'sameAs':
      d.sameAs = typeof v.value === 'string' ? v.value : null;
      break;
    case 'navigation.position':
      d.position = GeoUtils.normaliseCoords([
        value.longitude as number,
        value.latitude as number
      ]);
      d.positionReceived = true;
      d.positionUpdatedAt = Date.now();
      break;
    case 'navigation.courseOverGroundTrue':
      d.cog = finiteOrUndefined(v.value);
      d.orientation = d.cog ?? 0;
      break;
    case 'navigation.speedOverGround':
      d.sog = finiteOrUndefined(v.value);
      break;
  }
  if (d.cog === undefined) {
    d.vectors.cog = null;
  } else if (d.position) {
    d.vectors.cog = [
      d.position,
      GeoUtils.rhumbDestination(
        d.position,
        d.cog,
        (d.sog ?? 0) * cogLineMinutes * 60
      )
    ];
  }
  return true;
}

/**
 * The targets to draw: each boat once. A target linked to a vessel on the
 * chart, own vessel included, is left out, and targets linked to each other
 * are drawn as the one they lead to. A link to a context that is gone or has
 * no position yet, such as a vessel whose AIS expired, is ignored, so the
 * sensor's view of the boat stays on the chart.
 */
export function unlinkedTargets(
  targets: Map<string, SKSensorTarget>,
  vessels: Map<string, SKVessel>,
  self?: SKVessel
): Map<string, SKSensorTarget> {
  const charted = (context: string): boolean => {
    const vessel =
      context === 'vessels.self' || context === self?.id
        ? self
        : vessels.get(context);
    return Boolean(vessel?.position);
  };
  const shown = new Map<string, SKSensorTarget>();
  targets.forEach((target, id) => {
    if (rootOf(id, targets, charted) === id) {
      shown.set(id, target);
    }
  });
  return shown;
}

/**
 * The context that stands for a target's object: links are followed to a
 * vessel on the chart or to a target without a usable link. A target without
 * a position is not a usable link. Targets linked in a loop agree on the
 * first of them by id.
 */
function rootOf(
  id: string,
  targets: Map<string, SKSensorTarget>,
  charted: (context: string) => boolean
): string {
  const visited: string[] = [];
  let current = id;
  for (;;) {
    visited.push(current);
    const next = targets.get(current).sameAs;
    if (next !== null && charted(next)) {
      return next;
    }
    if (next === null || !targets.get(next)?.position) {
      return current;
    }
    const loop = visited.indexOf(next);
    if (loop !== -1) {
      return visited.slice(loop).sort()[0];
    }
    current = next;
  }
}

/**
 * The vessels as drawn: a vessel that a sensor target is linked to is placed
 * at whichever of them reported its position last, with that one's course
 * line, so a boat whose AIS fell silent follows the radar still tracking it.
 * The others are returned as they are.
 */
export function fusedVessels(
  vessels: Map<string, SKVessel>,
  targets: Map<string, SKSensorTarget>
): Map<string, SKVessel> {
  const freshest = new Map<string, SKSensorTarget>();
  targets.forEach((target) => {
    const vessel = target.sameAs ? vessels.get(target.sameAs) : undefined;
    if (
      vessel &&
      target.position &&
      target.positionUpdatedAt > vessel.positionUpdatedAt &&
      target.positionUpdatedAt >
        (freshest.get(target.sameAs)?.positionUpdatedAt ?? 0)
    ) {
      freshest.set(target.sameAs, target);
    }
  });
  if (freshest.size === 0) {
    return vessels;
  }
  const fused = new Map(vessels);
  freshest.forEach((target, id) => {
    const vessel = vessels.get(id);
    fused.set(
      id,
      Object.assign(Object.create(Object.getPrototypeOf(vessel)), vessel, {
        position: target.position,
        positionUpdatedAt: target.positionUpdatedAt,
        vectors: { ...vessel.vectors, cog: target.vectors.cog }
      })
    );
  });
  return fused;
}

/**
 * Position of the object a collision alarm names: an AIS vessel, a sensor
 * target, or a vessel no longer on the chart that a sensor target is linked
 * to, which the sensor then locates.
 */
export function locateTarget(
  id: string,
  vessels: Map<string, SKVessel>,
  targets: Map<string, SKSensorTarget>
): Position | undefined {
  const candidates = [
    vessels.get(id),
    targets.get(id),
    ...[...targets.values()].filter((t) => t.sameAs === id)
  ];
  return candidates.find((c) => c?.position)?.position ?? undefined;
}

function finiteOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

function isLonLat(value: unknown): boolean {
  const p = value as { latitude?: unknown; longitude?: unknown } | null;
  return (
    typeof p?.latitude === 'number' &&
    typeof p.longitude === 'number' &&
    Math.abs(p.latitude) <= 90 &&
    Math.abs(p.longitude) <= 180
  );
}
