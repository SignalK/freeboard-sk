import { getGreatCircleBearing } from 'geolib';
import { GeoUtils } from 'src/app/lib/geoutils';
import { Position } from 'src/app/types';

const TWO_PI = 2 * Math.PI;

/** Body of the Radar API's acquire request (`POST /radars/{id}/targets`). */
export interface AcquireRequest {
  /** radians true, [0, 2π) */
  bearing: number;
  /** metres */
  distance: number;
}

/**
 * Where `at` lies from the radar, as the Radar API wants it to acquire a
 * target there. Null when either position is missing or `at` is the radar
 * itself, which the API refuses.
 */
export function acquireRequest(
  radar: Position | null | undefined,
  at: Position | null | undefined
): AcquireRequest | null {
  if (!radar || !at) {
    return null;
  }
  const distance = GeoUtils.distanceTo(radar, at);
  if (!Number.isFinite(distance) || distance <= 0) {
    return null;
  }
  const bearing = (getGreatCircleBearing(radar, at) * Math.PI) / 180;
  return { bearing: ((bearing % TWO_PI) + TWO_PI) % TWO_PI, distance };
}

/**
 * The radar and its target number behind a radar target's context,
 * `targets.radar:<radarId>-<n>`. Null for any other context.
 */
export function radarTargetRef(
  context: string | null | undefined
): { radarId: string; targetId: number } | null {
  const m = /^targets\.radar:(.+)-(\d+)$/.exec(context ?? '');
  return m ? { radarId: m[1], targetId: Number(m[2]) } : null;
}
