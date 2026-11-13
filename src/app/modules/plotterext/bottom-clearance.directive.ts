import {
  Directive,
  ElementRef,
  NgZone,
  OnDestroy,
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  inject,
  input,
  output
} from '@angular/core';
import { PlotterExtensionService } from './plotterext.service';
import { WIDGET_CELL_GAP } from './types';

/** The placed widgets of all bottom anchors. */
const BOTTOM_WIDGETS = '.pe-bl .pe-cell, .pe-cb .pe-cell, .pe-br .pe-cell';
/** The Lat/Lon status bar, which rises above the widgets under its text. */
const STATUS_BAR = '.ol-mouse-position';

export interface HSpan {
  left: number;
  right: number;
}

export interface HRect extends HSpan {
  top: number;
}

const overlaps = (a: HSpan, b: HSpan) => a.left < b.right && a.right > b.left;

/**
 * Bottom offset (px) that keeps a panel spanning `panel` horizontally clear
 * of the `widgets` it overlaps: `base` when it overlaps none, otherwise just
 * above the tallest overlapping stack, but never pushed off the top of an area
 * `areaHeight` high. Offsets count from `areaBottom`.
 *
 * A status bar in `statusBars` rises onto the tallest stack under it. A panel
 * over a status bar keeps its whole `base`, which clears the status bar at
 * rest, above that stack, even where the stack under the panel is lower.
 */
export function bottomClearance(
  panel: { left: number; right: number; height: number },
  widgets: HRect[],
  areaBottom: number,
  areaHeight: number,
  base: number,
  statusBars: HSpan[] = []
): number {
  let bottom = base;
  const bars = statusBars.filter((b) => overlaps(b, panel));
  for (const w of widgets) {
    if (overlaps(w, panel)) {
      bottom = Math.max(bottom, areaBottom - w.top + WIDGET_CELL_GAP);
    }
    if (bars.some((b) => overlaps(b, w))) {
      bottom = Math.max(bottom, areaBottom - w.top + base);
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
  /**
   * The host is the status bar itself: it rises above every widget under
   * it, by its current width.
   */
  readonly fbBottomClearanceStatusBar = input(false, {
    transform: booleanAttribute
  });
  readonly clearance = output<number>();

  private el: HTMLElement = inject(ElementRef<HTMLElement>).nativeElement;
  private zone = inject(NgZone);
  private plotterExt = inject(PlotterExtensionService);
  private resizeObserver?: ResizeObserver;
  private last: number | null = null;
  // status bars watched for a change of width, which moves the stacks under them
  private watchedBars = new WeakSet<Element>();

  constructor() {
    afterRenderEffect(() => {
      this.plotterExt.shownWidgets();
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
        if (!this.fbBottomClearanceStatusBar()) {
          document
            .querySelectorAll(STATUS_BAR)
            .forEach((bar) => this.watch(bar));
        }
      });
    });
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  private watch(bar: Element) {
    if (this.resizeObserver && !this.watchedBars.has(bar)) {
      this.watchedBars.add(bar);
      this.resizeObserver.observe(bar);
    }
  }

  private measure() {
    const parent = this.el.offsetParent as HTMLElement | null;
    if (!parent) {
      return;
    }
    const area = parent.getBoundingClientRect();
    const panel = this.el.getBoundingClientRect();
    const statusBar = this.fbBottomClearanceStatusBar();
    const bars = statusBar
      ? []
      : Array.from(
          document.querySelectorAll<HTMLElement>(STATUS_BAR),
          (bar) => {
            this.watch(bar);
            return bar.getBoundingClientRect();
          }
        );
    const widgets = Array.from(
      document.querySelectorAll<HTMLElement>(BOTTOM_WIDGETS),
      (cell): HRect => {
        const r = cell.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top };
      }
    );
    const bottom = Math.round(
      bottomClearance(
        {
          left: panel.left,
          right: statusBar
            ? panel.right
            : Math.max(
                panel.right,
                maxPanelRight(
                  panel.left,
                  getComputedStyle(this.el).maxWidth,
                  area
                )
              ),
          height: panel.height
        },
        widgets,
        area.bottom,
        area.height,
        this.fbBottomClearance(),
        bars
      )
    );
    if (bottom !== this.last) {
      this.last = bottom;
      this.zone.run(() => this.clearance.emit(bottom));
    }
  }
}
