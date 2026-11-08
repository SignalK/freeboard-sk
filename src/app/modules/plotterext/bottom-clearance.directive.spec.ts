import { describe, expect, it } from 'vitest';
import { bottomClearance } from './bottom-clearance.directive';
import { WIDGET_CELL_GAP } from './types';

// A 600 px high area whose bottom edge is at y = 600, and a panel spanning
// x 10..610 that rests 30 px above it.
const panel = { left: 10, right: 610, height: 100 };
const clear = (widgets: { left: number; right: number; top: number }[]) =>
  bottomClearance(panel, widgets, 600, 600, 30);

describe('bottomClearance', () => {
  it('keeps the resting offset with no widget beneath', () => {
    expect(clear([])).toBe(30);
  });

  it('ignores widgets the panel does not span', () => {
    expect(clear([{ left: 700, right: 820, top: 476 }])).toBe(30);
  });

  it('sits just above an overlapping widget', () => {
    expect(clear([{ left: 0, right: 124, top: 476 }])).toBe(
      124 + WIDGET_CELL_GAP
    );
  });

  it('sits above the tallest overlapping stack', () => {
    expect(
      clear([
        { left: 0, right: 124, top: 476 },
        { left: 400, right: 524, top: 346 },
        { left: 900, right: 1024, top: 100 }
      ])
    ).toBe(254 + WIDGET_CELL_GAP);
  });

  it('never pushes the panel off the top of the area', () => {
    expect(clear([{ left: 0, right: 124, top: 20 }])).toBe(500);
  });
});
