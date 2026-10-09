import { Convert, TARGET_UNIT } from 'src/app/lib/convert';
import { ActiveRadar } from './radar-api.service';

// Ring counts tried in turn: the first that puts the rings at round distances
// wins, as on a radar display. Four is the fallback.
const RING_COUNTS = [4, 3, 6, 5, 2];
const DEFAULT_RING_COUNT = RING_COUNTS[0];
const ROUNDING_TOLERANCE = 1e-6;
// Radars report their range in whole metres, so 1/8 NM arrives as 231 m.
const RANGE_TOLERANCE_M = 1;
// A range's leading digits step in eighths, as in 0.125 or 0.0625 NM.
const RANGE_STEP = 1 / 8;
const SPACING_STEP = 1 / 2;

/** The nearest whole number, or the nearest value whose leading digits are a
 *  multiple of step. */
function nearestRound(value: number, step: number): number {
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const leading = Math.round(value / magnitude / step) * step * magnitude;
  const whole = Math.round(value);
  return whole >= 1 && Math.abs(whole - value) < Math.abs(leading - value)
    ? whole
    : leading;
}

/** True for a whole number or a value whose leading digits are a whole or a
 *  half number, e.g. 0.25, 1.5, 3, 16, 500, but not 0.375. */
export function isRoundDistance(value: number): boolean {
  return (
    value > 0 &&
    Math.abs(nearestRound(value, SPACING_STEP) - value) <
      ROUNDING_TOLERANCE * value
  );
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
 * unit the range was set in, the user's unit first, with the outer ring on
 * the range itself.
 */
export function rangeRingScale(
  range: number | undefined,
  userUnit: TARGET_UNIT
): RangeRingScale | undefined {
  if (!(range > 0)) {
    return undefined;
  }
  const ringsOf = (count: number, spacing: number) =>
    Array.from({ length: count }, (_, i) => spacing * (i + 1));
  for (const unit of [userUnit, ...RADAR_UNITS]) {
    const metresPerUnit = 1 / Convert.transform(1, 'm', unit);
    // the range as set on the radar, e.g. 0.125 NM for 231 m
    const nominal = nearestRound(range / metresPerUnit, RANGE_STEP);
    if (Math.abs(nominal * metresPerUnit - range) > RANGE_TOLERANCE_M) {
      continue;
    }
    const count = RING_COUNTS.find((n) => isRoundDistance(nominal / n));
    if (count) {
      return {
        unit,
        distances: ringsOf(count, (nominal / count) * metresPerUnit)
      };
    }
  }
  return {
    unit: userUnit,
    distances: ringsOf(DEFAULT_RING_COUNT, range / DEFAULT_RING_COUNT)
  };
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
