/***********************************
Vessel orientation source resolution
***********************************/
import { SKVessel } from 'src/app/modules/skresources/resource-classes';

/** `preferredPaths.heading` value selecting automatic orientation resolution. */
export const AUTO_ORIENTATION = 'auto';

/**
 * How long a heading stays usable after the last heading delta.
 *
 * Heading sources report fast (PGN 127250 is nominally 10Hz, and a fluxgate or
 * satellite compass arrives sub-second through Signal K), so 10s is ~100x the
 * normal interval. The asymmetry is deliberate: too short and a stalled stream
 * flips orientation to COG and back, which is visible on screen as a flapping
 * icon; too long merely holds a dead compass's last heading a few extra
 * seconds, which nobody notices. Bias long.
 */
export const HEADING_MAX_AGE_MS = 10000;

/**
 * SOG below which COG is GPS noise rather than a direction of travel.
 * 0.2572 m/s is ~0.5kn — the figure suggested in #338.
 */
export const MIN_COG_SOG = 0.2572;

/** Deltas that can change the automatic orientation result. */
export const ORIENTATION_SOURCE_PATHS = new Set([
  'navigation.headingTrue',
  'navigation.headingMagnetic',
  'navigation.courseOverGroundTrue',
  'navigation.courseOverGroundMagnetic',
  'navigation.speedOverGround'
]);

/**
 * Resolve vessel orientation from the best source currently available.
 *
 * Orientation drives the vessel icon, the heading line, course-up map rotation
 * and the reference bearing for a wind *angle*, so heading takes precedence
 * over COG: heading is where the bow points, which is what all four represent,
 * and its divergence from COG is the leeway/set the display exists to show.
 * Defaulting to COG collapsed the heading and COG lines onto each other and
 * spun the icon at anchor (#704, and #338 before it).
 *
 * COG stands in only when no fresh heading is reported, and then only while
 * actually making way — below MIN_COG_SOG it is GPS noise.
 *
 * When nothing qualifies the previous orientation is held rather than reset:
 * the bow has not moved, and freezing avoids the oscillation a boat drifting
 * across the SOG threshold would otherwise show.
 */
export function resolveOrientation(d: SKVessel) {
  const now = Date.now();
  if (
    d.headingTrue !== null &&
    now - d.headingTrueUpdatedAt <= HEADING_MAX_AGE_MS
  ) {
    d.orientation = d.headingTrue;
    return;
  }
  if (
    d.headingMagnetic !== null &&
    now - d.headingMagneticUpdatedAt <= HEADING_MAX_AGE_MS
  ) {
    d.orientation = d.headingMagnetic;
    return;
  }
  const cog = d.cogTrue ?? d.cogMagnetic;
  if (typeof cog === 'number' && (d.sog ?? 0) >= MIN_COG_SOG) {
    d.orientation = cog;
  }
}
