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
 * (#827). They now open below when there is no room above, and a popover that
 * fits on neither side is capped to the room it gets.
 */

// A 800px-tall map with a 300px popover.
const metrics = (anchorY: number, extra: Partial<PopoverMetrics> = {}) => ({
  anchorY,
  height: 300,
  top: 0,
  bottom: 800,
  ...extra
});

describe('choosePopoverPlacement (#827)', () => {
  it('opens above when the popover fits above the anchor', () => {
    expect(choosePopoverPlacement(metrics(500))).toEqual({ placement: 'top' });
  });

  it('opens below when the anchor is too close to the top', () => {
    expect(choosePopoverPlacement(metrics(100))).toEqual({
      placement: 'bottom'
    });
  });

  it('counts the gap between anchor and popover', () => {
    const fits = 300 + POPOVER_ANCHOR_GAP;
    expect(choosePopoverPlacement(metrics(fits)).placement).toBe('top');
    expect(choosePopoverPlacement(metrics(fits - 1)).placement).toBe('bottom');
  });

  it('measures from the top of the visible map area, not the page', () => {
    expect(choosePopoverPlacement(metrics(400, { top: 150 })).placement).toBe(
      'bottom'
    );
  });

  it('caps a popover that fits neither way to the larger side', () => {
    // Phone in landscape: 360px map.
    expect(choosePopoverPlacement(metrics(250, { bottom: 360 }))).toEqual({
      placement: 'top',
      maxHeight: 250 - POPOVER_ANCHOR_GAP
    });
    expect(choosePopoverPlacement(metrics(100, { bottom: 360 }))).toEqual({
      placement: 'bottom',
      maxHeight: 260 - POPOVER_ANCHOR_GAP
    });
  });

  it('keeps the title on screen when the anchor is near the bottom', () => {
    // Nearly no room below: open above, capped so its top stays in the map.
    const layout = choosePopoverPlacement(
      metrics(330, { bottom: 360, height: 400 })
    );
    expect(layout).toEqual({ placement: 'top', maxHeight: 320 });
    expect(330 - POPOVER_ANCHOR_GAP - layout.maxHeight).toBeGreaterThanOrEqual(
      0
    );
  });
});

/**
 * `updatePlacement()` measures the rendered popover. jsdom has no layout, so
 * exercise it on a bare prototype instance with the DOM measurements stubbed
 * (same approach as resource-popover.component.spec). The stubbed box honours
 * an inline max-height the way layout would.
 */
type Placeable = {
  placement: ReturnType<typeof signal<string>>;
  updatePlacement: () => void;
};

function popover(anchorY: number, docked = false, naturalHeight = 300) {
  const rect = (r: Partial<DOMRect>) => ({ getBoundingClientRect: () => r });
  const classes = new Set<string>();
  const box = {
    style: { maxHeight: '' },
    classList: {
      toggle: (name: string, on: boolean) =>
        on ? classes.add(name) : classes.delete(name)
    },
    offsetParent: rect({ top: anchorY }),
    getBoundingClientRect: () => ({
      height: box.style.maxHeight
        ? Math.min(naturalHeight, parseFloat(box.style.maxHeight))
        : naturalHeight
    }),
    closest: (selector: string) =>
      selector === '.ol-viewport' ? rect({ top: 200, bottom: 800 }) : null
  };
  const c = Object.create(PopoverComponent.prototype) as Placeable;
  Object.assign(c, {
    box: { nativeElement: box },
    placement: signal('top'),
    docked
  });
  return {
    update: () => c.updatePlacement(),
    placement: () => c.placement(),
    maxHeight: () => box.style.maxHeight,
    capped: () => classes.has('capped')
  };
}

describe('PopoverComponent placement (#827)', () => {
  // The map starts 200px down the page, so an anchor at y=400 has only 200px
  // above it inside the map, although 400px of page.
  it('opens a popover anchored near the top of the map below its anchor', () => {
    const p = popover(400);
    p.update();
    expect(p.placement()).toBe('bottom');
    expect(p.capped()).toBe(false);
  });

  it('keeps a popover with room above opening upward', () => {
    const p = popover(600);
    p.update();
    expect(p.placement()).toBe('top');
  });

  it('leaves a docked popover alone', () => {
    const p = popover(400, true);
    p.update();
    expect(p.placement()).toBe('top');
  });

  it('caps a popover too tall for either side, and keeps it capped', () => {
    // 568px visible map (200 to the 768px jsdom window), anchor at 400:
    // 200px above, 368px below.
    const p = popover(400, false, 700);
    p.update();
    expect(p.placement()).toBe('bottom');
    expect(p.maxHeight()).toBe(`${368 - POPOVER_ANCHOR_GAP}px`);
    expect(p.capped()).toBe(true);
    // A re-check (e.g. from the ResizeObserver the cap itself triggers) must
    // measure the natural height, not the capped one, or it would "fit" and
    // drop the cap.
    p.update();
    expect(p.maxHeight()).toBe(`${368 - POPOVER_ANCHOR_GAP}px`);
    expect(p.capped()).toBe(true);
  });
});
