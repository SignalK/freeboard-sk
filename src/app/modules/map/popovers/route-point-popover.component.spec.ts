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
          useValue: {
            config: { units: { positionFormat: 'XY' } },
            formatValueForDisplay: (v: number, unit: string) => `${v} ${unit}`
          }
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

  it('shows the distance, time to go and arrival time of a point ahead', () => {
    const { fixture } = render({
      index: 2,
      total: 4,
      isNext: false,
      distance: 3704,
      timeToGo: 1440
    });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('DTG:');
    expect(text).toContain('3704 m');
    expect(text).toContain('1440 s');
    expect(text).toContain('ETA:');
  });

  it('leaves out the estimates for a point already passed', () => {
    const { fixture } = render({ index: 0, total: 4, isNext: false });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).not.toContain('DTG:');
    expect(text).not.toContain('ETA:');
  });
});

describe('RoutePointPopoverComponent — ETA', () => {
  const eta = (ttg: number, now: Date) =>
    (
      Object.create(RoutePointPopoverComponent.prototype) as unknown as {
        eta: (ttg: number, now: Date) => string;
      }
    ).eta(ttg, now);

  it('gives the time alone when it is today', () => {
    const now = new Date(2026, 10, 7, 10, 0);
    expect(eta(1800, now)).toBe(
      new Date(2026, 10, 7, 10, 30).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit'
      })
    );
  });

  it('adds the date when it is not today', () => {
    const now = new Date(2026, 10, 7, 22, 0);
    expect(eta(4 * 3600, now)).toContain(
      new Date(2026, 10, 8).toLocaleDateString()
    );
  });
});
