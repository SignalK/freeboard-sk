import { describe, it, expect } from 'vitest';
import { RoutePointPopoverComponent } from './route-point-popover.component';
import { ActiveRoutePoint } from '../route-point-pick';

/**
 * Skip applies to the point being headed for, and only when another point
 * follows it. `canSkip()` reads only the `point` input, so it runs on a bare
 * prototype with the input stubbed (same approach as resource-popover.spec).
 */
function popover(point: ActiveRoutePoint) {
  const c = Object.create(
    RoutePointPopoverComponent.prototype
  ) as RoutePointPopoverComponent;
  Object.assign(c, { point: () => point });
  return c as unknown as { canSkip: () => boolean };
}

describe('RoutePointPopoverComponent — Skip', () => {
  it('offers SKIP on the point being headed for', () => {
    expect(popover({ index: 1, total: 4, isNext: true }).canSkip()).toBe(true);
  });

  it('does not offer SKIP on another point', () => {
    expect(popover({ index: 2, total: 4, isNext: false }).canSkip()).toBe(
      false
    );
  });

  it('does not offer SKIP on the last point', () => {
    expect(popover({ index: 3, total: 4, isNext: true }).canSkip()).toBe(false);
  });
});
