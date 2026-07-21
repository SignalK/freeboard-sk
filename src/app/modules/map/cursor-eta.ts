import { getGreatCircleBearing } from 'geolib';
import { GeoUtils } from 'src/app/lib/geoutils';
import { Position } from 'src/app/types';

/** Bearing / distance / ETA from the vessel to the cursor for the status-bar readout. */
export interface CursorEtaInfo {
  bearing: number; // degrees (0..360)
  distance: number; // metres
  timeToGo: number | null; // seconds; null when no usable speed
}

// At or below this speed the vessel is treated as stopped and the configured reference
// speed is used for the ETA instead of live SOG. Set at ~1 kn: at anchor or moored,
// GPS SOG noise routinely spikes to several tenths of a knot — still not making way,
// but a lower threshold lets those spikes through and produces absurd multi-day ETAs
// (#555). One knot is the point below which the vessel isn't making meaningful way,
// so the reference speed gives a more useful estimate.
const STOPPED_SOG_THRESHOLD = 1 / 1.94384; // ~0.514 m/s (1 kn)

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
