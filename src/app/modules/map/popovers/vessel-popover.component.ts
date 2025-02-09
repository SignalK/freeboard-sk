// ** Default Profile Vessel popover **

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  SimpleChanges
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PipesModule } from 'src/app/lib/pipes';
import { PopoverComponent } from './popover.component';
import { CompassComponent } from './compass.component';

import { AppInfo } from 'src/app/app.info';
import { Buddies, SKVessel } from 'src/app/modules';
import { Convert } from 'src/app/lib/convert';
import { GeoUtils } from 'src/app/lib/geoutils';
import { Position } from 'src/app/types';
import { HttpErrorResponse } from '@angular/common/http';

/*********** Vessel Popover ***************
title: string -  title text,
vessel: SKVessel - vessel data
useMagnetic: string - use Magnetic values instead of True
isActive: boolean - set to true if is the active vessel
isSelf: boolean - true if vessel 'self'
*************************************************/
@Component({
  selector: 'vessel-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    PipesModule,
    PopoverComponent,
    CompassComponent
  ],
  template: `
    <ap-popover [title]="_title" [canClose]="canClose" (closed)="handleClose()">
      @if(vessel.callsignVhf) {
      <div style="display:flex;">
        <div style="font-weight:bold;">Callsign (VHF):</div>
        <div
          style="flex: 1 1 auto;text-align:right;"
          [innerText]="vessel.callsignVhf"
        ></div>
      </div>
      } @else if(vessel.callsignHf) {
      <div style="display:flex;">
        <div style="font-weight:bold;">Callsign (HF):</div>
        <div
          style="flex: 1 1 auto;text-align:right;"
          [innerText]="vessel.callsignHf"
        ></div>
      </div>
      }
      <div style="display:flex;">
        <div style="font-weight:bold;">Latitude:</div>
        <div
          style="flex: 1 1 auto;text-align:right;"
          [innerText]="
            position[1] | coords : app.config.selections.positionFormat : true
          "
        ></div>
      </div>
      <div style="display:flex;">
        <div style="font-weight:bold;">Longitude:</div>
        <div
          style="flex: 1 1 auto;text-align:right;"
          [innerText]="
            position[0] | coords : app.config.selections.positionFormat
          "
        ></div>
      </div>
      <div style="display:flex;">
        <div style="font-weight:bold;">Last Update:</div>
        <div style="flex: 1 1 auto;text-align:right;">
          {{ timeLastUpdate }} {{ timeAgo }}
        </div>
      </div>
      <div style="display:flex;flex-wrap:no-wrap;">
        <div style="width:150px;">
          <ap-compass
            [heading]="convert.radiansToDegrees(vessel.orientation)"
            [windtrue]="
              vessel.wind.direction !== null
                ? convert.radiansToDegrees(vessel.wind.direction)
                : null
            "
            [windapparent]="
              vessel.wind.awa !== null
                ? convert.radiansToDegrees(vessel.wind.awa)
                : null
            "
            [speed]="app.formatSpeed(vessel.sog)"
            [speedunits]="app.formattedSpeedUnits"
          >
          </ap-compass>
        </div>
        <div>
          &nbsp;<br />
          <div>
            <div style="border-left:olive 10px solid;padding-left: 5px;">
              <span style="font-weight:bold">
                Wind ({{ useMagnetic ? 'M' : 'T' }}):</span
              >
            </div>
            <div style="flex: 1 1 auto;text-align:right;">
              {{ app.formatSpeed(vessel.wind.tws, true) }}&nbsp;{{
                app.formattedSpeedUnits
              }}
            </div>
          </div>
          <div>
            <div
              style="border-left:rgb(16, 75, 16) 10px solid;;padding-left: 5px;"
            >
              <span style="font-weight:bold;"> Wind (A):</span>
            </div>
            <div style="flex: 1 1 auto;text-align:right;">
              {{ app.formatSpeed(vessel.wind.aws, true) }}&nbsp;{{
                app.formattedSpeedUnits
              }}
            </div>
          </div>
        </div>
      </div>
      <div style="display:flex;">
        <div style="flex:1 1 auto;"></div>
        <div style="text-align:right;">
          @if(isActive) {
          <button
            mat-button
            (click)="handleMarkPosition()"
            matTooltip="Add Waypoint at vessel location"
          >
            <mat-icon>add_location</mat-icon>
            DROP WPT
          </button>
          } @else {
          <button mat-button (click)="toggleFlag()" matTooltip="Flag vessel">
            <mat-icon>{{ isFlagged ? 'clear_all' : 'flag' }}</mat-icon>
            {{ isFlagged ? 'UN-FLAG' : 'FLAG' }}
          </button>

          @if(!isSelf &&  app.data.buddyList.hasApi) {
          <button mat-button (click)="toggleBuddy()" matTooltip="Is Buddy">
            <mat-icon>{{
              vessel.buddy ? 'group_remove' : 'group_add'
            }}</mat-icon>
            {{ vessel.buddy ? 'UN-BUDDY' : 'BUDDY' }}
          </button>
          }

          <button
            mat-button
            (click)="focusVessel(true)"
            matTooltip="Focus vessel"
          >
            <mat-icon>center_focus_weak</mat-icon>
            FOCUS
          </button>
          } @if(isActive && !isSelf) {
          <button
            mat-button
            (click)="focusVessel(false)"
            matTooltip="Clear vessel focus"
          >
            <mat-icon>clear_all</mat-icon>
            UNFOCUS
          </button>
          }
          <button
            mat-button
            (click)="handleInfo()"
            matTooltip="Show Properties"
          >
            <mat-icon>info_outline</mat-icon>
            INFO
          </button>
        </div>
      </div>
    </ap-popover>
  `,
  styleUrls: []
})
export class VesselPopoverComponent {
  @Input() title: string;
  @Input() vessel: SKVessel;
  @Input() useMagnetic: string;
  @Input() isActive: boolean;
  @Input() isSelf: boolean;
  @Input() canClose: boolean;
  @Output() info: EventEmitter<string> = new EventEmitter();
  @Output() closed: EventEmitter<void> = new EventEmitter();
  @Output() focused: EventEmitter<boolean> = new EventEmitter();
  @Output() markPosition: EventEmitter<Position> = new EventEmitter();

