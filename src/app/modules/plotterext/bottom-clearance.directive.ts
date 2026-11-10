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
 * The right edge (px, viewport) the panel reaches at its widest: its CSS
 * `max-width` resolved against the `area` it sits in, from its `left` edge.
 * Content that changes the panel's width (route data shown only while making
 * way) then cannot move it up and down over the widgets. Handles the forms
 * the panels use, a length, a percentage and `calc(100% - <n>px)`; anything
 * else reaches the area's right edge.
 */
export function maxPanelRight(
  left: number,
  maxWidth: string,
  area: { left: number; width: number }
): number {
  const areaRight = area.left + area.width;
  const px = /^(-?[\d.]+)px$/.exec(maxWidth);
  const pct = /^([\d.]+)%$/.exec(maxWidth);
  const calc = /^calc\(([\d.]+)% - ([\d.]+)px\)$/.exec(maxWidth);
  const width = px
    ? Number(px[1])
    : pct
      ? (area.width * Number(pct[1])) / 100
      : calc
        ? (area.width * Number(calc[1])) / 100 - Number(calc[2])
        : Infinity;
  return Math.min(areaRight, left + width);
}

/**
 * Reports the bottom offset that keeps the host panel above the bottom widget
 * stacks it would cover, recomputed as widgets, the panel or the screen
 * change. The value given is the panel's offset with no widget in the way.
 * The panel's widest span counts, not its current width, so its resting
 * height depends on the widgets alone.
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
        {
          left: panel.left,
          right: Math.max(
            panel.right,
            maxPanelRight(panel.left, getComputedStyle(this.el).maxWidth, area)
          ),
          height: panel.height
        },
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
