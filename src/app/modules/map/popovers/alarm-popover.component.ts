import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PipesModule } from 'src/app/lib/pipes';
import { PopoverComponent } from './popover.component';

import { AppInfo } from 'src/app/app.info';
import { SKNotification } from 'src/app/types';

/*********** Alarm Popover ***************
title: string -  title text,
aton: SKNotification - alarm data
*************************************************/
@Component({
  selector: 'alarm-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    PipesModule,
    PopoverComponent
  ],
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