  _title: string;
  convert = Convert;
  timeLastUpdate: string;
  timeAgo: string; // last update in minutes ago
  speedUnits: string;

  position: Position = [0, 0];
  isFlagged = false;

  constructor(protected app: AppInfo, private buddies: Buddies) {}

  ngOnInit() {
    if (!this.vessel) {
      this.handleClose();
      return;
    }
    this.isFlagged = this.app.data.vessels.flagged.includes(this.vessel.id);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.vessel) {
      if (!changes.vessel.currentValue) {
        this.handleClose();
        return;
      }
      this.isFlagged = this.app.data.vessels.flagged.includes(this.vessel.id);
      this._title =
        this.title ||
        this.vessel.name ||
        this.vessel.mmsi ||
        this.vessel.callsignVhf ||
        this.vessel.callsignHf;
      ('Vessel:');
      this.position = [
        changes.vessel.currentValue.position[0],
        changes.vessel.currentValue.position[1]
      ];
      this.position = GeoUtils.normaliseCoords(this.position);
    }
    this.timeLastUpdate = `${this.vessel.lastUpdated.getHours()}:${(
      '00' + this.vessel.lastUpdated.getMinutes()
    ).slice(-2)}`;
    const td =
      (new Date().valueOf() - this.vessel.lastUpdated.valueOf()) / 1000;
    this.timeAgo = td < 60 ? '' : `(${Math.floor(td / 60)} min ago)`;
  }

  handleMarkPosition() {
    this.markPosition.emit(this.vessel.position);
  }

  handleInfo() {
    this.info.emit(this.vessel.id);
  }

  focusVessel(setFocus: boolean) {
    this.removeFlag();
    this.focused.emit(setFocus);
  }

  toggleBuddy() {
    const urn = this.vessel.id.split('.').slice(1).join('.');
    if (this.vessel.buddy) {
      this.buddies.remove(urn).subscribe(
        () => {
          //console.log('buddy revedmo:', urn);
        },
        (err: HttpErrorResponse) => {
          //console.log('Error removing buddy!', err);
        }
      );
    } else {
      const name =
        this.vessel.name ??
        this.vessel.mmsi ??
        this.vessel.callsignVhf ??
        urn.slice(-5);
      this.buddies.add(urn, name).subscribe(
        () => {
          //console.log('buddy added:', name);
        },
        (err: HttpErrorResponse) => {
          //console.log('Error adding buddy!', err);
        }
      );
    }
  }

  toggleFlag() {
    if (this.isFlagged) {
      this.removeFlag();
    } else {
      if (!this.app.data.vessels.flagged.includes(this.vessel.id)) {
        this.app.data.vessels.flagged = [this.vessel.id].concat(
          this.app.data.vessels.flagged
        );
      }
    }
    this.isFlagged = !this.isFlagged;
    this.closed.emit();
  }

  private removeFlag() {
    if (this.app.data.vessels.flagged.includes(this.vessel.id)) {
      this.app.data.vessels.flagged.splice(
        this.app.data.vessels.flagged.indexOf(this.vessel.id),
        1
      );
      this.app.data.vessels.flagged = [].concat(this.app.data.vessels.flagged);
    }
  }

  handleClose() {
    this.closed.emit();
  }
}
