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
/** The buttons of the left-hand map toolbar, which run down from the top. */
const LEFT_TOOLBAR_ITEMS = 'fb-map-toolbar.left .toolbarItem';

export interface HRect {
  left: number;
  right: number;
  top: number;
  /** A widget under the status bar, which sits on top of its stack. */
  center?: boolean;
}

/**
 * Bottom offset (px) that keeps a panel spanning `panel` horizontally clear
 * of the `widgets` it overlaps: `base` when it overlaps none, otherwise just
 * above the tallest overlapping stack, but never pushed off the top of an area
 * `areaHeight` high. Offsets count from `areaBottom`. Above a stack under the
 * status bar the panel keeps its whole `base`, since the status bar it clears
 * at rest is lifted onto that stack.
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
      bottom = Math.max(
        bottom,
        areaBottom - w.top + (w.center ? base : WIDGET_CELL_GAP)
      );
    }
  }
  return Math.max(base, Math.min(bottom, areaHeight - panel.height));
}

/**
 * Whether a panel whose top edge rests at `panelTop` (px, viewport) would
 * reach up into the left-hand toolbar, whose lowest button ends at the
 * largest bottom of `items`.
 */
export function reachesLeftToolbar(
  panelTop: number,
  items: { bottom: number }[]
): boolean {
  return items.some((i) => i.bottom > panelTop);
}

/**
 * Reports the bottom offset that keeps the host panel above the bottom widget
 * stacks it would cover, recomputed as widgets, the panel or the screen
 * change. The value given is the panel's offset with no widget in the way.
 * The panel's current width counts, so it stays down on the stacks it covers
 * now and rises over a taller one only once it grows that wide.
 *
 * On a small screen that lift can bring the panel up beside the buttons of the
 * left-hand toolbar; `besideLeftToolbar` reports when it does, so the host can
 * move the panel clear of them. The status bar itself never moves aside, so it
 * skips that check.
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
  /**
   * The buttons the left-hand toolbar offers, 0 while it is hidden. The
   * panel is measured again when it changes, as that moves the lowest button.
   */
  readonly fbBottomClearanceLeftToolbar = input(0);
  readonly clearance = output<number>();
  readonly besideLeftToolbar = output<boolean>();

  private el: HTMLElement = inject(ElementRef<HTMLElement>).nativeElement;
  private zone = inject(NgZone);
  private plotterExt = inject(PlotterExtensionService);
  private resizeObserver?: ResizeObserver;
  private last: number | null = null;
  private lastBeside: boolean | null = null;

  constructor() {
    afterRenderEffect(() => {
      this.plotterExt.shownWidgets();
      this.fbBottomClearanceLeftToolbar();
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
    const statusBar = this.fbBottomClearanceStatusBar();
    const bars = statusBar
      ? []
      : Array.from(document.querySelectorAll<HTMLElement>(STATUS_BAR), (bar) =>
          bar.getBoundingClientRect()
        );
    const widgets = Array.from(
      document.querySelectorAll<HTMLElement>(BOTTOM_WIDGETS),
      (cell): HRect => {
        const r = cell.getBoundingClientRect();
        return {
          left: r.left,
          right: r.right,
          top: r.top,
          center: bars.some((b) => b.left < r.right && b.right > r.left)
        };
      }
    );
    const bottom = Math.round(
      bottomClearance(
        {
          left: panel.left,
          right: panel.right,
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
    if (statusBar) {
      return;
    }
    const beside = reachesLeftToolbar(
      area.bottom - bottom - panel.height,
      Array.from(
        document.querySelectorAll<HTMLElement>(LEFT_TOOLBAR_ITEMS),
        (item) => item.getBoundingClientRect()
      )
    );
    if (beside !== this.lastBeside) {
      this.lastBeside = beside;
      this.zone.run(() => this.besideLeftToolbar.emit(beside));
    }
  }
}
