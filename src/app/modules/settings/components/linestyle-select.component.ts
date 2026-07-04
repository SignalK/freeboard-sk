import { Component, inject, input, linkedSignal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AppFacade } from 'src/app/app.facade';

export interface LineStyleDef {
  fill: { color: string };
  stroke: {
    color: string;
    width: number;
    lineDash: Array<number> | null;
  };
}

export interface LineStyleConfig {
  color: string;
  weight: number;
  dash: string;
}

export type LineStyleDash = 'none' | 'short' | 'medium' | 'long' | 'alt';

@Component({
  selector: 'linestyle-select',
  imports: [
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatInputModule,
    MatSelectModule
  ],
  template: `
    <div style="display:flex">
      <mat-form-field style="width:100px;">
        <mat-label>Color</mat-label>
        <input
          mat-input
          matNativeControl
          type="color"
          [(ngModel)]="_color"
          (change)="
            onSelectChange({ key: 'color', value: $event.srcElement.value })
          "
        />
      </mat-form-field>
      <mat-form-field style="width: 110px">
        <mat-label>Weight</mat-label>
        <mat-select
          [(ngModel)]="_weight"
          (selectionChange)="
            onSelectChange({ key: 'weight', value: $event.value })
          "
        >
          <mat-select-trigger>
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg
                width="48"
                height="10"
                style="vertical-align: middle; margin-right: 6px"
              >
                <line
                  x1="0"
                  y1="5"
                  x2="48"
                  y2="5"
                  stroke="currentColor"
                  stroke-array="none"
                  [attr.stroke-width]="_weight()"
                />
              </svg>
            </div>
          </mat-select-trigger>
          @for (weight of line.weights; track weight) {
            <mat-option [value]="weight">
              <svg
                width="48"
                height="10"
                style="vertical-align: middle; margin-right: 6px"
              >
                <line
                  x1="0"
                  y1="5"
                  x2="48"
                  y2="5"
                  stroke="currentColor"
                  stroke-array="none"
                  [attr.stroke-width]="weight"
                />
              </svg>
            </mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field style="width: 110px">
        <mat-label>Style</mat-label>
        <mat-select
          [(ngModel)]="_dash"
          (selectionChange)="
            onSelectChange({ key: 'dash', value: $event.value })
          "
        >
          <mat-select-trigger>
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg
                width="48"
                height="10"
                style="vertical-align: middle; margin-right: 6px"
              >
                <line
                  x1="0"
                  y1="5"
                  x2="48"
                  y2="5"
                  stroke="currentColor"
                  stroke-width="2"
                  [attr.stroke-dasharray]="line.dashArrays.get(_dash())"
                />
              </svg>
            </div>
          </mat-select-trigger>
          @for (dash of line.dashArrays; track dash[0]) {
            <mat-option [value]="dash[0]">
              <svg
                width="48"
                height="10"
                style="vertical-align: middle; margin-right: 6px"
              >
                <line
                  x1="0"
                  y1="5"
                  x2="48"
                  y2="5"
                  stroke="currentColor"
                  stroke-width="2"
                  [attr.stroke-dasharray]="dash[1]"
                />
              </svg>
            </mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>
  `,
  styles: []
})
export class LineStyleSelectComponent {
  color = input<string>('#ff0000');
  dash = input<LineStyleDash>('none');
  weight = input<number>(1);

  _color = linkedSignal(() => this.color());
  _dash = linkedSignal(() => this.dash());
  _weight = linkedSignal(() => this.weight());

  selectionChange = output<{
    lineStyle: LineStyleDef;
    config: LineStyleConfig;
  }>();

  app = inject<AppFacade>(AppFacade);

  protected line = {
    dashArrays: this.app.lineDashMap,
    weights: [1, 2, 3, 4, 5]
  };

  constructor() {}

  ngOnInit() {}

  onSelectChange(opt: { key: string; value: any }) {
    let d = this.app.formatLineDashArray(this._dash());

    this.selectionChange.emit({
      lineStyle: {
        fill: { color: this._color() },
        stroke: {
          color: this._color(),
          width: this._weight(),
          lineDash: d
        }
      },
      config: {
        color: this._color(),
        weight: this._weight(),
        dash: this._dash()
      }
    });
  }
}
