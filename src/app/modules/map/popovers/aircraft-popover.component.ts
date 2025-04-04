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
import { SKAircraft } from 'src/app/modules';
/*********** Aircraft Popover ***************
  title: string -  title text,
  aircraft: SKAircraft - aircraft data
  *************************************************/
@Component({
  selector: 'aircraft-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
        <div style="font-weight:bold;">Name:</div>
        <div style="flex: 1 1 auto;text-align:right;">{{ aircraft.name }}</div>
      </div>
      <div style="display:flex;">
        <div style="font-weight:bold;">Call sign VHF:</div>
        <div style="flex: 1 1 auto;text-align:right;">
          {{ aircraft.callsignVhf }}
        </div>
      </div>
      <div style="display:flex;">
        <div style="font-weight:bold;">Call sign HF:</div>
        <div style="flex: 1 1 auto;text-align:right;">
          {{ aircraft.callsignHf }}
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
            <mat-icon>info_outline</mat-icon>
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
  constructor(public app: AppFacade) {}
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
