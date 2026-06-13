// Widget overlay: a full-map-size layer with a 2x2 widget grid at each
// anchor position (top-right, top-center, bottom-center, bottom-left,
// bottom-right — top-left is reserved for Freeboard's own controls).
//
// The overlay itself never intercepts pointer events; only placed widget
// frames do. Adding a widget is a press-and-hold on an EMPTY anchor cell:
// a document-level capture listener watches presses that geometrically fall
// inside an anchor area (map interaction underneath is unaffected — the
// gesture only fires after the pointer stays put for the hold duration).

import {
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  computed,
  inject
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PlotterExtensionService } from './plotterext.service';
import { PlotterWidgetFrame } from './widget-frame.component';
import { ANCHOR_GRID, ANCHORS, AnchorId, PlacedWidget, parseSize } from './types';

const HOLD_MS = 1500;
const MOVE_SLOP_PX = 8;

interface CellStyle {
  [key: string]: string;
}

@Component({
  selector: 'fb-plotterext-overlay',
  imports: [PlotterWidgetFrame, MatIconModule],
  template: `
    @if (service.filterChips().length) {
      <div
        class="pe-chips"
        [class.pe-chips-low]="(byAnchor()['ct'] ?? []).length > 0"
      >
        @for (chip of service.filterChips(); track chip.type + chip.extension) {
          <div class="pe-chip">
            <mat-icon class="pe-chip-icon">filter_alt</mat-icon>
            <span class="pe-chip-label">{{ chip.label }}</span>
            <button
              class="pe-chip-clear"
              (click)="clearChip(chip)"
              aria-label="Clear filter"
            >
              <mat-icon>close</mat-icon>
            </button>
          </div>
        }
      </div>
    }
    @for (anchor of anchors; track anchor) {
      <div
        class="pe-anchor"
        [class]="'pe-' + anchor"
        [attr.data-anchor]="anchor"
        [style]="anchorStyle(anchor)"
      >
        @for (placed of byAnchor()[anchor]; track placed.instanceId) {
          <div class="pe-cell" [style]="cellStyle(placed)">
            <fb-plotterext-widget [placed]="placed"></fb-plotterext-widget>
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      :host {
        position: absolute;
        inset: 0;
        z-index: 2000;
        pointer-events: none;
        /* keep in sync with cellHeightPx()/WIDGET_CELL_GAP in types.ts */
        --pe-cell-w: clamp(96px, 11vw, 150px);
        --pe-cell-h: clamp(84px, 9.5vw, 124px);
        --pe-gap: 6px;
        --pe-margin: 10px;
      }
      .pe-anchor {
        position: absolute;
        display: grid;
        /* grid-template-columns is set per-anchor (see anchorStyle) so corners
           can be wider than the center anchors */
        grid-template-rows: repeat(2, var(--pe-cell-h));
        gap: var(--pe-gap);
        pointer-events: none;
      }
      /* corner areas sit flush against the screen sides; vertical offsets
         keep clear of Freeboard's top icon row and bottom status bar */
      .pe-tr {
        /* flush against the screen top; the right-hand toolbar pushes down to
           sit below this widget stack (see toolbarTopOffset) */
        top: 0;
        right: 0;
      }
      .pe-ct {
        top: 0;
        left: 50%;
        transform: translateX(calc(-50% + var(--pe-center-shift, 0px)));
      }
      .pe-cb {
        /* flush against the screen bottom; the Lat/Lon status bar lifts to
           sit above this widget stack (see statusBarLift) */
        bottom: 0;
        left: 50%;
        transform: translateX(calc(-50% + var(--pe-center-shift, 0px)));
      }
      .pe-bl {
        bottom: 0;
        left: 0;
      }
      .pe-br {
        bottom: 0;
        right: 0;
      }
      .pe-cell {
        pointer-events: auto;
        overflow: hidden;
        border-radius: 10px;
        box-shadow: 0 1px 5px rgba(0, 0, 0, 0.35);
      }
      /* active resource-filter chips */
      .pe-chips {
        position: absolute;
        top: 8px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 6px;
        pointer-events: auto;
        z-index: 1;
      }
      .pe-chips-low {
        top: calc(2 * var(--pe-cell-h) + var(--pe-gap) + 10px);
      }
      .pe-chip {
        display: flex;
        align-items: center;
        gap: 4px;
        background: rgba(20, 26, 32, 0.85);
        color: #e8edf2;
        border-radius: 16px;
        padding: 3px 6px 3px 10px;
        font-size: 12px;
        max-width: 320px;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
      }
      .pe-chip-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #29b6f6;
      }
      .pe-chip-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .pe-chip-clear {
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        background: rgba(255, 255, 255, 0.15);
        color: #e8edf2;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        padding: 0;
        cursor: pointer;
      }
      .pe-chip-clear mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    `
  ]
})
export class PlotterExtensionOverlay implements OnInit, OnDestroy {
  anchors = ANCHORS;

  byAnchor = computed(() => {
    const result: Record<string, PlacedWidget[]> = {};
    for (const anchor of ANCHORS) result[anchor] = [];
    for (const placed of this.service.activeWidgets()) {
      result[placed.anchor]?.push(placed);
    }
    return result;
  });

