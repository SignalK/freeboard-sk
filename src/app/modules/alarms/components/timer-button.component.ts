/***********************************
timer button component
    <timer-button>
***********************************/
import {
  Component,
  Input,
  Output,
  ChangeDetectionStrategy,
  EventEmitter,
  signal
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'timer-button',
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [``],
  template: `
    <div>
      @if (cancelled()) {
        &nbsp;
        <button mat-raised-button (click)="action()">
          @if (icon) {
            <mat-icon>{{ icon }}</mat-icon>
          }
          {{ cancelledLabel }}
        </button>
      } @else {
        <button mat-button [disabled]="disabled" (click)="cancel()">
          {{ label }} {{ timeLeft() }} secs
        </button>
      }
    </div>
  `
})
export class TimerButtonComponent {
  @Input() period = 5000; // timeout period in milliseconds
  @Input() label: string;
  @Input() icon: string;
  @Input() cancelledLabel: string;
  @Input() disabled: boolean;
  @Output() nextPoint: EventEmitter<void> = new EventEmitter();

  private timer: ReturnType<typeof setInterval>;
  protected timeLeft = signal<number>(this.period ?? 5);
  protected cancelled = signal<boolean>(false);

  constructor() {}

  ngOnInit() {
    this.timeLeft.update(() => (isNaN(this.period) ? 5 : this.period / 1000));
    this.label = this.label ?? 'Action in ';
    this.cancelledLabel = this.cancelledLabel ?? 'OK';
    this.timer = setInterval(() => {
      this.timeLeft.update((current) => --current);
      if (this.timeLeft() === 0) {
        this.disabled = true;
        this.action();
        clearInterval(this.timer);
        this.timer = null;
      }
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  cancel() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.cancelled.set(true);
  }

  action() {
    this.nextPoint.emit();
  }
}
