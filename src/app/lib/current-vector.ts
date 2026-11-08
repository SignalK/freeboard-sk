import { magneticToTrue } from './true-bearing';

/** Current at the vessel: `set` is the TRUE direction the water flows
 * towards (radians), `drift` its speed (m/s). */
export interface CurrentVector {
  set: number;
  drift: number;
}

/** What the current is worked out from, as kept on the own vessel. */
export interface CurrentSource {
  sog?: number | null;
  cogTrue: number | null;
  cogMagnetic: number | null;
  headingTrue: number | null;
  headingMagnetic: number | null;
  magneticVariation: number | null;
  stw: number | null;
  stwUpdatedAt: number;
  current: {
    setTrue: number | null;
    setMagnetic: number | null;
    drift: number | null;
  };
  currentUpdatedAt: { setTrue: number; setMagnetic: number; drift: number };
}

/** A log or current value older than this is no longer used: when the log
 * stops reporting, its last value would turn into a made-up current. */
export const CURRENT_INPUT_MAX_AGE_MS = 10000;

/** Time constant of the smoothing: heading swings in a seaway and GPS noise
 * would make the arrow jump, while the current itself changes over minutes. */
export const CURRENT_SMOOTHING_MS = 30000;

/** Below this (0.1 kn) the result is within the noise of log and GPS. */
export const CURRENT_MIN_DRIFT = 0.1 / 1.943844;

const KNOTS_PER_MS = 1.943844;
const ARROW_PX_PER_KNOT = 60;
const ARROW_MIN_PX = 24;
const ARROW_MAX_PX = 200;

const TWO_PI = 2 * Math.PI;

const finite = (v: number | null | undefined): v is number =>
  typeof v === 'number' && Number.isFinite(v);

const fromComponents = (east: number, north: number): CurrentVector => ({
  set: (Math.atan2(east, north) + TWO_PI) % TWO_PI,
  drift: Math.hypot(east, north)
});

/**
 * Current as the difference between the motion over ground (SOG along COG)
 * and the motion through the water (STW along the heading). Leeway is not
 * separated out, so under sail it shows up as part of the current. Null when
 * any of the four is missing.
 */
export function currentFromMotion(
  sog: number | null | undefined,
  cog: number | null | undefined,
  stw: number | null | undefined,
  heading: number | null | undefined
): CurrentVector | null {
  if (!finite(sog) || !finite(cog) || !finite(stw) || !finite(heading)) {
    return null;
  }
  return fromComponents(
    sog * Math.sin(cog) - stw * Math.sin(heading),
    sog * Math.cos(cog) - stw * Math.cos(heading)
  );
}

/**
 * The vessel's current: `environment.current` when a source on board
 * publishes it, else worked out from its motion. `smoothed` is false for the
 * published value, which its source has already filtered.
 */
export function currentSample(
  v: CurrentSource,
  now: number
): { vector: CurrentVector; smoothed: boolean } | null {
  const variation = v.magneticVariation;
  const fresh = (at: number) => now - at <= CURRENT_INPUT_MAX_AGE_MS;
  const { current, currentUpdatedAt } = v;
  const set =
    finite(current.setTrue) && fresh(currentUpdatedAt.setTrue)
      ? current.setTrue
      : fresh(currentUpdatedAt.setMagnetic)
        ? magneticToTrue(current.setMagnetic, variation)
        : null;
  if (finite(set) && finite(current.drift) && fresh(currentUpdatedAt.drift)) {
    return { vector: { set, drift: current.drift }, smoothed: false };
  }
  if (now - v.stwUpdatedAt > CURRENT_INPUT_MAX_AGE_MS) {
    return null;
  }
  const vector = currentFromMotion(
    v.sog,
    v.cogTrue ?? magneticToTrue(v.cogMagnetic, variation),
    v.stw,
    v.headingTrue ?? magneticToTrue(v.headingMagnetic, variation)
  );
  return vector ? { vector, smoothed: true } : null;
}

/** Exponential smoothing of the current, on its east and north components so
 * that a set either side of north averages correctly. Time is the data's own
 * (epoch ms), so a playback at a higher rate smooths over the same stretch of
 * the voyage as live data. */
export class CurrentSmoother {
  private state: { east: number; north: number; at: number } | null = null;

  update(
    sample: { vector: CurrentVector; smoothed: boolean } | null,
    now: number
  ): CurrentVector | null {
    if (!sample) {
      this.state = null;
      return null;
    }
    if (!sample.smoothed) {
      this.state = null;
      return sample.vector;
    }
    const east = sample.vector.drift * Math.sin(sample.vector.set);
    const north = sample.vector.drift * Math.cos(sample.vector.set);
    if (!this.state) {
      this.state = { east, north, at: now };
    } else {
      const k =
        1 - Math.exp(-Math.max(0, now - this.state.at) / CURRENT_SMOOTHING_MS);
      this.state = {
        east: this.state.east + k * (east - this.state.east),
        north: this.state.north + k * (north - this.state.north),
        at: now
      };
    }
    return fromComponents(this.state.east, this.state.north);
  }
}

/** On-screen length of the current arrow (pixels), growing with the drift. */
export function currentArrowLength(drift: number): number {
  return Math.min(
    ARROW_MAX_PX,
    Math.max(ARROW_MIN_PX, drift * KNOTS_PER_MS * ARROW_PX_PER_KNOT)
  );
}
