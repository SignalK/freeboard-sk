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
          {{ label }} {{ timeLeft() }} {{ timeLeft() === 1 ? 'sec' : 'secs' }}
        </button>
      }
    </div>
  `
})
export class TimerButtonComponent {
  @Input() period = 5000; // timeout period in milliseconds
  @Input() label?: string;
  @Input() icon?: string;
  @Input() cancelledLabel?: string;
  @Input() disabled?: boolean;
  @Output() nextPoint: EventEmitter<void> = new EventEmitter();

  private interval: ReturnType<typeof setInterval> | null = null;
  private timeout: ReturnType<typeof setTimeout> | null = null;
  protected timeLeft = signal<number>(this.period ?? 5);
  protected cancelled = signal<boolean>(false);

  constructor() {}

  ngOnInit() {
    const secs = Number.isFinite(this.period)
      ? Math.max(0, Math.ceil(this.period / 1000))
      : 5;
    this.timeLeft.set(secs);
    this.label = this.label ?? 'Action in ';
    this.cancelledLabel = this.cancelledLabel ?? 'OK';
    if (secs === 0) {
      // No countdown: act on the next tick rather than inside the change
      // detection pass that is creating this button.
      this.timeout = setTimeout(() => this.expire(), 0);
      return;
    }
    this.interval = setInterval(() => {
      this.timeLeft.update((current) => current - 1);
      if (this.timeLeft() <= 0) {
        this.expire();
      }
    }, 1000);
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  cancel() {
    this.stopTimer();
    this.cancelled.set(true);
  }

  private expire() {
    this.stopTimer();
    this.disabled = true;
    this.action();
  }

  // Zone.js tracks timeouts and intervals separately, so each needs its own
  // clear call or Zone keeps the cancelled task pending.
  private stopTimer() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  action() {
    this.nextPoint.emit();
  }
}
