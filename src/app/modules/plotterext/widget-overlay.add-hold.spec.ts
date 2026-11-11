import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlotterExtensionOverlay } from './widget-overlay.component';
import { PlotterExtensionService } from './plotterext.service';
import { pointerEvent } from './windows/testing';

// A press-and-hold on an empty anchor cell opens the Add Widget picker. On a
// boat the finger drifts a little over the 1.5 s hold, so small movement must
// not cancel it; a real drag (a map pan) still does.
describe('PlotterExtensionOverlay press-and-hold to add', () => {
  let fixture: ComponentFixture<PlotterExtensionOverlay>;
  let openAddWidgetPicker: ReturnType<typeof vi.fn>;
  let openConfigPanel: ReturnType<typeof vi.fn>;
  let hiddenWidgetAt: ReturnType<typeof vi.fn>;

  const press = (x: number, y: number) =>
    document.body.dispatchEvent(
      pointerEvent('pointerdown', { x, y, pointerType: 'touch' })
    );
  const move = (x: number, y: number) =>
    document.body.dispatchEvent(
      pointerEvent('pointermove', { x, y, pointerType: 'touch' })
    );

  beforeEach(() => {
    vi.useFakeTimers();
    openAddWidgetPicker = vi.fn();
    openConfigPanel = vi.fn();
    hiddenWidgetAt = vi.fn(() => null);
    TestBed.configureTestingModule({
      imports: [PlotterExtensionOverlay],
      providers: [
        {
          provide: PlotterExtensionService,
          useValue: {
            filterChips: signal([]),
            activeWidgets: signal([]),
            shownWidgets: signal([]),
            widgetDef: () => null,
            registerHitTester: () => () => undefined,
            cellOccupied: () => false,
            hiddenWidgetAt,
            openConfigPanel,
            movingWidget: signal(null),
            moveTargets: () => new Proxy({}, { get: () => [] }),
            openAddWidgetPicker
          }
        }
      ]
    });
    // Only the bottom-center area and, under it as on a phone, the
    // bottom-right one have a size: 200 x 100 px at (100, 500).
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: Element) {
        const anchor = (this as HTMLElement).dataset?.['anchor'];
        return anchor === 'cb' || anchor === 'br'
          ? new DOMRect(100, 500, 200, 100)
          : new DOMRect(-1000, -1000, 0, 0);
      }
    );
    fixture = TestBed.createComponent(PlotterExtensionOverlay);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('opens the picker for the held cell', () => {
    press(250, 520);
    vi.advanceTimersByTime(1500);
    expect(openAddWidgetPicker).toHaveBeenCalledWith('cb', { col: 1, row: 0 });
  });

  it('waits the full hold before opening the picker', () => {
    press(250, 520);
    vi.advanceTimersByTime(1499);
    expect(openAddWidgetPicker).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(openAddWidgetPicker).toHaveBeenCalledTimes(1);
  });

  it('keeps the hold through a finger drifting about 10 px', () => {
    press(250, 520);
    move(258, 526);
    move(244, 516);
    vi.advanceTimersByTime(1500);
    expect(openAddWidgetPicker).toHaveBeenCalledTimes(1);
  });

  it('keeps the hold at exactly 15 px of movement', () => {
    press(250, 520);
    move(265, 520);
    vi.advanceTimersByTime(1500);
    expect(openAddWidgetPicker).toHaveBeenCalledTimes(1);
  });

  it('cancels the hold just past 15 px of movement', () => {
    press(250, 520);
    move(266, 520);
    vi.advanceTimersByTime(1500);
    expect(openAddWidgetPicker).not.toHaveBeenCalled();
  });

  it('cancels the hold when the pointer is dragged away', () => {
    press(250, 520);
    move(270, 520);
    vi.advanceTimersByTime(1500);
    expect(openAddWidgetPicker).not.toHaveBeenCalled();
  });

  it('opens the settings of a widget this screen hides in the held cell', () => {
    const hidden = { instanceId: 'i-hidden', minScreen: 'monitor' };
    hiddenWidgetAt.mockReturnValue(hidden);
    press(250, 520);
    vi.advanceTimersByTime(1500);
    expect(hiddenWidgetAt).toHaveBeenCalledWith('cb', { col: 1, row: 0 });
    expect(openConfigPanel).toHaveBeenCalledWith(hidden);
    expect(openAddWidgetPicker).not.toHaveBeenCalled();
  });

  it('finds a hidden widget in an area under the one the press lands in', () => {
    const hidden = { instanceId: 'i-hidden', minScreen: 'tablet' };
    hiddenWidgetAt.mockImplementation((anchor: string) =>
      anchor === 'br' ? hidden : null
    );
    press(250, 520);
    vi.advanceTimersByTime(1500);
    expect(openConfigPanel).toHaveBeenCalledWith(hidden);
  });
});
