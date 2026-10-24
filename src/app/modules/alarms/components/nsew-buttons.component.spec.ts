import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  NSEWButtonsComponent,
  REPEAT_DELAY,
  REPEAT_INTERVAL
} from './nsew-buttons.component';

describe('NSEWButtonsComponent', () => {
  let component: NSEWButtonsComponent;
  let steps: number[];

  const pointerEvent = (type: string, pointerId: number) =>
    Object.assign(new Event(type), { pointerId });
  const press = (direction: number, pointerId = 1) =>
    component.press(direction, { button: 0, pointerId } as PointerEvent);
  const lift = (pointerId = 1) =>
    window.dispatchEvent(pointerEvent('pointerup', pointerId));

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.overrideComponent(NSEWButtonsComponent, { set: { template: '' } });
    component = TestBed.createComponent(NSEWButtonsComponent).componentInstance;
    steps = [];
    component.direction.subscribe((d) => steps.push(d));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('steps once for a short press', () => {
    press(90);
    lift();
    vi.advanceTimersByTime(REPEAT_DELAY + 5 * REPEAT_INTERVAL);

    expect(steps).toEqual([90]);
  });

  it('keeps stepping while the button is held', () => {
    press(0);
    vi.advanceTimersByTime(REPEAT_DELAY + 3 * REPEAT_INTERVAL);
    lift();
    vi.advanceTimersByTime(5 * REPEAT_INTERVAL);

    expect(steps).toEqual([0, 0, 0, 0]);
  });

  it('stops when the press is cancelled', () => {
    press(180);
    vi.advanceTimersByTime(REPEAT_DELAY + REPEAT_INTERVAL);
    window.dispatchEvent(pointerEvent('pointercancel', 1));
    vi.advanceTimersByTime(5 * REPEAT_INTERVAL);

    expect(steps).toEqual([180, 180]);
  });

  it('keeps stepping when another pointer is lifted', () => {
    press(0);
    lift(2);
    vi.advanceTimersByTime(REPEAT_DELAY + 2 * REPEAT_INTERVAL);
    lift();

    expect(steps).toEqual([0, 0, 0]);
  });

  it('keeps the first finger in charge when a second presses an arrow', () => {
    press(0, 1);
    press(90, 2);
    vi.advanceTimersByTime(REPEAT_DELAY + REPEAT_INTERVAL);
    lift(2);
    vi.advanceTimersByTime(REPEAT_INTERVAL);
    lift(1);
    vi.advanceTimersByTime(5 * REPEAT_INTERVAL);

    expect(steps).toEqual([0, 0, 0]);
  });

  it('restarts when the holding pointer presses again', () => {
    press(0);
    press(90);
    vi.advanceTimersByTime(REPEAT_DELAY + REPEAT_INTERVAL);
    lift();
    vi.advanceTimersByTime(5 * REPEAT_INTERVAL);

    expect(steps).toEqual([0, 90, 90]);
  });

  it('lets a new pointer take over once the holding one lost its capture', () => {
    press(0, 1);
    vi.advanceTimersByTime(REPEAT_DELAY);
    window.dispatchEvent(pointerEvent('lostpointercapture', 1));
    vi.advanceTimersByTime(5 * REPEAT_INTERVAL);
    press(90, 2);
    lift(2);

    expect(steps).toEqual([0, 90]);
  });

  it('captures the pointer on the button it pressed', () => {
    const button = { setPointerCapture: vi.fn() };
    component.press(0, {
      button: 0,
      pointerId: 7,
      currentTarget: button
    } as unknown as PointerEvent);
    lift(7);

    expect(button.setPointerCapture).toHaveBeenCalledWith(7);
  });

  it('stops when it is destroyed while held', () => {
    press(270);
    component.ngOnDestroy();
    vi.advanceTimersByTime(REPEAT_DELAY + 5 * REPEAT_INTERVAL);

    expect(steps).toEqual([270]);
  });

  it('ignores presses while disabled and secondary buttons', () => {
    component.disabled = true;
    press(0);
    component.disabled = false;
    component.press(0, { button: 2 } as PointerEvent);

    expect(steps).toEqual([]);
  });

  it('steps for a keyboard click but not for a pointer click', () => {
    component.keyboardAction(90, { detail: 0 } as MouseEvent);
    component.keyboardAction(90, { detail: 1 } as MouseEvent);

    expect(steps).toEqual([90]);
  });
});
