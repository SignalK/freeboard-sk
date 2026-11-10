import { describe, expect, it } from 'vitest';
import { bottomClearance, maxPanelRight } from './bottom-clearance.directive';
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

// The nav data panel sits 10 px from the left of a 1000 px wide area and may
// grow to calc(100% - 75px), so it reaches x = 935 however wide its content
// is at the moment.
describe('maxPanelRight', () => {
  const area = { left: 0, width: 1000 };

  it('resolves calc(100% - n px) against the area', () => {
    expect(maxPanelRight(10, 'calc(100% - 75px)', area)).toBe(935);
  });

  it('resolves a percentage and a length', () => {
    expect(maxPanelRight(10, '50%', area)).toBe(510);
    expect(maxPanelRight(10, '300px', area)).toBe(310);
  });

  it('stops at the area edge, also without a max-width', () => {
    expect(maxPanelRight(10, '100%', area)).toBe(1000);
    expect(maxPanelRight(10, 'none', area)).toBe(1000);
  });

  it('clears a widget the panel only covers at its widest', () => {
    // TTG and ETA appear only while making way and widen the panel past
    // x = 610; the widget at the bottom right must count either way
    const widget = { left: 800, right: 924, top: 476 };
    const at = (right: number) =>
      bottomClearance({ left: 10, right, height: 100 }, [widget], 600, 600, 30);
    expect(at(maxPanelRight(10, 'calc(100% - 75px)', area))).toBe(
      124 + WIDGET_CELL_GAP
    );
  });
});
