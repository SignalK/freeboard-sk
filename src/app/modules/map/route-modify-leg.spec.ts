import { expect, describe, it } from 'vitest';
import { Position } from 'src/app/types';
import { modifiedLegIndex } from './route-modify-leg';

/** A five-point route: legs 0..3 join points 0-1, 1-2, 2-3, 3-4. */
const route: Position[] = [
  [0, 0],
  [10, 0],
  [20, 0],
  [30, 0],
  [40, 0]
];

const moveVertex = (at: number, to: Position): Position[] =>
  route.map((p, i) => (i === at ? to : p));

describe('modifiedLegIndex', () => {
  it('reports the leg ENDING at the dragged vertex, not the last leg (#581)', () => {
    // Dragging the middle point (index 2) describes the leg from point 1 to
    // point 2 — leg index 1. Before the fix the read-out stayed on leg 3.
    expect(modifiedLegIndex(route, moveVertex(2, [20, 15]))).toBe(1);
  });

  it('reports the preceding leg for every interior vertex', () => {
    expect(modifiedLegIndex(route, moveVertex(1, [10, 15]))).toBe(0);
    expect(modifiedLegIndex(route, moveVertex(3, [30, 15]))).toBe(2);
  });

  it('reports the final leg when the END point is dragged', () => {
    expect(modifiedLegIndex(route, moveVertex(4, [40, 15]))).toBe(3);
  });

  it('reports the leg leaving the first point when it is dragged', () => {
    // Point 0 has no preceding leg, so describe the one it starts.
    expect(modifiedLegIndex(route, moveVertex(0, [0, 15]))).toBe(0);
  });

  it('detects a move by latitude alone', () => {
    expect(modifiedLegIndex(route, moveVertex(2, [20, 0.5]))).toBe(1);
  });

  it('reports the leg into a newly inserted vertex', () => {
    const after = [...route];
    after.splice(2, 0, [15, 5]);
    expect(modifiedLegIndex(route, after)).toBe(1);
  });

  it('reports the newly joined leg when a vertex is deleted', () => {
    // Removing point 2 joins point 1 to point 3 — that merged leg is index 1.
    const after = route.filter((_, i) => i !== 2);
    expect(modifiedLegIndex(route, after)).toBe(1);
  });

  it('reports the new final leg when a point is appended (route extend)', () => {
    const after: Position[] = [...route, [50, 0]];
    expect(modifiedLegIndex(route, after)).toBe(4);
  });

  it('reports the final leg when the end point is deleted', () => {
    const after = route.slice(0, -1);
    expect(modifiedLegIndex(route, after)).toBe(2);
  });

  it('falls back to the default when nothing moved', () => {
    expect(modifiedLegIndex(route, [...route])).toBe(-1);
  });

  it('falls back to the default when there is no leg to describe', () => {
    expect(modifiedLegIndex([[0, 0]], [[5, 5]])).toBe(-1);
    expect(modifiedLegIndex([], [])).toBe(-1);
  });

  it('never returns an index past the last leg', () => {
    const two: Position[] = [
      [0, 0],
      [10, 0]
    ];
    // Dragging the end point of a two-point route still describes leg 0.
    expect(modifiedLegIndex(two, [two[0], [10, 5]])).toBe(0);
  });
});
