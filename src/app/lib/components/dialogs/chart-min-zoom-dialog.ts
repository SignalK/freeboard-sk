import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { truncateZoomToDisplay } from 'src/app/lib/zoom-display';

export interface ChartMinZoomDialogResult {
  apply: boolean;
  value?: number;
}

// Widest zoom range the map view is ever clamped to (AppFacade.MAP_ZOOM_EXTENT
// narrows to the selected charts, so entry stays deliberately wider than that).
export const ZOOM_ENTRY_MIN = 1;
export const ZOOM_ENTRY_MAX = 28;

export interface ZoomBound {
  value?: number;
  invalid: boolean;
}

/**
 * A bound as typed: empty means "no bound", which is a valid state rather than
 * an error.
 */
export function parseZoomBound(text: string | number | null): ZoomBound {
  if (text === null || text === undefined || String(text).trim() === '') {
    return { invalid: false };
  }
  const value = Number(text);
  if (
    !Number.isFinite(value) ||
    value < ZOOM_ENTRY_MIN ||
    value > ZOOM_ENTRY_MAX
  ) {
    return { invalid: true };
  }
  return { value, invalid: false };
}

/** Why the entered level cannot be applied, or null when it can. */
export function displayMinZoomError(bound: ZoomBound): string | null {
  return bound.invalid
    ? `Enter a zoom level between ${ZOOM_ENTRY_MIN} and ${ZOOM_ENTRY_MAX}`
    : null;
}

/** Compact label for a configured minimum, e.g. for a chart list row. */
export function displayMinZoomLabel(value?: number): string {
  return typeof value === 'number' ? `from z${value}` : '';
}

/**
 * Zoom level as taken from the map, at the precision the zoom readout shows it
 * — the same truncation, so the captured bound is the number the user can see
 * on screen and is never above the zoom they took it from.
 */
export function zoomToBoundText(zoom: number): string {
  return Number.isFinite(zoom) ? String(truncateZoomToDisplay(zoom)) : '';
}

@Component({
  selector: 'ap-chart-min-zoom-dialog',
  imports: [
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatTooltipModule,
    CdkDrag,
    CdkDragHandle
  ],
  template: `
    <div
      class="_ap-chart-min-zoom"
      style="overflow: hidden; color: var(--mat-app-text-color);"
      cdkDrag
      cdkDragRootElement=".cdk-overlay-pane"
    >
      <div
        cdkDragHandle
        style="display:flex; align-items:center; cursor:move; padding: 4px 4px 0 12px;"
      >
        <mat-icon style="opacity:0.6;">vertical_align_bottom</mat-icon>
        <div
          style="
            flex: 1 1 auto;
            min-width: 0;
            padding-left: 8px;
            font-weight: 500;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          "
          [title]="data.text"
        >
          {{ data.text }}
        </div>
        <button mat-icon-button aria-label="Close" (click)="handleClose(false)">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div
        style="padding: 0 16px; font-size: 12px; opacity: 0.7; margin-top: -4px;"
      >
        {{ declaredText() }} &middot; map at z{{ currentZoomText() }}
      </div>

      <div
        style="display: flex; align-items: center; gap: 4px; padding: 10px 8px 0 16px;"
      >
        <div style="font-size: 13px;">Show from</div>
        <!--
          step="any" rather than a tenth: the spinner and arrow keys still move
          by 1, which is the useful increment here, while a fractional bound --
          which the target button produces from the map zoom -- stays valid.
          A numeric step would tie the two together and make one of them wrong.
        -->
        <input
          type="number"
          inputmode="decimal"
          step="any"
          aria-label="Lowest zoom level to show this chart at"
          [min]="ZOOM_ENTRY_MIN"
          [max]="ZOOM_ENTRY_MAX"
          [value]="text()"
          (change)="onTextChange($event)"
          style="
            width: 70px;
            height: 34px;
            box-sizing: border-box;
            padding: 0 0 0 8px;
            font: inherit;
            font-size: 14px;
            color: inherit;
            background: transparent;
            border: 1px solid rgba(128, 128, 128, 0.5);
            border-radius: 4px;
          "
        />
        <button
          mat-icon-button
          aria-label="Use the current map zoom"
          matTooltip="Use current map zoom"
          (click)="useCurrentZoom()"
        >
          <mat-icon>my_location</mat-icon>
        </button>
        <button
          mat-icon-button
          aria-label="Clear"
          matTooltip="Clear"
          [disabled]="text() === ''"
          (click)="clear()"
        >
          <mat-icon>close</mat-icon>
        </button>
      </div>

      @if (error()) {
        <div
          role="alert"
          style="padding: 4px 16px 0; font-size: 12px;"
          class="mat-mdc-form-field-error"
        >
          {{ error() }}
        </div>
      } @else {
        <div style="padding: 4px 16px 0; font-size: 12px; opacity: 0.7;">
          {{ summary() }}
        </div>
      }

      <mat-dialog-actions style="min-height: 38px; padding: 0 8px 2px;">
        <span style="flex: 1 1 auto"></span>
        <button mat-button [disabled]="!!error()" (click)="handleClose(true)">
          APPLY
        </button>
      </mat-dialog-actions>
    </div>
  `
})
export class ChartMinZoomDialog implements OnInit {
  protected readonly ZOOM_ENTRY_MIN = ZOOM_ENTRY_MIN;
  protected readonly ZOOM_ENTRY_MAX = ZOOM_ENTRY_MAX;

  protected text = signal<string>('');

  protected dialogRef = inject(
    MatDialogRef<ChartMinZoomDialog, ChartMinZoomDialogResult>
  );
  protected data = inject<{
    text: string;
    value?: number;
    declaredMin?: number;
    declaredMax?: number;
    currentZoom: () => number;
    onChange: (value?: number) => void;
  }>(MAT_DIALOG_DATA);

  protected error = computed(() =>
    displayMinZoomError(parseZoomBound(this.text()))
  );

  protected summary = computed(() => {
    const value = this.currentValue();
    return typeof value === 'number'
      ? `Hidden below z${value}`
      : 'Shown at every zoom level';
  });

  ngOnInit() {
    this.text.set(
      typeof this.data.value === 'number' ? String(this.data.value) : ''
    );
  }

  protected declaredText() {
    const { declaredMin, declaredMax } = this.data;
    return typeof declaredMin === 'number' && typeof declaredMax === 'number'
      ? `data z${declaredMin}–z${declaredMax}`
      : 'data zoom range unknown';
  }

  protected currentZoomText() {
    return zoomToBoundText(this.data.currentZoom());
  }

  protected onTextChange(e: Event) {
    // Committed value only (change, not input): a partially typed "1" on the
    // way to "14" would otherwise preview as the chart flashing off the map.
    this.setText((e.target as HTMLInputElement).value);
  }

  protected useCurrentZoom() {
    this.setText(zoomToBoundText(this.data.currentZoom()));
  }

  protected clear() {
    this.setText('');
  }

  private setText(text: string) {
    this.text.set(text);
    if (!this.error() && typeof this.data?.onChange === 'function') {
      this.data.onChange(this.currentValue());
    }
  }

  private currentValue(): number | undefined {
    return parseZoomBound(this.text()).value;
  }

  protected handleClose(apply: boolean) {
    this.dialogRef.close({ apply, value: this.currentValue() });
  }
}
