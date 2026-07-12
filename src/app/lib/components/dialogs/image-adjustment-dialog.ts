import { Component, OnInit, signal, inject } from '@angular/core';
import { MatSliderModule } from '@angular/material/slider';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { CdkDrag, CdkDragEnd, CdkDragHandle } from '@angular/cdk/drag-drop';
import { ChartImageAdjustment, PalettePosition } from 'src/app/types';

export interface ImageAdjustmentDialogResult {
  apply: boolean;
  value: ChartImageAdjustment;
}

// Brightness/contrast are stored as multipliers (1 = neutral) but presented as a
// 0-200% slider, so 100% maps to the neutral value.
const NEUTRAL_PERCENT = 100;
const MAX_PERCENT = 200;
const toPercent = (ratio: number) =>
  Number.isFinite(ratio)
    ? Math.min(MAX_PERCENT, Math.max(0, Math.round(ratio * 100)))
    : NEUTRAL_PERCENT;
const toRatio = (percent: number) => percent / 100;

@Component({
  selector: 'ap-image-adjustment-dialog',
  imports: [
    MatSliderModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatTooltipModule,
    CdkDrag,
    CdkDragHandle
  ],
  template: `
    <div
      class="_ap-image-adjustment"
      style="overflow: hidden;"
      cdkDrag
      cdkDragRootElement=".cdk-overlay-pane"
      [cdkDragFreeDragPosition]="initialPosition"
      (cdkDragEnded)="onDragEnded($event)"
    >
      <div
        cdkDragHandle
        style="display:flex; align-items:center; cursor:move; padding: 4px 4px 0 12px;"
      >
        <mat-icon style="opacity:0.6;">tune</mat-icon>
        <div style="flex: 1 1 auto; padding-left: 8px; font-weight: 500;">
          {{ data.text }}
        </div>
        <button mat-icon-button aria-label="Close" (click)="handleClose(false)">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content
        style="padding: 0 24px; overflow: hidden; margin-top: -4px;"
      >
        <div style="display: flex; align-items: center; margin: -11px 0">
          <div style="width: 72px; font-size: 13px;">Brightness</div>
          <mat-slider
            style="flex: 1 1 auto; min-width: 0"
            [min]="0"
            [max]="200"
            [step]="1"
          >
            <input
              matSliderThumb
              aria-label="Brightness"
              [value]="brightness()"
              (input)="onBrightnessChange($event)"
            />
          </mat-slider>
          <div style="min-width: 44px; text-align: right; font-size: 13px;">
            {{ brightness() }}%
          </div>
        </div>
        <div style="display: flex; align-items: center; margin: -11px 0">
          <div style="width: 72px; font-size: 13px;">Contrast</div>
          <mat-slider
            style="flex: 1 1 auto; min-width: 0"
            [min]="0"
            [max]="200"
            [step]="1"
          >
            <input
              matSliderThumb
              aria-label="Contrast"
              [value]="contrast()"
              (input)="onContrastChange($event)"
            />
          </mat-slider>
          <div style="min-width: 44px; text-align: right; font-size: 13px;">
            {{ contrast() }}%
          </div>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions style="min-height: 38px; padding: 0 8px 2px;">
        <button mat-button (click)="reset()">RESET</button>
        <span style="flex: 1 1 auto"></span>
        <button mat-button (click)="handleClose(true)">SAVE</button>
      </mat-dialog-actions>
    </div>
  `
})
export class ImageAdjustmentDialog implements OnInit {
  protected brightness = signal<number>(NEUTRAL_PERCENT);
  protected contrast = signal<number>(NEUTRAL_PERCENT);

  protected dialogRef = inject(
    MatDialogRef<ImageAdjustmentDialog, ImageAdjustmentDialogResult>
  );
  protected data = inject<{
    text: string;
    value: ChartImageAdjustment;
    position: PalettePosition | null;
    onChange: (value: ChartImageAdjustment) => void;
    onMoved: (position: PalettePosition) => void;
  }>(MAT_DIALOG_DATA);

  // Stable reference so cdkDragFreeDragPosition isn't re-applied (and the palette
  // reset to origin) on every change-detection pass.
  protected initialPosition: PalettePosition = this.data.position ?? {
    x: 0,
    y: 0
  };

  ngOnInit() {
    this.brightness.set(toPercent(this.data.value?.brightness ?? 1));
    this.contrast.set(toPercent(this.data.value?.contrast ?? 1));
  }

  protected onBrightnessChange(e: Event) {
    this.brightness.set(Number((e.target as HTMLInputElement).value));
    this.emitChange();
  }

  protected onContrastChange(e: Event) {
    this.contrast.set(Number((e.target as HTMLInputElement).value));
    this.emitChange();
  }

  protected reset() {
    this.brightness.set(NEUTRAL_PERCENT);
    this.contrast.set(NEUTRAL_PERCENT);
    this.emitChange();
  }

  protected onDragEnded(e: CdkDragEnd) {
    if (typeof this.data?.onMoved === 'function') {
      this.data.onMoved(e.source.getFreeDragPosition());
    }
  }

  private currentValue(): ChartImageAdjustment {
    return {
      brightness: toRatio(this.brightness()),
      contrast: toRatio(this.contrast())
    };
  }

  private emitChange() {
    if (typeof this.data?.onChange === 'function') {
      this.data.onChange(this.currentValue());
    }
  }

  protected handleClose(apply: boolean) {
    this.dialogRef.close({ apply, value: this.currentValue() });
  }
}
