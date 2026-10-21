import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { TimerButtonComponent } from './timer-button.component';

/**
 * The timer button drives auto-advance to the next route point, so every
 * period offered in Settings → Course has to fire, including "Immediately".
 */
describe('TimerButtonComponent', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function start(period: number) {
    const fixture = TestBed.createComponent(TimerButtonComponent);
    const component = fixture.componentInstance;
    component.period = period;
    const fired = vi.fn();
    component.nextPoint.subscribe(fired);
    fixture.detectChanges();
    return { fixture, component, fired };
  }

  it('fires straight away for a period of 0', () => {
    const { fired } = start(0);

    expect(fired).not.toHaveBeenCalled();
    vi.advanceTimersByTime(0);
    expect(fired).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5000);
    expect(fired).toHaveBeenCalledTimes(1);
  });

  it('fires after one second for a period of 1000', () => {
    const { fired } = start(1000);

    vi.advanceTimersByTime(999);
    expect(fired).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fired).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5000);
    expect(fired).toHaveBeenCalledTimes(1);
  });

  it('rounds a part-second period up to the next whole second', () => {
    const { fired } = start(2500);

    vi.advanceTimersByTime(2999);
    expect(fired).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fired).toHaveBeenCalledTimes(1);
  });

  it('falls back to 5 seconds for a period that is not a number', () => {
    const { fired } = start(null as unknown as number);

    vi.advanceTimersByTime(4999);
    expect(fired).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fired).toHaveBeenCalledTimes(1);
  });

  it('counts down the seconds left', () => {
    const { fixture } = start(3000);
    const text = () => fixture.nativeElement.textContent;

    expect(text()).toContain('3 secs');
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    expect(text()).toContain('2 secs');
  });

  it('does not fire once cancelled', () => {
    const { component, fired } = start(2000);

    vi.advanceTimersByTime(1000);
    component.cancel();
    vi.advanceTimersByTime(5000);

    expect(fired).not.toHaveBeenCalled();
  });

  it('does not fire after it is destroyed', () => {
    const { fixture, fired } = start(0);

    fixture.destroy();
    vi.advanceTimersByTime(1000);

    expect(fired).not.toHaveBeenCalled();
  });
});
