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
import { AppFacade } from 'src/app/app.facade';
import { Position } from 'src/app/types';
import { AlertData } from '../../alarms';
/*********** Alarm Popover ***************
  title: string -  title text,
  alarm: AlertData - alarm data
  *************************************************/
@Component({
  selector: 'alarm-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    PipesModule,
    PopoverComponent
  ],
  template: `
    <ap-popover
      [title]="_title"
      [canClose]="canClose"
      [icon]="alarm.icon"
      (closed)="handleClose()"
    >
      <div style="display:flex;">
        <div style="font-weight:bold;">Message:</div>
        <div
          style="flex: 1 1 auto;
                    text-align:left;
                    padding-left: 5px;
                    overflow: hidden;
                    display: -webkit-box;
                    -webkit-box-orient: vertical;
                    -webkit-line-clamp: 2;
                    line-clamp: 2;
                    text-overflow:ellipsis;"
        >
          {{ alarm.message }}
        </div>
      </div>
      <div style="display:flex;">
        <div style="font-weight:bold;">Type:</div>
        <div style="flex: 1 1 auto;text-align:right;">{{ alarm.type }}</div>
      </div>
      <div style="display:flex;">
        <div style="font-weight:bold;">Latitude:</div>
        <div
          style="flex: 1 1 auto;text-align:right;"
          [innerText]="
            alarm.properties.position.latitude
              | coords : app.config.selections.positionFormat : true
          "
        ></div>
      </div>
      <div style="display:flex;">
        <div style="font-weight:bold;">Longitude:</div>
        <div
          style="flex: 1 1 auto;text-align:right;"
          [innerText]="
            alarm.properties.position.longitude
              | coords : app.config.selections.positionFormat : false
          "
        ></div>
      </div>
      <div style="display:flex;">
        <div style="flex:1 1 auto;">&nbsp;</div>
        <div class="popover-action-button">
          <button
            mat-button
            (click)="handleGoto()"
            matTooltip="Navigate to here"
          >
            <mat-icon>near_me</mat-icon>
            GO TO
          </button>
        </div>
        <div class="popover-action-button">
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
export class AlarmPopoverComponent {
  @Input() title: string;
  @Input() id: string;
  @Input() alarm: AlertData;
  @Input() canClose: boolean;
  @Output() info: EventEmitter<string> = new EventEmitter();
  @Output() goto: EventEmitter<Position> = new EventEmitter();
  @Output() closed: EventEmitter<void> = new EventEmitter();
  _title: string;
  constructor(public app: AppFacade) {}
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
    this.info.emit(this.alarm.path);
  }
  handleGoto() {
    this.goto.emit([
      this.alarm.properties.position.longitude,
      this.alarm.properties.position.latitude
    ]);
  }
  handleClose() {
    this.closed.emit();
  }
}
