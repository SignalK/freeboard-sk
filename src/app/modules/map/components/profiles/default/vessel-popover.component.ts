// ** Default Profile Vessel popover **

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  SimpleChanges
} from '@angular/core';
import { AppInfo } from 'src/app/app.info';
import { SKVessel } from 'src/app/modules';
import { Convert } from 'src/app/lib/convert';
import { GeoUtils } from 'src/app/lib/geoutils';
import { Position } from 'src/app/types';

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
  template: `
    <ap-popover [title]="_title" [canClose]="canClose" (closed)="handleClose()">
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
              vessel.wind.direction != null
                ? convert.radiansToDegrees(vessel.wind.direction)
                : null
            "
            [windapparent]="
              vessel.wind.awa != null
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
          <button
            mat-button
            *ngIf="isActive"
            (click)="handleMarkPosition()"
            color="primary"
            matTooltip="Add Waypoint at vessel location"
          >
            <mat-icon>add_location</mat-icon>
            DROP WPT
          </button>
          <button
            mat-button
            *ngIf="!isActive"
            (click)="focusVessel(true)"
            matTooltip="Focus vessel"
          >
            <mat-icon color="primary">center_focus_weak</mat-icon>
            FOCUS
          </button>
          <button
            mat-button
            *ngIf="isActive && !isSelf"
            (click)="focusVessel(false)"
            matTooltip="Clear vessel focus"
          >
            <mat-icon color="primary">clear_all</mat-icon>
            UNFOCUS
          </button>
          <button
            mat-button
            (click)="handleInfo()"
            matTooltip="Show Properties"
          >
            <mat-icon color="primary">info_outline</mat-icon>
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

  constructor(public app: AppInfo) {}

  ngOnInit() {
    if (!this.vessel) {
      this.handleClose();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.vessel) {
      if (!changes.vessel.currentValue) {
        this.handleClose();
        return;
      }
      this._title =
        this.title ||
        this.vessel.name ||
        this.vessel.mmsi ||
        this.vessel.callsign ||
        'Vessel:';
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
    this.focused.emit(setFocus);
  }

  handleClose() {
    this.closed.emit();
  }
}
