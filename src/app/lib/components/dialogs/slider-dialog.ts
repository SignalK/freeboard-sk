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
import { AppIconDef } from 'src/app/modules/icons';

export interface SliderInputDialogResult {
  apply: boolean;
  value: number;
}

@Component({
  selector: 'ap-slider-input-dialog',
  imports: [
    MatSliderModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatTooltipModule
  ],
  template: `
    <div class="_ap-slider-input">
      <div style="display:flex;">
        <div style="padding: 15px 0 0 10px;">
          @if (this.data.icon) {
            <mat-icon
              [svgIcon]="this.data.icon.svgIcon"
              [class]="this.data.icon.class"
              >{{ this.data.icon.name }}</mat-icon
            >
          }
        </div>
        <div style="flex: 1 1 auto;">
          <h1 mat-dialog-title>{{ data.title ?? '' }}</h1>
        </div>
        <div style="width:50px;padding: 15px 0 0 10px;">
          <button #btncancel mat-icon-button (click)="handleClose(false)">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>

      <mat-dialog-content style="padding-top: 5px;">
        <div style="display: flex; align-items: center; margin-bottom: 8px">
          <div style="flex: 1 1 auto">{{ data.text }}</div>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 8px">
          <mat-slider
            style="width: stretch"
            [min]="this.data.min ?? 1"
            [max]="this.data.max ?? 100"
            [step]="this.data.step ?? 1"
          >
            <input
              matSliderThumb
              [value]="formattedValue()"
              (input)="onValueChange($event)"
            />
          </mat-slider>
          <div style="min-width: 48px; text-align: right">
            {{ formattedValue() }}{{ this.data.suffix ?? '%' }}
          </div>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions>
        <button mat-raised-button (click)="handleClose(true)">APPLY</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      ._ap-slider-input {
      }
    `
  ]
})
export class SliderInputDialog implements OnInit {
  protected formattedValue = signal<number>(0);

  protected dialogRef = inject(MatDialogRef<SliderInputDialog>);
  protected data = inject<{
    title: string;
    text: string;
    max: number;
    min: number;
    step: number;
    value: number;
    suffix: string;
    icon: AppIconDef;
    onChange: (value: number) => void;
  }>(MAT_DIALOG_DATA);

  constructor() {}

  ngOnInit() {
    this.formattedValue.set(this.data.value);
  }

  protected onValueChange(e: Event) {
    const value = Number((e.target as HTMLInputElement).value);
    this.formattedValue.set(value);
    if (typeof this.data?.onChange === 'function') {
      this.data.onChange(value);
    }
  }

  protected handleClose(apply: boolean) {
    this.dialogRef.close({
      apply: apply,
      value: this.formattedValue()
    });
  }
}
