import { ActiveRadar } from './radar-api.service';
import { powerState } from './radar-controls';

// Ring counts tried in turn: the first that puts the rings at round distances
// wins, as on a radar display. Four is the fallback.
const RING_COUNTS = [4, 3, 6, 5, 2];
const DEFAULT_RING_COUNT = RING_COUNTS[0];
const ROUNDING_TOLERANCE = 1e-6;

/** True for a value whose leading digits are a whole or a half number,
 *  e.g. 0.25, 1.5, 3, 500, but not 0.375. */
export function isRoundDistance(value: number): boolean {
  if (!(value > 0)) {
    return false;
  }
  const mantissa = value / Math.pow(10, Math.floor(Math.log10(value)));
  const halves = mantissa * 2;
  return Math.abs(halves - Math.round(halves)) < ROUNDING_TOLERANCE;
}

/**
 * Return evenly spaced ring distances in meters, ending at `range` (meters).
 * Prefer round spacing in the unit `toUnit` converts meters to, trying ring
 * counts 4, 3, 6, 5, then 2; fall back to four rings if none qualifies.
 * Return no rings for an absent, non-positive, or NaN range.
 * @throws Propagates errors from `toUnit`.
 */
export function rangeRingDistances(
  range: number,
  toUnit: (metres: number) => number
): number[] {
  if (!(range > 0)) {
    return [];
  }
  const count =
    RING_COUNTS.find((n) => isRoundDistance(toUnit(range / n))) ??
    DEFAULT_RING_COUNT;
  return Array.from({ length: count }, (_, i) => (range * (i + 1)) / count);
}

const MAX_LABEL_DECIMALS = 2;

/**
 * Decimal places for a ring distance in the user unit, capped at two (e.g. 2
 * for 0.75). Accept zero or one decimal place when the scaled value is within
 * 1e-6 of an integer; otherwise return two, including for non-finite values.
 */
export function labelDecimals(value: number): number {
  for (let p = 0; p < MAX_LABEL_DECIMALS; p++) {
    const scaled = value * Math.pow(10, p);
    if (Math.abs(scaled - Math.round(scaled)) < ROUNDING_TOLERANCE) {
      return p;
    }
  }
  return MAX_LABEL_DECIMALS;
}

/**
 * The radar's numeric range (m), or undefined when absent or non-numeric.
 * Numeric values are returned unchanged, without checking positivity or finiteness.
 */
export function radarRange(radar: ActiveRadar | undefined): number | undefined {
  const value = radar?.controls?.get('range')?.value;
  return typeof value === 'number' ? value : undefined;
}

/** True when the radar reports standby, off or a fault, so it sends no
 *  image. A radar warming up counts as transmitting, so its picture appears
 *  as soon as it is ready, and so does one whose power state is unknown. */
export function isRadarInStandby(radar: ActiveRadar | undefined): boolean {
  const state = powerState(
    radar?.capabilities?.controls?.['power'],
    radar?.controls?.get('power')?.value
  );
  return state === 'standby' || state === 'off' || state === 'fault';
}
