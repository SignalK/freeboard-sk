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
 * Apply one delta value to the target with context `id`. A null position means
 * the sensor lost the track, so the target is dropped.
 * @returns false when the target was dropped
 */
export function processSensorTarget(
  targets: Map<string, SKSensorTarget>,
  id: string,
  v: PathValue
): boolean {
  if (v.path === 'navigation.position' && !isLonLat(v.value)) {
    targets.delete(id);
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
      d.orientation = v.value as number;
      break;
    case 'navigation.speedOverGround':
      d.sog = v.value as number;
      break;
  }
  return true;
}

/**
 * The targets to draw: each boat once. A target linked to a vessel on the
 * chart is left out, and targets linked to each other are drawn as the one
 * they lead to. A link to a context that is gone, such as a vessel whose AIS
 * expired, is ignored, so the sensor's view of the boat stays on the chart.
 */
export function unlinkedTargets(
  targets: Map<string, SKSensorTarget>,
  vessels: Map<string, SKVessel>
): Map<string, SKSensorTarget> {
  const shown = new Map<string, SKSensorTarget>();
  targets.forEach((target, id) => {
    if (rootOf(id, targets, vessels) === id) {
      shown.set(id, target);
    }
  });
  return shown;
}

/**
 * The context that stands for a target's object: links are followed to a
 * vessel on the chart or to a target without a usable link. Targets linked in
 * a loop agree on the first of them by id.
 */
function rootOf(
  id: string,
  targets: Map<string, SKSensorTarget>,
  vessels: Map<string, SKVessel>
): string {
  const visited: string[] = [];
  let current = id;
  for (;;) {
    visited.push(current);
    const next = targets.get(current).sameAs;
    if (next !== null && vessels.has(next)) {
      return next;
    }
    if (next === null || !targets.has(next)) {
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
 * Position of the object a collision alarm names: an AIS vessel, a sensor
 * target, or a vessel no longer on the chart that a sensor target is linked
 * to, which the sensor then locates.
 */
export function locateTarget(
  id: string,
  vessels: Map<string, SKVessel>,
  targets: Map<string, SKSensorTarget>
): Position | undefined {
  const located =
    vessels.get(id) ??
    targets.get(id) ??
    [...targets.values()].find((t) => t.sameAs === id && t.position);
  return located?.position ?? undefined;
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
