import { describe, expect, it } from 'vitest';
import { Feature, Map, View } from 'ol';
import { MultiLineString, Point } from 'ol/geom';
import { containsExtent, Extent } from 'ol/extent';
import {
  clipBoxForView,
  clipLines,
  clipMultiLineString,
  viewClippedLines
} from './clip-lines';

const W = 1000;

describe('clipBoxForView', () => {
  it('covers the view with at least a view of margin on every side', () => {
    for (const cx of [-3, 0, 4.9, 5.1, 37]) {
      const view: Extent = [cx - 5, -2, cx + 5, 2];
      const box = clipBoxForView(view, W);
      expect(containsExtent(box, [cx - 15, -12, cx + 15, 12])).toBe(true);
    }
  });

  it('keeps the box while the view pans within its cell', () => {
    const a = clipBoxForView([1, 1, 11, 6], W);
    const b = clipBoxForView([3, 2, 13, 7], W);
    expect(b).toEqual(a);
  });

  it('moves a view in another world copy into the primary world', () => {
    const primary = clipBoxForView([100, 0, 110, 10], W);
    const east = clipBoxForView([100 + 2 * W, 0, 110 + 2 * W, 10], W);
    expect(east).toEqual(primary);
  });
});

describe('clipLines', () => {
  const box: Extent = [0, 0, 10, 10];

  it('cuts a segment crossing the box at its edges', () => {
    expect(
      clipLines(
        [
          [
            [-10, 5],
            [20, 5]
          ]
        ],
        box
      )
    ).toEqual([
      [
        [0, 5],
        [10, 5]
      ]
    ]);
  });

  it('keeps the points inside as one line', () => {
    const line = [
      [-5, 5],
      [2, 5],
      [8, 5],
      [15, 5]
    ];
    expect(clipLines([line], box)).toEqual([
      [
        [0, 5],
        [2, 5],
        [8, 5],
        [10, 5]
      ]
    ]);
  });

  it('splits a line that leaves the box and comes back', () => {
    const line = [
      [5, 5],
      [5, 50],
      [6, 50],
      [6, 5]
    ];
    expect(clipLines([line], box)).toEqual([
      [
        [5, 5],
        [5, 10]
      ],
      [
        [6, 10],
        [6, 5]
      ]
    ]);
  });

  it('drops a line that misses the box', () => {
    expect(
      clipLines(
        [
          [
            [20, 20],
            [30, -20]
          ]
        ],
        box
      )
    ).toEqual([]);
  });
});

describe('clipMultiLineString', () => {
  it('returns a line inside the box unchanged', () => {
    const g = new MultiLineString([
      [
        [1, 1],
        [2, 2]
      ]
    ]);
    expect(clipMultiLineString(g, [0, 0, 10, 10], W)).toBe(g);
  });

  it('keeps the part drawn in the next world copy', () => {
    // A mapified track runs on past the antimeridian instead of jumping back.
    const g = new MultiLineString([
      [
        [W - 100, 5],
        [W + 5, 5]
      ]
    ]);
    const clipped = clipMultiLineString(g, [0, 0, 10, 10], W);
    expect(clipped.getCoordinates()).toEqual([
      [
        [W, 5],
        [W + 5, 5]
      ]
    ]);
  });
});

describe('viewClippedLines', () => {
  function mapAt(center: number[], resolution: number): Map {
    const map = new Map({ view: new View({ center, resolution }) });
    map.setSize([100, 100]);
    return map;
  }

  const longTrack = () =>
    new Feature(
      new MultiLineString([
        [
          [-1e7, 0],
          [1e7, 0]
        ]
      ])
    );

  it('draws only the part of a long line around the view', () => {
    const map = mapAt([0, 0], 1);
    const clip = viewClippedLines(() => map);

    const drawn = clip(longTrack()) as MultiLineString;

    expect(drawn.getExtent()[0]).toBeGreaterThan(-1000);
    expect(drawn.getExtent()[2]).toBeLessThan(1000);
    map.dispose();
  });

  it('reuses the clipped line until the view leaves its cell', () => {
    const map = mapAt([0, 0], 1);
    const clip = viewClippedLines(() => map);
    const f = longTrack();

    const first = clip(f);
    map.getView().setCenter([10, 10]);
    expect(clip(f)).toBe(first);
    map.getView().setCenter([5000, 0]);
    expect(clip(f)).not.toBe(first);
    map.dispose();
  });

  it('draws other geometries whole', () => {
    const map = mapAt([0, 0], 1);
    const clip = viewClippedLines(() => map);
    const point = new Point([0, 0]);
    expect(clip(new Feature(point))).toBe(point);
    map.dispose();
  });
});
