import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  effect
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CoordsPipe } from 'src/app/lib/pipes';
import { PopoverComponent } from './popover.component';
import { AppFacade } from 'src/app/app.facade';
import { Position } from 'src/app/types';
import { AlertData } from '../../alarms';

@Component({
  selector: 'alarm-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    CoordsPipe,
    PopoverComponent
  ],
  template: `
    @if (alarm(); as a) {
      <ap-popover
        [title]="_title"
        [canClose]="canClose()"
        [icon]="a.icon"
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
            {{ a.message }}
          </div>
        </div>
        <div style="display:flex;">
          <div style="font-weight:bold;">Type:</div>
          <div style="flex: 1 1 auto;text-align:right;">{{ a.type }}</div>
        </div>
        @if (a.properties.position; as pos) {
          <div style="display:flex;">
            <div style="font-weight:bold;">Latitude:</div>
            <div
              style="flex: 1 1 auto;text-align:right;"
              [innerText]="
                pos.latitude | coords: app.config.units.positionFormat : true
              "
            ></div>
          </div>
          <div style="display:flex;">
            <div style="font-weight:bold;">Longitude:</div>
            <div
              style="flex: 1 1 auto;text-align:right;"
              [innerText]="
                pos.longitude | coords: app.config.units.positionFormat : false
              "
            ></div>
          </div>
        }
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
    }
  `,
  styleUrls: []
})
export class AlarmPopoverComponent {
  title = input<string>();
  id = input<string | null>();
  alarm = input<AlertData>();
  canClose = input<boolean>();
  info = output<string>();
  goto = output<Position>();
  closed = output<void>();
  _title?: string;

  protected app = inject(AppFacade);

  constructor() {
    effect(() => {
      this.id();
      if (!this.alarm()) {
        this.handleClose();
        return;
      }
    });
  }

  ngOnInit() {
    if (!this.alarm()) {
      this.handleClose();
    } else {
      this._title = this.title() || 'Alarm:';
    }
  }

  handleInfo() {
    const alarm = this.alarm();
    if (!alarm) {
      return;
    }
    this.info.emit(alarm.path);
  }

  handleGoto() {
    const position = this.alarm()?.properties?.position;
    if (!position) {
      return;
    }
    this.goto.emit([position.longitude, position.latitude]);
  }
  handleClose() {
    this.closed.emit();
  }
}
