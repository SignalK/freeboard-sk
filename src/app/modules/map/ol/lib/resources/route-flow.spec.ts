import { describe, it, expect } from 'vitest';
import {
  clipSegment,
  flowMarks,
  flowPhase,
  offsetLine,
  PixelBounds,
  ROUTE_FLOW
} from './route-flow';

const everywhere: PixelBounds = [-1e9, -1e9, 1e9, 1e9];

describe('flowMarks()', () => {
  it('puts one chevron in the middle of a line shorter than the spacing', () => {
    for (const phase of [0, 0.3, 0.5, 0.99]) {
      expect(
        flowMarks(
          [
            [0, 0],
            [10, 0],
            [10, 10]
          ],
          70,
          phase,
          everywhere
        )
      ).toEqual([{ x: 10, y: 0, dx: 1, dy: 0 }]);
    }
  });

  it('leaves out the middle chevron of a short line off screen', () => {
    expect(
      flowMarks(
        [
          [500, 500],
          [510, 500]
        ],
        70,
        0.5,
        [0, 0, 100, 100]
      )
    ).toEqual([]);
  });

  it('spaces chevrons evenly, starting at the phase', () => {
    const marks = flowMarks(
      [
        [0, 0],
        [100, 0]
      ],
      20,
      0.5,
      everywhere
    );
    expect(marks.map((m) => m.x)).toEqual([10, 30, 50, 70, 90]);
    expect(marks.every((m) => m.dx === 1 && m.dy === 0)).toBe(true);
  });

  it('keeps the spacing across a turn', () => {
    const marks = flowMarks(
      [
        [0, 0],
        [25, 0],
        [25, 100]
      ],
      20,
      0,
      everywhere
    );
    // 0, 20 on the first leg; 40 is 15 down the second leg
    expect(marks.map((m) => [m.x, m.y])).toEqual([
      [0, 0],
      [20, 0],
      [25, 15],
      [25, 35],
      [25, 55],
      [25, 75],
      [25, 95]
    ]);
    expect(marks[2]).toEqual(expect.objectContaining({ dx: 0, dy: 1 }));
  });

  it('moves every chevron forward as the phase grows', () => {
    const line = [
      [0, 0],
      [100, 0]
    ];
    const a = flowMarks(line, 20, 0.1, everywhere).map((m) => m.x);
    const b = flowMarks(line, 20, 0.6, everywhere).map((m) => m.x);
    expect(b).toEqual(a.map((x) => x + 10));
  });

  it('places only the chevrons inside the bounds, on the same grid', () => {
    const marks = flowMarks(
      [
        [-1e6, 50],
        [1e6, 50]
      ],
      20,
      0,
      [0, 0, 100, 100]
    );
    expect(marks.map((m) => m.x)).toEqual([0, 20, 40, 60, 80]);
  });

  it('skips segments outside the bounds and zero-length ones', () => {
    expect(
      flowMarks(
        [
          [0, 500],
          [0, 500],
          [100, 500]
        ],
        20,
        0,
        [0, 0, 100, 100]
      )
    ).toEqual([]);
  });
});

describe('clipSegment()', () => {
  const box: PixelBounds = [0, 0, 10, 10];
  it('returns the inside part of a crossing segment', () => {
    expect(clipSegment(-10, 5, 20, 5, box)).toEqual([1 / 3, 2 / 3]);
  });
  it('misses a segment outside', () => {
    expect(clipSegment(-10, 20, 20, 20, box)).toBeNull();
  });
});

describe('offsetLine()', () => {
  it('moves a straight line sideways, right of travel positive', () => {
    // y grows downwards on a canvas: travelling east, right is +y
    expect(
      offsetLine(
        [
          [0, 0],
          [10, 0]
        ],
        2
      )
    ).toEqual([
      [0, 2],
      [10, 2]
    ]);
  });

  it('mitres a right-angle turn', () => {
    const out = offsetLine(
      [
        [0, 0],
        [10, 0],
        [10, 10]
      ],
      -2
    );
    expect(out[1][0]).toBeCloseTo(12);
    expect(out[1][1]).toBeCloseTo(-2);
  });

  it('caps the mitre on a hairpin', () => {
    const out = offsetLine(
      [
        [0, 0],
        [10, 0],
        [0, 0.01]
      ],
      1
    );
    expect(Math.hypot(out[1][0] - 10, out[1][1])).toBeLessThanOrEqual(3.0001);
  });

  it('needs two distinct points', () => {
    expect(
      offsetLine(
        [
          [1, 1],
          [1, 1]
        ],
        2
      )
    ).toEqual([]);
  });
});

describe('flowPhase()', () => {
  it('sits mid-spacing when not animated', () => {
    expect(flowPhase(false, 1234)).toBe(0.5);
  });
  it('runs through one spacing per period when animated', () => {
    expect(flowPhase(true, ROUTE_FLOW.periodMs * 3.25)).toBeCloseTo(0.25);
  });
});
