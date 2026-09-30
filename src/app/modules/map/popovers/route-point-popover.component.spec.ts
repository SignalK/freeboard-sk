import { beforeEach, describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AppFacade } from 'src/app/app.facade';
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

/**
 * The buttons act on the point as shown: Skip carries the index on screen, so
 * a course that advances while the popover is open is not skipped twice.
 */
describe('RoutePointPopoverComponent — actions', () => {
  const render = (point: ActiveRoutePoint) => {
    TestBed.configureTestingModule({
      imports: [RoutePointPopoverComponent],
      providers: [
        {
          provide: AppFacade,
          useValue: { config: { units: { positionFormat: 'XY' } } }
        }
      ]
    });
    const fixture = TestBed.createComponent(RoutePointPopoverComponent);
    fixture.componentRef.setInput('point', point);
    fixture.detectChanges();
    const button = (label: string) =>
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('button')
      ).find((b) => (b.textContent ?? '').includes(label));
    return { fixture, button };
  };

  beforeEach(() => TestBed.resetTestingModule());

  it('skips the point it shows', () => {
    const { fixture, button } = render({ index: 1, total: 4, isNext: true });
    let skipped: number | undefined;
    fixture.componentInstance.skip.subscribe((i) => (skipped = i));

    button('SKIP')?.click();

    expect(skipped).toBe(1);
  });

  it('rejoins at the point it shows', () => {
    const { fixture, button } = render({
      index: 2,
      total: 4,
      isNext: false,
      position: [24.95, 60.16]
    });
    let rejoined: number | undefined;
    fixture.componentInstance.rejoin.subscribe((i) => (rejoined = i));

    button('REJOIN HERE')?.click();

    expect(rejoined).toBe(2);
  });
});
