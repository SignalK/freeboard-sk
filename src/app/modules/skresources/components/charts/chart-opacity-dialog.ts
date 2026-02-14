import { Component, Inject, signal } from '@angular/core';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatToolbarModule } from '@angular/material/toolbar';

export interface ChartOpacityDialogData {
  name: string;
  opacityPercent: number;
  onOpacityChange?: (opacityPercent: number) => void;
}

export interface ChartOpacityDialogResult {
  save: boolean;
  opacityPercent: number;
}

@Component({
  selector: 'ap-chart-opacity',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSliderModule,
    MatToolbarModule
  ],
  template: `
    <div class="_ap-chart-opacity">
      <mat-toolbar style="background-color: transparent">
        <span><mat-icon>opacity</mat-icon></span>
        <span style="flex: 1 1 auto; text-align: center">Chart Opacity</span>
        <span style="text-align: right">
          <button mat-icon-button (click)="handleClose(false)">
            <mat-icon>close</mat-icon>
          </button>
        </span>
      </mat-toolbar>
      <mat-dialog-content style="min-width: 280px">
        <div style="display: flex; align-items: center; margin-bottom: 8px">
          <div style="flex: 1 1 auto">{{ data.name }}</div>
          <div style="min-width: 48px; text-align: right">
            {{ opacityPercent() }}%
          </div>
        </div>
        <mat-slider min="0" max="100" step="1">
          <input
            matSliderThumb
            [value]="opacityPercent()"
            (valueChange)="setOpacity($event.value ?? $event)"
          />
        </mat-slider>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button (click)="handleClose(false)">Cancel</button>
        <button mat-flat-button (click)="handleClose(true)">Apply</button>
      </mat-dialog-actions>
    </div>
  `,
  standalone: true
})
export class ChartOpacityDialog {
  protected opacityPercent = signal<number>(100);

  constructor(
    public dialogRef: MatDialogRef<ChartOpacityDialog>,
    @Inject(MAT_DIALOG_DATA) public data: ChartOpacityDialogData
  ) {
    this.opacityPercent.set(
      typeof data.opacityPercent === 'number' ? data.opacityPercent : 100
    );
  }

  protected setOpacity(value: number) {
    const v = typeof value === 'number' ? value : 100;
    const clamped = Math.min(100, Math.max(0, Math.round(v)));
    this.opacityPercent.set(clamped);
    // Live preview: notify parent component of opacity change
    if (this.data.onOpacityChange) {
      this.data.onOpacityChange(clamped);
    }
  }

  protected handleClose(save: boolean) {
    const result: ChartOpacityDialogResult = {
      save: save,
      opacityPercent: this.opacityPercent()
    };
    this.dialogRef.close(result);
  }
}
