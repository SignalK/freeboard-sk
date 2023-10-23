/** popover Component **
 ************************/

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy
} from '@angular/core';
import { AppInfo } from 'src/app/app.info';
import { SKAtoN, SKAircraft } from 'src/app/modules';
import { SKNotification } from 'src/app/types';

/*********** Popover ***************
title: string -  title text,
canClose: boolean - show close button
measure: boolean= measure mode;
***********************************/
@Component({
  selector: 'ap-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="popover top in mat-app-background"
      [ngClass]="{ measure: measure }"
    >
      <div class="popover-title">
        <div style="flex: 1 1 auto;overflow-x: auto;">{{ title }}</div>
        <div style="">
          <button mat-icon-button *ngIf="canClose" (click)="handleClose()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>
      <div class="popover-content">
        <ng-content></ng-content>
      </div>
      <div class="arrow" style="left:50%;" *ngIf="!measure"></div>
    </div>
  `,
  styleUrls: ['./popover.component.scss']
})
export class PopoverComponent {
  @Input() title: string;
  @Input() canClose = true;
  @Input() measure = false;
  @Output() closed: EventEmitter<void> = new EventEmitter();
  //constructor() {}

  handleClose() {
    this.closed.emit();
  }
}

/*********** feature List Popover ***************
title: string -  title text,
features: Array<any> - list of features
*************************************************/
@Component({
  selector: 'feature-list-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ap-popover [title]="title" [canClose]="canClose" (closed)="handleClose()">
      <mat-nav-list>
        <mat-list-item *ngFor="let f of features">
          <a matLine href="#" (click)="handleSelect(f)">
            <mat-icon
              [color]="f.text && f.text.indexOf('self') != -1 ? 'warn' : ''"
            >
              {{ f.icon }}
            </mat-icon>
            {{ f.text }}
          </a>
        </mat-list-item>
      </mat-nav-list>
    </ap-popover>
  `,
  styleUrls: []
})
export class FeatureListPopoverComponent {
  @Input() title: string;
  @Input() features: Array<{ text: string; icon: string }> = [];
  @Input() canClose: boolean;
  @Output() closed: EventEmitter<void> = new EventEmitter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Output() selected: EventEmitter<any> = new EventEmitter();

  //constructor() {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleSelect(item: any) {
    this.selected.emit(item);
  }

  handleClose() {
    this.closed.emit();
  }
}

