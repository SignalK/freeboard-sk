/***********************************
wakelock component
    <wakelock>
***********************************/
import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  Output,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  EventEmitter
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  standalone: true,
  selector: 'wakelock',
  imports: [CommonModule, MatButtonModule, MatTooltipModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [],
  template: `
    @if(isSupported) {
    <div>
      <button
        mat-mini-fab
        [color]="state ? 'primary' : 'accent'"
        [matTooltip]="tipText"
        matTooltipPosition="left"
        (click)="toggle()"
      >
        <mat-icon>{{ state ? 'visibility' : 'visibility_off' }}</mat-icon>
      </button>
    </div>
    }
  `
})
export class WakeLockComponent {
  @Input() tooltipText = 'Prevent device from sleeping.';
  @Input() setOn = false;
  @Output() has: EventEmitter<boolean> = new EventEmitter();
  @Output() change: EventEmitter<boolean> = new EventEmitter();

  public isSupported = false;
  public wakeLockRef = null;
  public state = false;
  public tipText: string;
  private tipTextSet = 'Preventing sleep.';

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    if ('wakeLock' in navigator) {
      this.isSupported = true;
    } else {
      this.isSupported = false;
    }
    this.tipText = this.tooltipText;
    if (this.setOn) {
      this.toggle();
    }
  }

  ngAfterViewInit() {
    this.has.emit(this.isSupported);
  }

  ngOnDestroy() {
    this.releaseLock();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  ngOnChanges() {
    if (!this.isSupported) {
      return;
    }
    if (this.setOn) {
      this.requestLock();
    } else {
      this.releaseLock();
    }
  }

  toggle() {
    if (this.wakeLockRef) {
      this.releaseLock();
    } else {
      this.requestLock();
    }
  }

  requestLock() {
    if (this.wakeLockRef) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).wakeLock
      .request('screen')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((w: any) => {
        this.wakeLockRef = w;
        this.state = true;
        this.tipText = this.tipTextSet;
        // listen for release
        this.wakeLockRef.addEventListener('release', this.onRelease);
        // listen for visibility change
        document.addEventListener(
          'visibilitychange',
          this.onVisibilityChange.bind(this)
        );
        this.cdr.detectChanges();
        this.change.emit(this.state);
      })
      .catch(() => {
        this.wakeLockRef = null;
        this.state = false;
        this.tipText = this.tooltipText;
        this.change.emit(this.state);
      });
  }

  releaseLock() {
    if (this.wakeLockRef) {
      this.wakeLockRef.removeEventListener('release', this.onRelease);
      this.wakeLockRef.release().then(() => {
        this.wakeLockRef = null;
        this.state = false;
        this.tipText = this.tooltipText;
        this.cdr.detectChanges();
        this.change.emit(this.state);
      });
    }
  }

  // ** event handlers **
  onRelease() {
    this.tipText = this.tooltipText;
    this.change.emit(false);
  }

  async onVisibilityChange() {
    if (
      this.wakeLockRef !== null &&
      this.state &&
      document.visibilityState === 'visible'
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.wakeLockRef = await (navigator as any).wakeLock.request('screen');
      this.tipText = this.tipTextSet;
      this.change.emit(true);
    }
  }
}
