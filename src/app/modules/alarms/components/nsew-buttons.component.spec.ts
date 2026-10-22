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
