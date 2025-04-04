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
import { NorthUpCompassComponent } from './compass.component';
import { SKMeteo } from 'src/app/modules';
import { AppFacade } from 'src/app/app.facade';
import { Convert } from 'src/app/lib/convert';
/*********** AtoN Popover ***************
  title: string -  title text,
  aton: SKAtoN - aton data
  *************************************************/
@Component({
  selector: 'aton-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    PipesModule,
    PopoverComponent,
    NorthUpCompassComponent
  ],
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
      @if(isMeteo && aton.temperature !== undefined) {
      <div style="display:flex;">
        <div style="font-weight:bold;">Temperature:</div>
        <div style="flex: 1 1 auto;text-align:right;">
          {{ this.app.formatValueForDisplay(aton.temperature, 'K') }}
        </div>
      </div>
      } @if(isMeteo && aton.tws !== undefined && aton.twd !== undefined) {
      <div style="display:flex;flex-wrap:no-wrap;">
        <div style="font-weight:bold;">Wind:</div>
        <div style="width:150px;">
          <ap-compass-northup
            [heading]="convert.radiansToDegrees(aton.twd)"
            [speed]="app.formatSpeed(aton.tws)"
            [label]="app.formattedSpeedUnits"
            [windtrue]="true"
          >
          </ap-compass-northup>
        </div>
      </div>
      }
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
export class AtoNPopoverComponent {
  @Input() title: string;
  @Input() aton: SKMeteo;
  @Input() canClose: boolean;
  @Output() info: EventEmitter<string> = new EventEmitter();
  @Output() closed: EventEmitter<void> = new EventEmitter();
  _title: string;
  timeLastUpdate: string;
  timeAgo: string; // last update in minutes ago
  protected convert = Convert;
  isMeteo: boolean;
  constructor(public app: AppFacade) {}
  ngOnInit() {
    if (!this.aton) {
      this.handleClose();
    } else {
      this.isMeteo = this.aton.id.includes('meteo');
    }
  }
  ngOnChanges() {
    if (!this.aton) {
      this.handleClose();
      return;
    }
    this._title = this.title || this.aton.name || this.aton.mmsi || 'AtoN:';
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
