import {
  Component,
  Input,
  ChangeDetectionStrategy,
  SimpleChanges,
  Output,
  EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { AppInfo } from 'src/app/app.info';
import { Position } from 'src/app/types';
import { getGreatCircleBearing } from 'geolib';
import { GeoUtils } from '../geoutils';

// ********* Measurements Component ********

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'fb-measurements',
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltip
  ],
  template: `
    <div class="_ap_measurements">
      <div style="flex: 2;">&nbsp;</div>
      <div>
        <mat-card>
          <mat-card-content>
            <div class="_ap_row">
              <div class="icon-label"><mat-icon>straighten</mat-icon></div>
              <div class="row-label">Total</div>
              <div class="value-label">Distance:</div>
              <div class="value">{{ totalDistance }}</div>
            </div>
            <div class="_ap_row">
              <div class="icon-label"><mat-icon>square_foot</mat-icon></div>
              <div class="row-label">
                {{
                  this.coords.length === 0
                    ? 0
                    : this.index === -1
                    ? this.coords.length - 1
                    : this.index + 1
                }}
                of {{ this.coords.length === 0 ? 0 : this.coords.length - 1 }}
              </div>
              <div class="value-label">Dist:</div>
              <div class="value">{{ legDistance }}</div>
              <div class="value-label">Bearing:</div>
              <div class="value">{{ legBearing }}</div>
            </div>
          </mat-card-content>
          <mat-card-actions align="start">
            <button
              matTooltip="Previous leg"
              matTooltipPosition="above"
              mat-icon-button
              [disabled]="this.btnDisable.prev"
              (click)="select(true)"
            >
              <mat-icon>arrow_back</mat-icon>
            </button>
            <button
              matTooltip="Next leg"
              matTooltipPosition="above"
              mat-icon-button
              [disabled]="this.btnDisable.next"
              (click)="select()"
            >
              <mat-icon>arrow_forward</mat-icon>
            </button>
            <button
              matTooltip="Cancel"
              matTooltipPosition="above"
              mat-icon-button
              (click)="close()"
            >
              <mat-icon color="warn">close</mat-icon>
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
      <div style="flex: 2;">&nbsp;</div>
    </div>
  `,
  styles: [
    `
      ._ap_measurements {
        position: fixed;
        top: 0;
        display: flex;
        width: 100%;
      }

      ._ap_row {
        display: flex;
      }
      ._ap_row .icon-label {
        width: 30px;
      }
      ._ap_row .row-label {
        font-weight: 500;
        min-width: 60px;
      }
      ._ap_row .value-label {
        font-weight: 500;
        padding-right: 5px;
      }
      ._ap_measurements .value {
        padding-right: 10px;
      }
    `
  ]
})
export class Measurements {
  @Input() coords: Array<Position> = [];
  @Input() index = -1;
  @Output() cancel: EventEmitter<boolean> = new EventEmitter();

  protected totalDistance: string;
  protected legDistance: string;
  protected legBearing: string;
  protected btnDisable = {
    prev: false,
    next: false
  };

  constructor(public app: AppInfo) {
    this.init();
  }

  private init(segment?: boolean) {
    if (!segment) {
      this.totalDistance = '--';
    }
    this.legDistance = '--';
    this.legBearing = '--';
    this.btnDisable = {
      prev: true,
      next: true
    };
  }

  ngOnChanges(changes: SimpleChanges) {
    if (
      !this.coords ||
      !Array.isArray(this.coords) ||
      this.coords.length === 0
    ) {
      this.init();
      return;
    }
    if (changes.index) {
      if (isNaN(changes.index.currentValue)) {
        return;
      } else if (
        changes.index.currentValue < -1 &&
        changes.index.currentValue >= this.coords.length
      ) {
        return;
      }
    }
    this.calc();
    this.setButtonState();
  }

  close() {
    this.cancel.next();
  }

  private calc() {
    const td = GeoUtils.routeLength(this.coords);
    this.totalDistance = this.app.formatValueForDisplay(td, 'm');

    let leg: Position[];
    if (this.index === -1) {
      leg = this.coords.slice(-2);
    } else {
      const eidx =
        this.index === this.coords.length - 2 ? undefined : this.index + 2;
      leg = this.coords.slice(this.index, eidx);
    }
    if (leg.length < 2) {
      this.init(true);
    } else {
      const ld = GeoUtils.distanceTo(leg[0], leg[1]);
      const lb = getGreatCircleBearing(leg[0], leg[1]);
      this.legDistance = this.app.formatValueForDisplay(ld, 'm');
      this.legBearing = this.app.formatValueForDisplay(lb, 'deg');
    }
  }

  select(prev?: boolean) {
    console.log(this.index, prev);

    if (prev) {
      if (this.index === -1) {
        if (this.coords.length > 2) {
          this.index = this.coords.length - 3;
        }
      } else if (this.index > 0) {
        this.index--;
      }
    } else {
      if (this.index !== -1 || this.index < this.coords.length - 2) {
        this.index++;
      }
    }
    this.setButtonState();
    this.calc();
  }

  setButtonState() {
    if (this.index > 0 || (this.index === -1 && this.coords.length > 2)) {
      this.btnDisable.prev = false;
    } else {
      this.btnDisable.prev = true;
    }

    if (this.index !== -1 && this.index < this.coords.length - 2) {
      this.btnDisable.next = false;
    } else {
      this.btnDisable.next = true;
    }
  }
}
