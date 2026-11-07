import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  NgZone,
  signal
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AppFacade } from 'src/app/app.facade';
import { Convert } from 'src/app/lib/convert';
import { bearingDistanceReadout } from 'src/app/modules/map/bearing-distance';
import { CourseService } from '../../course';
import { isMobDestination, mobElapsed } from '../mob';
import { MobService, mobPosition } from '../mob.service';
import { AlertData } from './alert.component';

/** Bearing, distance and time in the water for a MOB, with what to do about it. */
@Component({
  selector: 'fb-mob-readout',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="mob-readout">
      <div class="mob-figures">
        <span
          ><b>{{ elapsed() }}</b> in water</span
        >
        @if (readout(); as r) {
          <span>
            <b>{{ r.bearing }}</b> T &nbsp; <b>{{ r.distance }}</b>
          </span>
        }
      </div>
      <div class="mob-actions">
        <button mat-raised-button (click)="mob.zoomTo(alert())">
          <mat-icon>zoom_in</mat-icon>
          ZOOM
        </button>
        @if (alert().properties.position) {
          <button
            mat-raised-button
            [disabled]="navigating()"
            (click)="mob.directTo(alert())"
          >
            <mat-icon>near_me</mat-icon>
            {{ navigating() ? 'NAVIGATING' : 'DIRECT-TO' }}
          </button>
        }
        @if (alert().canCancel) {
          <button mat-raised-button (click)="mob.end(alert())">
            <mat-icon>close</mat-icon>
            END MOB
          </button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .mob-readout {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding-top: 4px;
      }
      .mob-figures {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 16px;
        font-size: 1.1em;
      }
      .mob-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MobReadoutComponent {
  alert = input.required<AlertData>();

  protected mob = inject(MobService);
  private app = inject(AppFacade);
  private course = inject(CourseService);

  private now = signal(Date.now());

  protected elapsed = computed(() =>
    mobElapsed(this.alert().createdAt, this.now())
  );

  protected navigating = computed(() => {
    const at = mobPosition(this.alert());
    return !!at && isMobDestination(this.course.courseData().position, at);
  });

  /** Re-read on each tick: the vessel position is plain state, not a signal. */
  protected readout = computed(() => {
    this.now();
    const at = mobPosition(this.alert());
    const self = this.app.data.vessels.self;
    if (!at || !self.positionReceived || !self.position) {
      return null;
    }
    const r = bearingDistanceReadout(self.position, at);
    return {
      bearing: this.app.formatValueForDisplay(
        Convert.degreesToRadians(r.bearing),
        'rad',
        { precision: 0 }
      ),
      distance: this.app.formatValueForDisplay(r.distance, 'm', {
        precision: 2
      })
    };
  });

  constructor() {
    const ngZone = inject(NgZone);
    const timer = ngZone.runOutsideAngular(() =>
      setInterval(() => this.now.set(Date.now()), 1000)
    );
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
}
