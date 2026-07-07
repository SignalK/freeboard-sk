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
import { ChartImageAdjustment } from 'src/app/types';

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
    MatTooltipModule
  ],
  template: `
    <div class="_ap-image-adjustment">
      <div style="display:flex;">
        <div style="padding: 15px 0 0 10px;">
          <mat-icon>tune</mat-icon>
        </div>
        <div style="flex: 1 1 auto;">
          <h1 mat-dialog-title>{{ data.title ?? 'Image Adjustment' }}</h1>
        </div>
        <div style="width:50px;padding: 15px 0 0 10px;">
          <button mat-icon-button (click)="handleClose(false)">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>

      <mat-dialog-content style="padding-top: 5px;">
        <div style="display: flex; align-items: center; margin-bottom: 8px">
          <div style="flex: 1 1 auto">{{ data.text }}</div>
        </div>
        <div style="display: flex; align-items: center">
          <div style="width: 80px">Brightness</div>
          <mat-slider style="flex: 1 1 auto" [min]="0" [max]="200" [step]="1">
            <input
              matSliderThumb
              aria-label="Brightness"
              [value]="brightness()"
              (input)="onBrightnessChange($event)"
            />
          </mat-slider>
          <div style="min-width: 48px; text-align: right">
            {{ brightness() }}%
          </div>
        </div>
        <div style="display: flex; align-items: center">
          <div style="width: 80px">Contrast</div>
          <mat-slider style="flex: 1 1 auto" [min]="0" [max]="200" [step]="1">
            <input
              matSliderThumb
              aria-label="Contrast"
              [value]="contrast()"
              (input)="onContrastChange($event)"
            />
          </mat-slider>
          <div style="min-width: 48px; text-align: right">
            {{ contrast() }}%
          </div>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions>
        <button mat-button (click)="reset()">RESET</button>
        <span style="flex: 1 1 auto"></span>
        <button mat-raised-button (click)="handleClose(true)">APPLY</button>
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
    title: string;
    text: string;
    value: ChartImageAdjustment;
    onChange: (value: ChartImageAdjustment) => void;
  }>(MAT_DIALOG_DATA);

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
