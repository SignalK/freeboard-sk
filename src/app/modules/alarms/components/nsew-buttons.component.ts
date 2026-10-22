/***********************************
NSEW arrow buttons component
  <nsew-buttons>
***********************************/
import {
  Component,
  Input,
  Output,
  ChangeDetectionStrategy,
  EventEmitter,
  OnDestroy
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/** Hold time before a held button starts repeating, in milliseconds. */
export const REPEAT_DELAY = 400;
/** Time between repeats while a button is held, in milliseconds. */
export const REPEAT_INTERVAL = 100;

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
      .nsew button {
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
      }
    `
  ],
  template: `
    <div class="nsew">
      <div class="btnRow">
        <div class="btnDiv"></div>
        <div class="btnDiv">
          <button
            mat-mini-fab
            [disabled]="disabled"
            (pointerdown)="press(0, $event)"
            (click)="keyboardAction(0, $event)"
          >
            <mat-icon>arrow_upward</mat-icon>
          </button>
        </div>
        <div class="btnDiv"></div>
      </div>

      <div class="btnRow">
        <div class="btnDiv">
          <button
            mat-mini-fab
            [disabled]="disabled"
            (pointerdown)="press(270, $event)"
            (click)="keyboardAction(270, $event)"
          >
            <mat-icon>arrow_back</mat-icon>
          </button>
        </div>
        <div class="btnDiv"></div>
        <div class="btnDiv">
          <button
            mat-mini-fab
            [disabled]="disabled"
            (pointerdown)="press(90, $event)"
            (click)="keyboardAction(90, $event)"
          >
            <mat-icon>arrow_forward</mat-icon>
          </button>
        </div>
      </div>

      <div class="btnRow">
        <div class="btnDiv"></div>
        <div class="btnDiv">
          <button
            mat-mini-fab
            [disabled]="disabled"
            (pointerdown)="press(180, $event)"
            (click)="keyboardAction(180, $event)"
          >
            <mat-icon>arrow_downward</mat-icon>
          </button>
        </div>
        <div class="btnDiv"></div>
      </div>
    </div>
  `
})
export class NSEWButtonsComponent implements OnDestroy {
  @Input() disabled?: boolean;
  @Output() direction: EventEmitter<number> = new EventEmitter();

  private delay: ReturnType<typeof setTimeout> | null = null;
  private repeat: ReturnType<typeof setInterval> | null = null;
  private pointerId: number | null = null;

  constructor() {}

  ngOnDestroy() {
    this.release();
  }

  action(value: number) {
    this.direction.emit(value);
  }

  /**
   * Step once, then keep stepping while the button is held. The release is
   * listened for on the window, as a finger or pointer can leave the button.
   */
  press(value: number, e: PointerEvent) {
    if (this.disabled || e.button !== 0) {
      return;
    }
    this.release();
    this.pointerId = e.pointerId;
    this.action(value);
    this.delay = setTimeout(() => {
      this.repeat = setInterval(() => this.action(value), REPEAT_INTERVAL);
    }, REPEAT_DELAY);
    window.addEventListener('pointerup', this.onPointerEnd);
    window.addEventListener('pointercancel', this.onPointerEnd);
  }

  /** Enter and Space click without a pointer press. */
  keyboardAction(value: number, e: MouseEvent) {
    if (e.detail === 0) {
      this.action(value);
    }
  }

  /** Only the pointer that pressed the button ends its repeat. */
  private onPointerEnd = (e: PointerEvent) => {
    if (e.pointerId === this.pointerId) {
      this.release();
    }
  };

  private release() {
    this.pointerId = null;
    if (this.delay) {
      clearTimeout(this.delay);
      this.delay = null;
    }
    if (this.repeat) {
      clearInterval(this.repeat);
      this.repeat = null;
    }
    window.removeEventListener('pointerup', this.onPointerEnd);
    window.removeEventListener('pointercancel', this.onPointerEnd);
  }
}
