import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ChartTimeBar,
  ChartTimeLoop,
  moveLoopHandle,
  snapBarPosition
} from './chart-time-bar';

describe('snapBarPosition', () => {
  it('snaps to the min + n·step grid and clamps into the axis', () => {
    expect(snapBarPosition(107, 100, 200, 5)).toBe(105);
    expect(snapBarPosition(108, 100, 200, 5)).toBe(110);
    expect(snapBarPosition(-40, 100, 200, 5)).toBe(100);
    expect(snapBarPosition(999, 100, 200, 5)).toBe(200);
  });
});

describe('moveLoopHandle', () => {
  const loop: ChartTimeLoop = { min: 120, max: 160 };

  it('moves one handle and leaves the other', () => {
    expect(moveLoopHandle(loop, 'start', 130)).toEqual({ min: 130, max: 160 });
    expect(moveLoopHandle(loop, 'end', 150)).toEqual({ min: 120, max: 150 });
  });

  it('pushes the other handle along rather than crossing it', () => {
    expect(moveLoopHandle(loop, 'start', 170)).toEqual({ min: 170, max: 170 });
    expect(moveLoopHandle(loop, 'end', 110)).toEqual({ min: 110, max: 110 });
  });
});

/**
 * The bar's two lanes: a pointer in the upper lane scrubs the playhead, one
 * in the lower lane drags the nearer loop handle. Positions come from the
 * pointer's x over the axis, snapped to the step grid.
 */
describe('ChartTimeBar pointer lanes', () => {
  const AXIS = { left: 0, top: 0, width: 200, height: 52 };
  let positionChange: (value: number) => void;
  let loopChange: (value: ChartTimeLoop) => void;

  const render = (
    position = 150,
    loop: ChartTimeLoop = { min: 100, max: 200 }
  ) => {
    const fixture = TestBed.createComponent(ChartTimeBar);
    fixture.componentRef.setInput('min', 100);
    fixture.componentRef.setInput('max', 200);
    fixture.componentRef.setInput('step', 5);
    fixture.componentRef.setInput('position', position);
    fixture.componentRef.setInput('loop', loop);
    positionChange = vi.fn<(value: number) => void>();
    loopChange = vi.fn<(value: ChartTimeLoop) => void>();
    fixture.componentInstance.positionChange.subscribe(positionChange);
    fixture.componentInstance.loopChange.subscribe(loopChange);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const bar = host.querySelector('.bar') as HTMLElement;
    const axis = host.querySelector('.axis') as HTMLElement;
    // jsdom lays nothing out: give the axis and bar a real box, and the bar
    // the pointer-capture API the handlers use.
    const rect = () => ({ ...AXIS, right: 200, bottom: 52 }) as DOMRect;
    axis.getBoundingClientRect = rect;
    bar.getBoundingClientRect = rect;
    bar.setPointerCapture = vi.fn();
    bar.hasPointerCapture = vi.fn(() => true);
    bar.releasePointerCapture = vi.fn();
    return { fixture, bar };
  };

  const pointer = (bar: HTMLElement, type: string, x: number, y: number) => {
    const e = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true });
    Object.defineProperty(e, 'pointerId', { value: 1 });
    Object.defineProperty(e, 'pointerType', { value: 'touch' });
    bar.dispatchEvent(e);
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChartTimeBar]
    }).compileComponents();
  });

  it('scrubs from the upper lane, snapped to the grid', () => {
    const { bar } = render();
    pointer(bar, 'pointerdown', 61, 10); // 30.5% of 100 → 130.5 → 130
    expect(positionChange).toHaveBeenLastCalledWith(130);
    pointer(bar, 'pointermove', 120, 10); // 60% → 160
    expect(positionChange).toHaveBeenLastCalledWith(160);
    pointer(bar, 'pointermove', 100, 10); // back onto the input's own frame
    expect(positionChange).toHaveBeenCalledTimes(2); // no echo of 150
    pointer(bar, 'pointerup', 100, 10);
    pointer(bar, 'pointermove', 180, 10); // released: no longer dragging
    expect(positionChange).toHaveBeenCalledTimes(2);
    expect(loopChange).not.toHaveBeenCalled();
  });

  it('drags the nearer loop handle from the lower lane', () => {
    const { bar } = render(150, { min: 120, max: 180 });
    pointer(bar, 'pointerdown', 20, 45); // 110: nearer the start handle
    expect(loopChange).toHaveBeenLastCalledWith({ min: 110, max: 180 });
    pointer(bar, 'pointerup', 20, 45);
    pointer(bar, 'pointerdown', 190, 45); // 195: nearer the end handle
    expect(loopChange).toHaveBeenLastCalledWith({ min: 120, max: 195 });
    expect(positionChange).not.toHaveBeenCalled();
  });

  it('places the playhead and loop band by percentage of the axis', () => {
    const { fixture } = render(150, { min: 120, max: 180 });
    const host = fixture.nativeElement as HTMLElement;
    expect((host.querySelector('.head') as HTMLElement).style.left).toBe('50%');
    const band = host.querySelector('.band') as HTMLElement;
    expect(band.style.left).toBe('20%');
    expect(band.style.width).toBe('60%');
  });
});
