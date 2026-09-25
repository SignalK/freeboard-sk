import { describe, it, expect } from 'vitest';
import { signal } from '@angular/core';
import {
  POPOVER_ANCHOR_GAP,
  PopoverMetrics,
  choosePopoverPlacement
} from './popover-placement';
import { PopoverComponent } from './popover.component';

/**
 * Map popovers always opened above their anchor, so one on a feature near the
 * top of the screen ran off the top edge, taking its close button with it
 * (#827). They now open below when there is no room above.
 */

// A 800px-tall map with a 300px popover whose title bar is 40px.
const metrics = (anchorY: number, extra: Partial<PopoverMetrics> = {}) => ({
  anchorY,
  height: 300,
  titleHeight: 40,
  top: 0,
  bottom: 800,
  ...extra
});

describe('choosePopoverPlacement (#827)', () => {
  it('opens above when the popover fits above the anchor', () => {
    expect(choosePopoverPlacement(metrics(500))).toBe('top');
  });

  it('opens below when the anchor is too close to the top', () => {
    expect(choosePopoverPlacement(metrics(100))).toBe('bottom');
  });

  it('counts the gap between anchor and popover', () => {
    const fits = 300 + POPOVER_ANCHOR_GAP;
    expect(choosePopoverPlacement(metrics(fits))).toBe('top');
    expect(choosePopoverPlacement(metrics(fits - 1))).toBe('bottom');
  });

  it('measures from the top of the visible map area, not the page', () => {
    expect(choosePopoverPlacement(metrics(400, { top: 150 }))).toBe('bottom');
  });

  it('opens below when it fits neither way but the title bar fits below', () => {
    // Phone in landscape: 360px map, anchor in the lower half.
    expect(choosePopoverPlacement(metrics(250, { bottom: 360 }))).toBe(
      'bottom'
    );
  });

  it('stays above when even the title bar would not fit below', () => {
    expect(
      choosePopoverPlacement(metrics(330, { bottom: 360, height: 400 }))
    ).toBe('top');
  });
});

/**
 * `updatePlacement()` measures the rendered popover. jsdom has no layout, so
 * exercise it on a bare prototype instance with the DOM measurements stubbed
 * (same approach as resource-popover.component.spec).
 */
type Placeable = {
  placement: ReturnType<typeof signal<string>>;
  updatePlacement: () => void;
};

function popover(anchorY: number, docked = false) {
  const rect = (r: Partial<DOMRect>) => ({ getBoundingClientRect: () => r });
  const box = {
    offsetParent: rect({ top: anchorY }),
    getBoundingClientRect: () => ({ height: 300 }),
    closest: () => rect({ top: 0, bottom: 800 }),
    querySelector: () => rect({ height: 40 })
  };
  const c = Object.create(PopoverComponent.prototype);
  Object.assign(c, {
    box: { nativeElement: box },
    placement: signal('top'),
    docked
  });
  (c as Placeable).updatePlacement();
  return (c as Placeable).placement();
}

describe('PopoverComponent placement (#827)', () => {
  it('opens a popover anchored near the top of the map below its anchor', () => {
    expect(popover(60)).toBe('bottom');
  });

  it('keeps a popover with room above opening upward', () => {
    expect(popover(600)).toBe('top');
  });

  it('leaves a docked popover alone', () => {
    expect(popover(60, true)).toBe('top');
  });
});