  protected service = inject(PlotterExtensionService);
  private zone = inject(NgZone);
  private host = inject(ElementRef<HTMLElement>);

  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private downPoint: { x: number; y: number } | null = null;
  private onPointerDown = (e: PointerEvent) => this.pointerDown(e);
  private onPointerMove = (e: PointerEvent) => this.pointerMove(e);
  private onPointerEnd = () => this.cancelHold();
  private unregisterHitTester: (() => void) | null = null;

  ngOnInit() {
    // Expose this overlay's screen->cell hit test to the host service so the
    // desktop right-click menu can resolve a point to an anchor cell.
    this.unregisterHitTester = this.service.registerHitTester((x, y) =>
      this.hitTest(x, y)
    );
    // Outside Angular: these fire for every map interaction.
    this.zone.runOutsideAngular(() => {
      document.addEventListener('pointerdown', this.onPointerDown, true);
      document.addEventListener('pointermove', this.onPointerMove, true);
      document.addEventListener('pointerup', this.onPointerEnd, true);
      document.addEventListener('pointercancel', this.onPointerEnd, true);
    });
  }

  ngOnDestroy() {
    this.cancelHold();
    this.unregisterHitTester?.();
    this.unregisterHitTester = null;
    document.removeEventListener('pointerdown', this.onPointerDown, true);
    document.removeEventListener('pointermove', this.onPointerMove, true);
    document.removeEventListener('pointerup', this.onPointerEnd, true);
    document.removeEventListener('pointercancel', this.onPointerEnd, true);
  }

  /**
   * Center anchors (ct/cb) center their *content* as a unit: when the
   * placed widgets only use one grid column, the area shifts by half a
   * column so a lone 1x1 widget sits dead-center, while a 2x1 (or a pair)
   * is centered as a whole.
   */
  anchorStyle(anchor: AnchorId): CellStyle {
    const style: CellStyle = {
      'grid-template-columns': `repeat(${ANCHOR_GRID[anchor].cols}, var(--pe-cell-w))`
    };
    if (anchor !== 'ct' && anchor !== 'cb') return style;
    const used = new Set<number>();
    for (const placed of this.byAnchor()[anchor] ?? []) {
      const def = this.service.widgetDef(placed.extension, placed.widget);
      const { cols } = parseSize(def?.size ?? '1x1');
      for (let c = placed.col; c < placed.col + cols && c < 2; c++) {
        used.add(c);
      }
    }
    let shift = '0px';
    if (used.size === 1) {
      shift = used.has(0)
        ? 'calc((var(--pe-cell-w) + var(--pe-gap)) / 2)'
        : 'calc((var(--pe-cell-w) + var(--pe-gap)) / -2)';
    }
    style['--pe-center-shift'] = shift;
    return style;
  }

  cellStyle(placed: PlacedWidget): CellStyle {
    const def = this.service.widgetDef(placed.extension, placed.widget);
    const { cols, rows } = parseSize(def?.size ?? '1x1');
    return {
      'grid-column': `${placed.col + 1} / span ${cols}`,
      'grid-row': `${placed.row + 1} / span ${rows}`
    };
  }

  clearChip(chip: { type: string; extension: string }) {
    this.service.clearResourceFilter(chip.extension, chip.type);
  }

  // ---------- press-and-hold to add ----------

  private pointerDown(e: PointerEvent) {
    this.cancelHold();
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    // Ignore presses on dialogs, menus, or other app chrome — only presses
    // that reach the map (or empty overlay space) count.
    const target = e.target as HTMLElement | null;
    if (
      target?.closest(
        '.cdk-overlay-container, mat-dialog-container, button, mat-toolbar, .pe-cell'
      )
    ) {
      return;
    }
    const hit = this.hitTest(e.clientX, e.clientY);
    if (!hit) return;
    if (this.service.cellOccupied(hit.anchor, hit.cell)) return;
    this.downPoint = { x: e.clientX, y: e.clientY };
    this.holdTimer = setTimeout(() => {
      this.holdTimer = null;
      this.zone.run(() =>
        this.service.openAddWidgetPicker(hit.anchor, hit.cell)
      );
    }, HOLD_MS);
  }

  private pointerMove(e: PointerEvent) {
    if (!this.holdTimer || !this.downPoint) return;
    const dx = e.clientX - this.downPoint.x;
    const dy = e.clientY - this.downPoint.y;
    if (dx * dx + dy * dy > MOVE_SLOP_PX * MOVE_SLOP_PX) this.cancelHold();
  }

  private cancelHold() {
    if (this.holdTimer) clearTimeout(this.holdTimer);
    this.holdTimer = null;
    this.downPoint = null;
  }

  private hitTest(
    x: number,
    y: number
  ): { anchor: AnchorId; cell: { col: number; row: number } } | null {
    const areas = (this.host.nativeElement as HTMLElement).querySelectorAll(
      '.pe-anchor'
    );
    for (const area of Array.from(areas)) {
      const rect = area.getBoundingClientRect();
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        continue;
      }
      const anchor = (area as HTMLElement).dataset['anchor'] as AnchorId;
      const { cols, rows } = ANCHOR_GRID[anchor];
      const col = Math.min(
        cols - 1,
        Math.max(0, Math.floor(((x - rect.left) / rect.width) * cols))
      );
      const row = Math.min(
        rows - 1,
        Math.max(0, Math.floor(((y - rect.top) / rect.height) * rows))
      );
      return { anchor, cell: { col, row } };
    }
    return null;
  }
}
