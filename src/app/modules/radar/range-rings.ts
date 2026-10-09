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
 * The distances (m) of range rings for a radar range (m): evenly spaced, the
 * outer ring on the range itself, at round values in the unit `toUnit`
 * converts metres to.
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

/** The decimals a ring distance in the user unit needs, e.g. 2 for 0.75. */
export function labelDecimals(value: number): number {
  for (let p = 0; p < MAX_LABEL_DECIMALS; p++) {
    const scaled = value * Math.pow(10, p);
    if (Math.abs(scaled - Math.round(scaled)) < ROUNDING_TOLERANCE) {
      return p;
    }
  }
  return MAX_LABEL_DECIMALS;
}

/** The radar's range (m), or undefined when it has not reported one. */
export function radarRange(radar: ActiveRadar | undefined): number | undefined {
  const value = radar?.controls?.get('range')?.value;
  return typeof value === 'number' ? value : undefined;
}

/** True when the radar reports standby or off, so it sends no image. A radar
 *  whose power state is unknown counts as transmitting. */
export function isRadarInStandby(radar: ActiveRadar | undefined): boolean {
  const state = powerState(
    radar?.capabilities?.controls?.['power'],
    radar?.controls?.get('power')?.value
  );
  return state === 'standby' || state === 'off';
}
