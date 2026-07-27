import { Position } from 'src/app/types';

/**
 * The leg the "Leg" read-out should describe after a Modify operation: the
 * segment *ending* at the vertex just touched, i.e. from the previous point to
 * the one the user dragged (issue #581). Measurement legs are numbered by their
 * start vertex, so that leg is `touched - 1`; the first point has no preceding
 * leg, so dragging it reports the leg leaving it instead.
 *
 * `before` and `after` are the geometry either side of a single operation, in
 * render space. The first index at which they differ identifies the vertex
 * touched — for a move the vertex itself, for an insert the new vertex, and for
 * a delete the vertex that closed the gap, so a deletion reports the newly
 * joined leg. Returns -1 (the component's "last leg" default) when nothing
 * changed or there is no leg to describe.
 */
export function modifiedLegIndex(
  before: Position[],
  after: Position[]
): number {
  if (after.length < 2) {
    return -1;
  }
  const lastLeg = after.length - 2;
  const shared = Math.min(before.length, after.length);
  for (let i = 0; i < shared; i++) {
    if (before[i][0] !== after[i][0] || before[i][1] !== after[i][1]) {
      return Math.min(Math.max(i - 1, 0), lastLeg);
    }
  }
  // The shared prefix is identical, so the operation only touched the tail
  // (appending or removing an end point) — or nothing moved at all.
  return before.length === after.length ? -1 : lastLeg;
}
