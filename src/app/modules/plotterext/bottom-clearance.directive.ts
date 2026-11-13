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

export interface HSpan {
  left: number;
  right: number;
}

export interface HRect extends HSpan {
  top: number;
}

const overlaps = (a: HSpan, b: HSpan) => a.left < b.right && a.right > b.left;

/**
 * Whether a status bar belongs to a chart pane reaching the bottom of `area`.
 * With the charts stacked, the upper pane's status bar sits mid-screen and
 * never rises onto the widgets along the bottom.
 */
const inBottomPane = (bar: HTMLElement, area: DOMRect) => {
  const pane = bar.offsetParent;
  return !!pane && pane.getBoundingClientRect().bottom >= area.bottom - 1;
};

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
  // status bars watched for a change of width, which moves the stacks under them
  private watchedBars = new WeakSet<Element>();

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
      : Array.from(document.querySelectorAll<HTMLElement>(STATUS_BAR))
          .filter((bar) => {
            this.watch(bar);
            return inBottomPane(bar, area);
          })
          .map((bar) => bar.getBoundingClientRect());
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
          right: panel.right,
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
