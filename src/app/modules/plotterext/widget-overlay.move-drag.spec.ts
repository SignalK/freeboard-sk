import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { PlotterExtensionOverlay } from './widget-overlay.component';
import { PlotterExtensionService } from './plotterext.service';
import { PlacedWidget } from './types';
import { pointerEvent } from './windows/testing';

// A move can end outside the overlay, as when a resize hides the widget being
// dragged. The drag still in hand must end with it, or the next move starts
// with the old offset and hovered cell.
describe('PlotterExtensionOverlay drag of a widget being moved', () => {
  let fixture: ComponentFixture<PlotterExtensionOverlay>;
  const movingWidget = signal<PlacedWidget | null>(null);

  beforeEach(() => {
    movingWidget.set(null);
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
            movingWidget,
            moveTargets: () => new Proxy({}, { get: () => [] })
          }
        }
      ]
    });
    fixture = TestBed.createComponent(PlotterExtensionOverlay);
    fixture.detectChanges();
  });

  it('drops the drag offset when the move ends elsewhere', () => {
    const overlay = fixture.componentInstance;
    movingWidget.set({
      instanceId: 'i',
      extension: 'e',
      widget: 'w',
      anchor: 'br',
      col: 0,
      row: 0
    });
    fixture.detectChanges();
    const target = document.createElement('div');
    target.setPointerCapture = () => undefined;
    const down = pointerEvent('pointerdown', { x: 100, y: 100 });
    Object.defineProperty(down, 'target', { value: target });
    overlay.dragStart(down);
    overlay.dragMove(pointerEvent('pointermove', { x: 160, y: 100 }));
    expect(overlay.dragTransform()).toBe('translate(60px, 0px)');

    movingWidget.set(null);
    fixture.detectChanges();
    expect(overlay.dragTransform()).toBeNull();
  });
});
