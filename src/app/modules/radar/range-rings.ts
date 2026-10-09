import { Convert, TARGET_UNIT } from 'src/app/lib/convert';
import { ActiveRadar } from './radar-api.service';

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

// Tried after the user's unit: radar ranges step in nautical miles or in
// kilometres, and a radar display labels its rings in the range's unit.
const RADAR_UNITS: TARGET_UNIT[] = ['naut-mile', 'kilometer'];

export interface RangeRingScale {
  /** the unit the rings are spaced and labelled in */
  unit: TARGET_UNIT;
  /** metres, the outer ring on the range */
  distances: number[];
}

/**
 * Range rings for a radar range (m): evenly spaced at round values in the
 * user's unit, or else in the first radar unit that divides the range into
 * round values, with the outer ring on the range itself.
 */
export function rangeRingScale(
  range: number | undefined,
  userUnit: TARGET_UNIT
): RangeRingScale | undefined {
  if (!(range > 0)) {
    return undefined;
  }
  const ringsOf = (count: number) =>
    Array.from({ length: count }, (_, i) => (range * (i + 1)) / count);
  for (const unit of [userUnit, ...RADAR_UNITS]) {
    const inUnit = Convert.transform(range, 'm', unit);
    const count = RING_COUNTS.find((n) => isRoundDistance(inUnit / n));
    if (count) {
      return { unit, distances: ringsOf(count) };
    }
  }
  return { unit: userUnit, distances: ringsOf(DEFAULT_RING_COUNT) };
}

const MAX_LABEL_DECIMALS = 3;

/** The decimals a ring distance needs, e.g. 2 for 0.75. */
export function labelDecimals(value: number): number {
  for (let p = 0; p < MAX_LABEL_DECIMALS; p++) {
    const scaled = value * Math.pow(10, p);
    if (Math.abs(scaled - Math.round(scaled)) < ROUNDING_TOLERANCE) {
      return p;
    }
  }
  return MAX_LABEL_DECIMALS;
}

/** A ring's label in the unit its rings are spaced in, so a set of rings
 *  reads 0.1, 0.2 … 0.5 nmi rather than switching to metres for the short
 *  ones as formatValueForDisplay() does. */
export function ringLabel(distance: number, unit: TARGET_UNIT): string {
  const value = Convert.transform(distance, 'm', unit);
  return `${value.toFixed(labelDecimals(value))}${Convert.getSymbol(unit)}`;
}

/** The radar's range (m), or undefined when it has not reported one. */
export function radarRange(radar: ActiveRadar | undefined): number | undefined {
  const value = radar?.controls?.get('range')?.value;
  return typeof value === 'number' ? value : undefined;
}
