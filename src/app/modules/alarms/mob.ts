import { LonLatBox } from 'src/app/lib/map-fit';
import { Position } from 'src/app/types';

/** Distance under which the active destination counts as the MOB position. */
const SAME_POINT_DEGREES = 0.00001;

/** Time since the person went overboard, as `m:ss`, or `h:mm:ss` from an hour on. */
export function mobElapsed(createdAt: number, now: number): string {
  const total = Math.max(0, Math.floor((now - createdAt) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** The box that holds both the vessel and the MOB, the short way round the antimeridian. */
export function mobBox(vessel: Position | null, mob: Position): LonLatBox {
  if (!vessel) {
    return [mob[0], mob[1], mob[0], mob[1]];
  }
  let [w, e] = [vessel[0], mob[0]].sort((a, b) => a - b);
  if (e - w > 180) {
    [w, e] = [e, w];
  }
  return [w, Math.min(vessel[1], mob[1]), e, Math.max(vessel[1], mob[1])];
}

/** Whether the course destination is already the MOB position. */
export function isMobDestination(
  destination: Position | null | undefined,
  mob: Position
): boolean {
  if (!destination) {
    return false;
  }
  // -180 and 180 are the same meridian
  const dLon = Math.abs(((destination[0] - mob[0] + 540) % 360) - 180);
  return (
    dLon < SAME_POINT_DEGREES &&
    Math.abs(destination[1] - mob[1]) < SAME_POINT_DEGREES
  );
}
