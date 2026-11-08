import {
  Directive,
  ElementRef,
  NgZone,
  OnDestroy,
  afterNextRender,
  afterRenderEffect,
  inject,
  input,
  output
} from '@angular/core';
import { PlotterExtensionService } from './plotterext.service';
import { WIDGET_CELL_GAP } from './types';

/** The placed widgets of the bottom anchors, as the overlay renders them. */
const BOTTOM_WIDGETS = '.pe-bl .pe-cell, .pe-cb .pe-cell, .pe-br .pe-cell';

export interface HRect {
  left: number;
  right: number;
  top: number;
}

/**
 * Bottom offset (px) that keeps a panel spanning `panel` horizontally clear
 * of the `widgets` it overlaps: `base` when it overlaps none, otherwise just
 * above the tallest overlapping stack, but never pushed off the top of an area
 * `areaHeight` high. Offsets count from `areaBottom`.
 */
export function bottomClearance(
  panel: { left: number; right: number; height: number },
  widgets: HRect[],
  areaBottom: number,
  areaHeight: number,
  base: number
): number {
  let bottom = base;
  for (const w of widgets) {
    if (w.left < panel.right && w.right > panel.left) {
      bottom = Math.max(bottom, areaBottom - w.top + WIDGET_CELL_GAP);
    }
  }
  return Math.max(base, Math.min(bottom, areaHeight - panel.height));
}

/**
 * Reports the bottom offset that keeps the host panel above the bottom widget
 * stacks it would cover, recomputed as widgets, the panel or the screen
 * change. The value given is the panel's offset with no widget in the way.
 */
@Directive({
  selector: '[fbBottomClearance]'
})
export class BottomClearanceDirective implements OnDestroy {
  readonly fbBottomClearance = input.required<number>();
  readonly clearance = output<number>();

  private el: HTMLElement = inject(ElementRef<HTMLElement>).nativeElement;
  private zone = inject(NgZone);
  private plotterExt = inject(PlotterExtensionService);
  private resizeObserver?: ResizeObserver;
  private last: number | null = null;

  constructor() {
    afterRenderEffect(() => {
      this.plotterExt.activeWidgets();
      this.measure();
    });
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      this.zone.runOutsideAngular(() => {
        this.resizeObserver = new ResizeObserver(() => this.measure());
        this.resizeObserver.observe(this.el);
        const parent = this.el.offsetParent;
        if (parent) {
          this.resizeObserver.observe(parent);
        }
      });
    });
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  private measure() {
    const parent = this.el.offsetParent as HTMLElement | null;
    if (!parent) {
      return;
    }
    const area = parent.getBoundingClientRect();
    const panel = this.el.getBoundingClientRect();
    const widgets = Array.from(
      document.querySelectorAll<HTMLElement>(BOTTOM_WIDGETS),
      (cell) => cell.getBoundingClientRect()
    );
    const bottom = Math.round(
      bottomClearance(
        { left: panel.left, right: panel.right, height: panel.height },
        widgets,
        area.bottom,
        area.height,
        this.fbBottomClearance()
      )
    );
    if (bottom !== this.last) {
      this.last = bottom;
      this.zone.run(() => this.clearance.emit(bottom));
    }
  }
}
