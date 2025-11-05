import {
  Component,
  Input,
  ChangeDetectionStrategy,
  SimpleChanges,
  Output,
  EventEmitter
} from '@angular/core';

import { MatTooltip } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AppFacade } from 'src/app/app.facade';
import { Position } from 'src/app/types';
import { getGreatCircleBearing } from 'geolib';
import { GeoUtils } from '../geoutils';
import { MatToolbarModule } from '@angular/material/toolbar';

// ********* Measurements Component ********

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'fb-measurements',
  imports: [MatIconModule, MatButtonModule, MatTooltip, MatToolbarModule],
  template: `
    <div class="_ap_measurements">
      <mat-toolbar>
        <div class="_ap_row">
          <div class="_ap_row">
            <div class="icon-label">
              <mat-icon>straighten</mat-icon>
            </div>
            <div class="value">{{ totalDistance }}<br /></div>
          </div>
          @if(!totalOnly) {
          <div class="_ap_row">
            <div class="_ap_row">
              <div style="font-size: 12pt;">
                <mat-icon>square_foot</mat-icon><br />
                {{
                  this.coords.length < 2
                    ? '-'
                    : this.index === -1
                    ? this.coords.length - 1
                    : this.index + 1
                }}
              </div>
              <div class="value">
                {{ legDistance }}<br />
                {{ legBearing }}
              </div>
            </div>
          </div>
          }
          <div>
            <button
              matTooltip="Cancel"
              matTooltipPosition="below"
              mat-icon-button
              (click)="close()"
            >
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </div>
      </mat-toolbar>
    </div>
  `,
  styles: [
    `
      ._ap_measurements {
        position: relative;
        top: 0;
        min-width: 200px;
      }

      ._ap_row {
        display: flex;
        flex-wrap: no-wrap;
        flex: 2;
      }
      ._ap_row .icon-label {
        width: 30px;
      }
      ._ap_row .row-label {
        font-weight: 500;
        min-width: 60px;
      }
      ._ap_measurements .value {
        padding-right: 10px;
      }

      @media only screen and (max-width: 500px) {
        ._ap_measurements {
          left: 0;
          width: 100%;
        }
      }
    `
  ]
})
export class Measurements {
  @Input() coords: Array<Position> = [];
  @Input() index = -1;
  @Input() totalOnly = false;
  @Output() cancel: EventEmitter<boolean> = new EventEmitter();

  protected totalDistance: string;
  protected legDistance: string;
  protected legBearing: string;
  protected btnDisable = {
    prev: false,
    next: false
  };

  constructor(public app: AppFacade) {
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
