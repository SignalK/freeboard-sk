/***********************************
NSEW arrow buttons component
  <nsew-buttons>
***********************************/
import {
  Component,
  Input,
  Output,
  ChangeDetectionStrategy,
  EventEmitter
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'nsew-buttons',
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      .nsew {
        border: silver 0px solid;
      }
      .nsew .btnRow {
        display: flex;
        flex-wrap: no-wrap;
      }
      .nsew .btnDiv {
        width: 50px;
      }
    `
  ],
  template: `
    <div class="nsew">
      <div class="btnRow">
        <div class="btnDiv"></div>
        <div class="btnDiv">
          <button mat-mini-fab [disabled]="disabled" (click)="action(0)">
            <mat-icon>arrow_upward</mat-icon>
          </button>
        </div>
        <div class="btnDiv"></div>
      </div>

      <div class="btnRow">
        <div class="btnDiv">
          <button mat-mini-fab [disabled]="disabled" (click)="action(270)">
            <mat-icon>arrow_back</mat-icon>
          </button>
        </div>
        <div class="btnDiv"></div>
        <div class="btnDiv">
          <button mat-mini-fab [disabled]="disabled" (click)="action(90)">
            <mat-icon>arrow_forward</mat-icon>
          </button>
        </div>
      </div>

      <div class="btnRow">
        <div class="btnDiv"></div>
        <div class="btnDiv">
          <button mat-mini-fab [disabled]="disabled" (click)="action(180)">
            <mat-icon>arrow_downward</mat-icon>
          </button>
        </div>
        <div class="btnDiv"></div>
      </div>
    </div>
  `
})
export class NSEWButtonsComponent {
  @Input() disabled: boolean;
  @Output() direction: EventEmitter<number> = new EventEmitter();

  constructor() {}

  action(value: number) {
    this.direction.emit(value);
  }
}
