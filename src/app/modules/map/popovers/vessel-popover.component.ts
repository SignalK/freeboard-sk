// ** Default Profile Vessel popover **

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  SimpleChanges,
  inject
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CoordsPipe } from 'src/app/lib/pipes';
import { PopoverComponent } from './popover.component';
import { CompassComponent } from './compass.component';

import { AppFacade } from 'src/app/app.facade';
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
  imports: [
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    CoordsPipe,
    PopoverComponent,
    CompassComponent
  ],
  template: `
    <ap-popover
      [title]="_title"
      [mmsi]="vessel.mmsi"
      [canClose]="canClose"
      (closed)="handleClose()"
    >
      @if (vessel.callsignVhf) {
        <div style="display:flex;">
          <div style="font-weight:bold;">Callsign (VHF):</div>
          <div
            style="flex: 1 1 auto;text-align:right;"
            [innerText]="vessel.callsignVhf"
          ></div>
        </div>
      } @else if (vessel.callsignHf) {
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
            position[1] | coords: app.config.units.positionFormat : true
          "
        ></div>
      </div>
      <div style="display:flex;">
        <div style="font-weight:bold;">Longitude:</div>
        <div
          style="flex: 1 1 auto;text-align:right;"
          [innerText]="position[0] | coords: app.config.units.positionFormat"
        ></div>
      </div>
      <div style="display:flex;">
        <div style="font-weight:bold;">Last Position:</div>
        <div style="flex: 1 1 auto;text-align:right;">
          {{ positionTimestamp }}
        </div>
      </div>
      @if (!isSelf) {
        @if (vessel.distanceToSelf) {
          <div style="display:flex;">
            <div style="font-weight:bold;">Range:</div>
            <div style="flex: 1 1 auto;text-align:right;">
              {{ distToSelf }}
            </div>
          </div>
        }
        @if (vessel.closestApproach) {
          <div style="display:flex;">
            <div style="font-weight:bold;">CPA:</div>
            <div style="flex: 1 1 auto;text-align:right;">
              {{ cpa ?? '--' }}
            </div>
          </div>
          <div style="display:flex;">
            <div style="font-weight:bold;">TCPA:</div>
            <div style="flex: 1 1 auto;text-align:right;">
              {{ tcpa ?? '--' }}
            </div>
          </div>
        }
      }
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
          @if (isActive) {
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

            @if (!isSelf && app.featureFlags().buddyList) {
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
          }
          @if (isActive && !isSelf) {
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

  protected _title: string;
  protected convert = Convert;
  protected timeLastUpdate: string;
  protected timeAgo: string; // last update in minutes ago
  protected speedUnits: string;
  protected distToSelf: string;
  protected cpa: string;
  protected tcpa: string;

  protected position: Position = [0, 0];
  protected positionTimestamp = '';
  protected isFlagged = false;

  protected app = inject(AppFacade);
  protected buddies = inject(Buddies);

  constructor() {}

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
        this.title ??
        this.vessel.name ??
        this.vessel.mmsi ??
        this.vessel.callsignVhf ??
        this.vessel.callsignHf;
      ('Vessel:');
      this.position = [
        changes.vessel.currentValue.position[0],
        changes.vessel.currentValue.position[1]
      ];
      this.position = GeoUtils.normaliseCoords(this.position);
      if (this.vessel.positionTimestamp) {
        const pts = new Date(this.vessel.positionTimestamp);
        this.positionTimestamp = `${pts.getHours()}:${(
          '00' + pts.getMinutes()
        ).slice(-2)}`;
      }
    }
    this.timeLastUpdate = `${this.vessel.lastUpdated.getHours()}:${(
      '00' + this.vessel.lastUpdated.getMinutes()
    ).slice(-2)}`;
    const td =
      (new Date().valueOf() - this.vessel.lastUpdated.valueOf()) / 1000;
    this.timeAgo = td < 60 ? '' : `(${Math.floor(td / 60)} min ago)`;
    this.distToSelf = this.app.formatValueForDisplay(
      this.vessel.distanceToSelf,
      'm'
    );
    if (this.vessel.closestApproach) {
      this.cpa = this.app.formatValueForDisplay(
        this.vessel.closestApproach.distance,
        'm'
      );
      this.tcpa = this.app.formatValueForDisplay(
        this.vessel.closestApproach.timeTo,
        'sec'
      );
    }
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
          this.app.showMessage(`Buddy successfully removed.`, false, 3000);
        },
        (err: HttpErrorResponse) => {
          this.app.showMessage(`Error removing buddy!`, false, 3000);
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
          this.app.showMessage(`Buddy added (${name})`, false, 3000);
        },
        (err: HttpErrorResponse) => {
          this.app.showMessage(`Error adding buddy!(${name})`, false, 5000);
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
