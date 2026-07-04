import { getGreatCircleBearing } from 'geolib';
import { GeoUtils } from 'src/app/lib/geoutils';
import { Position } from 'src/app/types';

/** Bearing / distance / ETA from the vessel to the cursor for the status-bar readout. */
export interface CursorEtaInfo {
  bearing: number; // degrees (0..360)
  distance: number; // metres
  timeToGo: number | null; // seconds; null when no usable speed
}

// Below this speed (m/s, ~0.1 kn) the vessel is treated as stopped and the
// configured reference speed is used for the ETA instead of live SOG.
const STOPPED_SOG_THRESHOLD = 0.05;

/**
 * Compute the cursor bearing, distance and ETA relative to the vessel position.
 * Uses live SOG when under way; falls back to the reference speed (e.g. at
 * anchor or hove to) when SOG is ~0. `timeToGo` is null when neither speed is
 * usable.
 * @param from vessel position `[lon, lat]`
 * @param to cursor position `[lon, lat]`
 * @param sog vessel speed over ground (m/s)
 * @param referenceSpeed fallback speed (m/s) used when the vessel is stopped
 */
export function computeCursorEta(
  from: Position,
  to: Position,
  sog: number | null | undefined,
  referenceSpeed: number | null | undefined
): CursorEtaInfo {
  const distance = GeoUtils.distanceTo(from, to) ?? 0;
  const bearing = getGreatCircleBearing(from, to) ?? 0;
  const speed =
    typeof sog === 'number' && sog > STOPPED_SOG_THRESHOLD
      ? sog
      : (referenceSpeed ?? 0);
  const timeToGo = speed > 0 ? distance / speed : null;
  return { bearing, distance, timeToGo };
}
