/**
 * True angles for drawing on the chart.
 *
 * The chart is laid out to true north, so everything drawn on it needs a TRUE
 * angle. Some boats report only magnetic values; with the local magnetic
 * variation (`navigation.magneticVariation`) the true angle can still be
 * derived (#858).
 */

const TWO_PI = 2 * Math.PI;

/**
 * True angle (radians, 0..2π) from a magnetic angle and the magnetic variation,
 * both in radians. Variation is easterly-positive, as in the Signal K spec, so
 * true = magnetic + variation. Null when either is unavailable.
 */
export function magneticToTrue(
  magnetic: number | null | undefined,
  variation: number | null | undefined
): number | null {
  if (!Number.isFinite(magnetic) || !Number.isFinite(variation)) {
    return null;
  }
  return (((magnetic + variation) % TWO_PI) + TWO_PI) % TWO_PI;
}

/**
 * TRUE wind direction (radians) for drawing: `wind.twd` when reported, else
 * magnetic wind direction corrected by the vessel's variation, else null.
 *
 * Never `wind.direction` — that follows the true/magnetic display setting.
 */
export function trueWindDirection(vessel: {
  wind: { twd: number | null; mwd?: number | null };
  magneticVariation?: number | null;
}): number | null {
  if (Number.isFinite(vessel.wind.twd)) {
    return vessel.wind.twd;
  }
  return magneticToTrue(vessel.wind.mwd, vessel.magneticVariation);
}