/*********** Alarm Popover ***************
title: string -  title text,
aton: SKNotification - alarm data
*************************************************/
@Component({
  selector: 'alarm-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ap-popover [title]="_title" [canClose]="canClose" (closed)="handleClose()">
      <div style="display:flex;">
        <div style="font-weight:bold;">Message:</div>
        <div style="flex: 1 1 auto;text-align:right;">{{ alarm.message }}</div>
      </div>

      <div style="display:flex;">
        <div style="font-weight:bold;">Type:</div>
        <div style="flex: 1 1 auto;text-align:right;">{{ id }}</div>
      </div>

      <div style="display:flex;">
        <div style="font-weight:bold;">Latitude:</div>
        <div
          style="flex: 1 1 auto;text-align:right;"
          [innerText]="
            alarm.data.position.latitude
              | coords : app.config.selections.positionFormat : true
          "
        ></div>
      </div>
      <div style="display:flex;">
        <div style="font-weight:bold;">Longitude:</div>
        <div
          style="flex: 1 1 auto;text-align:right;"
          [innerText]="
            alarm.data.position.longitude
              | coords : app.config.selections.positionFormat : true
          "
        ></div>
      </div>

      <div style="display:flex;">
        <div style="flex:1 1 auto;">&nbsp;</div>
        <div class="popover-action-button">
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
export class AlarmPopoverComponent {
  @Input() title: string;
  @Input() id: string;
  @Input() alarm: SKNotification & { id: string };
  @Input() canClose: boolean;
  @Output() info: EventEmitter<string> = new EventEmitter();
  @Output() closed: EventEmitter<void> = new EventEmitter();

  _title: string;

  constructor(public app: AppInfo) {}

  ngOnInit() {
    if (!this.alarm) {
      this.handleClose();
    } else {
      this._title = this.title || 'Alarm:';
    }
  }

  ngOnChanges() {
    if (!this.alarm) {
      this.handleClose();
      return;
    }
  }

  handleInfo() {
    this.info.emit(this.alarm.id);
  }

  handleClose() {
    this.closed.emit();
  }
}

/*********** AtoN Popover ***************
title: string -  title text,
aton: SKAtoN - aton data
*************************************************/
@Component({
  selector: 'aton-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ap-popover [title]="_title" [canClose]="canClose" (closed)="handleClose()">
      <div style="display:flex;">
        <div style="font-weight:bold;">Type:</div>
        <div style="flex: 1 1 auto;text-align:right;">{{ aton.type.name }}</div>
      </div>

      <div style="display:flex;">
        <div style="font-weight:bold;">Latitude:</div>
        <div
          style="flex: 1 1 auto;text-align:right;"
          [innerText]="
            aton.position[1]
              | coords : app.config.selections.positionFormat : true
          "
        ></div>
      </div>
      <div style="display:flex;">
        <div style="font-weight:bold;">Longitude:</div>
        <div
          style="flex: 1 1 auto;text-align:right;"
          [innerText]="
            aton.position[0] | coords : app.config.selections.positionFormat
          "
        ></div>
      </div>

      <div style="display:flex;">
        <div style="font-weight:bold;">Last Update:</div>
        <div style="flex: 1 1 auto;text-align:right;">
          {{ timeLastUpdate }} {{ timeAgo }}
        </div>
      </div>
      <div style="display:flex;">
        <div style="flex:1 1 auto;">&nbsp;</div>
        <div class="popover-action-button">
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
export class AtoNPopoverComponent {
  @Input() title: string;
  @Input() aton: SKAtoN;
  @Input() canClose: boolean;
  @Output() info: EventEmitter<string> = new EventEmitter();
  @Output() closed: EventEmitter<void> = new EventEmitter();

  _title: string;
  timeLastUpdate: string;
  timeAgo: string; // last update in minutes ago

  constructor(public app: AppInfo) {}

  ngOnInit() {
    if (!this.aton) {
      this.handleClose();
    } else {
      this._title = this.title || this.aton.name || this.aton.mmsi || 'AtoN:';
    }
  }

  ngOnChanges() {
    if (!this.aton) {
      this.handleClose();
      return;
    }
    this.timeLastUpdate = `${this.aton.lastUpdated.getHours()}:${(
      '00' + this.aton.lastUpdated.getMinutes()
    ).slice(-2)}`;
    const td = (new Date().valueOf() - this.aton.lastUpdated.valueOf()) / 1000;
    this.timeAgo = td < 60 ? '' : `(${Math.floor(td / 60)} min ago)`;
  }

  handleInfo() {
    this.info.emit(this.aton.id);
  }

  handleClose() {
    this.closed.emit();
  }
}

/*********** Aircraft Popover ***************
title: string -  title text,
aircraft: SKAircraft - aircraft data
*************************************************/
@Component({
  selector: 'aircraft-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ap-popover [title]="_title" [canClose]="canClose" (closed)="handleClose()">
      <div style="display:flex;">
        <div style="font-weight:bold;">Name:</div>
        <div style="flex: 1 1 auto;text-align:right;">{{ aircraft.name }}</div>
      </div>

      <div style="display:flex;">
        <div style="font-weight:bold;">Call sign:</div>
        <div style="flex: 1 1 auto;text-align:right;">
          {{ aircraft.callsign }}
        </div>
      </div>

      <div style="display:flex;">
        <div style="font-weight:bold;">Latitude:</div>
        <div
          style="flex: 1 1 auto;text-align:right;"
          [innerText]="
            aircraft.position[1]
              | coords : app.config.selections.positionFormat : true
          "
        ></div>
      </div>
      <div style="display:flex;">
        <div style="font-weight:bold;">Longitude:</div>
        <div
          style="flex: 1 1 auto;text-align:right;"
          [innerText]="
            aircraft.position[0] | coords : app.config.selections.positionFormat
          "
        ></div>
      </div>

      <div style="display:flex;">
        <div style="font-weight:bold;">Last Update:</div>
        <div style="flex: 1 1 auto;text-align:right;">
          {{ timeLastUpdate }} {{ timeAgo }}
        </div>
      </div>
      <div style="display:flex;">
        <div style="flex:1 1 auto;">&nbsp;</div>
        <div class="popover-action-button">
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
export class AircraftPopoverComponent {
  @Input() title: string;
  @Input() aircraft: SKAircraft;
  @Input() canClose: boolean;
  @Output() info: EventEmitter<string> = new EventEmitter();
  @Output() closed: EventEmitter<void> = new EventEmitter();

  _title: string;
  timeLastUpdate: string;
  timeAgo: string; // last update in minutes ago

  constructor(public app: AppInfo) {}

  ngOnInit() {
    if (!this.aircraft) {
      this.handleClose();
    } else {
      this._title =
        this.title || this.aircraft.name || this.aircraft.mmsi || 'Aircraft:';
    }
  }

  ngOnChanges() {
    if (!this.aircraft) {
      this.handleClose();
      return;
    }
    this.timeLastUpdate = `${this.aircraft.lastUpdated.getHours()}:${(
      '00' + this.aircraft.lastUpdated.getMinutes()
    ).slice(-2)}`;
    const td =
      (new Date().valueOf() - this.aircraft.lastUpdated.valueOf()) / 1000;
    this.timeAgo = td < 60 ? '' : `(${Math.floor(td / 60)} min ago)`;
  }

  handleInfo() {
    this.info.emit(this.aircraft.id);
  }

  handleClose() {
    this.closed.emit();
  }
}
