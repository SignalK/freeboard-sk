/**
 * Laylines to the active destination.
 *
 * Everything here is drawn on a chart laid out to true north, and geolib treats
 * every bearing it is given as true. So every angle in must be TRUE, whatever
 * the user's true/magnetic display choice: feeding magnetic values rotates the
 * whole figure by the local variation (#852).
 *
 * The bearing and distance to the mark are worked out from the same two
 * positions that are drawn, not taken from the server's course calculations, so
 * the vessel layline box always closes on the mark.
 */
import {
  computeDestinationPoint,
  getDistance,
  getGreatCircleBearing
} from 'geolib';
import { Convert } from './convert';
import { Angle } from './geoutils';
import { LineString, MultiLineString, Position } from '../types';

export interface LaylineInput {
  /** vessel the laylines are drawn from */
  vessel: Position;
  /** destination (mark) */
  mark: Position;
  /** TRUE wind direction (radians) */
  twd: number;
  /** beat angle (radians), defaults to 45 degrees */
  beatAngle?: number | null;
  /** gybe angle (radians), no downwind laylines without it */
  gybeAngle?: number | null;
}

export interface Laylines {
  /** target-angle lines through the mark */
  targetAngle: LineString;
  /** the vessel layline box, drawn only when the mark lies inside the target angle */
  port: MultiLineString;
  starboard: MultiLineString;
}

export const NO_LAYLINES: Laylines = {
  targetAngle: [],
  port: [],
  starboard: []
};

const isPosition = (p: unknown): p is Position =>
  Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number';

/**
 * Select the layline inputs from vessel data, or null when they can't be drawn.
 *
 * Reads `wind.twd`, never `wind.direction` — the latter follows the
 * true/magnetic display setting. With no true wind direction the laylines are
 * skipped rather than drawn for an assumed wind.
 */
export function laylineInput(
  vessel: Position | null | undefined,
  mark: Position | null | undefined,
  self: {
    wind: { twd: number | null };
    performance: { beatAngle: number | null; gybeAngle: number | null };
  }
): LaylineInput | null {
  if (
    !isPosition(vessel) ||
    !isPosition(mark) ||
    typeof self.wind.twd !== 'number'
  ) {
    return null;
  }
  return {
    vessel,
    mark,
    twd: self.wind.twd,
    beatAngle: self.performance.beatAngle,
    gybeAngle: self.performance.gybeAngle
  };
}

/** Calculate the target-angle lines at the mark and the vessel layline box. */
export function computeLaylines(input: LaylineInput): Laylines {
  const { vessel, mark } = input;

  const twd_deg = Convert.radiansToDegrees(input.twd);
  const twd_inv = Angle.add(twd_deg, 180);

  // true bearing (degrees) and distance (metres) between the plotted positions
  const brg_deg = getGreatCircleBearing(vessel, mark);
  const dtg = getDistance(vessel, mark, 0.01);

  const destUpwind = Math.abs(Angle.difference(brg_deg, twd_deg)) < 90;

  // beat angle
  const ba_deg = Convert.radiansToDegrees(input.beatAngle ?? Math.PI / 4);

  // gybe angle
  let ga_deg: number;
  let ga_diff: number;
  if (typeof input.gybeAngle === 'number') {
    ga_deg = Convert.radiansToDegrees(input.gybeAngle);
    ga_diff = 180 - Math.abs(ga_deg);
  }

  // mark laylines
  const markLines = (angle: number): LineString => {
    const pt1 = computeDestinationPoint(mark, dtg, Angle.add(twd_inv, angle));
    const pt2 = computeDestinationPoint(mark, dtg, Angle.add(twd_inv, -angle));
    return [[pt1.longitude, pt1.latitude], mark, [pt2.longitude, pt2.latitude]];
  };

  // no downwind laylines without a gybe angle
  if (!destUpwind && typeof ga_deg !== 'number') {
    return NO_LAYLINES;
  }
  const tackAngle = destUpwind ? ba_deg : ga_diff;
  const targetAngle = markLines(destUpwind ? ba_deg : ga_deg);

  const destInTarget = destUpwind
    ? Math.abs(Angle.difference(brg_deg, twd_deg)) < ba_deg
    : Math.abs(Angle.difference(brg_deg, twd_inv)) < ga_diff;

  if (!destInTarget) {
    return { targetAngle, port: [], starboard: [] };
  }

  // vessel laylines
  const hbd_deg = Angle.difference(twd_deg, brg_deg);
  // Vector angles
  const C_RAD = Convert.degreesToRadians(tackAngle - hbd_deg);
  const B_RAD = Convert.degreesToRadians(tackAngle + hbd_deg);
  const A_RAD = Math.PI - (B_RAD + C_RAD);
  // Vector lengths
  const b = (dtg * Math.sin(B_RAD)) / Math.sin(A_RAD);
  const c = (dtg * Math.sin(C_RAD)) / Math.sin(A_RAD);
  // intersection points
  const ipts = computeDestinationPoint(
    vessel,
    b,
    Angle.add(twd_deg, tackAngle)
  );
  const iptp = computeDestinationPoint(
    vessel,
    c,
    Angle.add(twd_deg, 0 - tackAngle)
  );
  const s: Position = [ipts.longitude, ipts.latitude];
  const p: Position = [iptp.longitude, iptp.latitude];

  return {
    targetAngle,
    port: [
      [p, vessel],
      [s, vessel]
    ],
    starboard: [
      [s, mark],
      [mark, p]
    ]
  };
}
