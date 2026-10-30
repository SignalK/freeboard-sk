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
import { NorthUpCompassComponent } from './compass.component';
import { SKAtoN, SKMeteo, SKSensorTarget } from 'src/app/modules';
import { AppFacade } from 'src/app/app.facade';
import { Convert } from 'src/app/lib/convert';
import { AppIconDef } from '../../icons';
import { radarTargetRef } from '../../radar/radar-targets';

@Component({
  selector: 'aton-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    CoordsPipe,
    PopoverComponent,
    NorthUpCompassComponent
  ],
  template: `
    @if (aton(); as a) {
      <ap-popover
        [title]="_title"
        [canClose]="canClose()"
        [icon]="_icon"
        (closed)="handleClose()"
      >
        <div style="display:flex;">
          <div style="font-weight:bold;">Type:</div>
          <div style="flex: 1 1 auto;text-align:right;">
            {{ a.type?.name }}
          </div>
        </div>
        @if (a.position; as pos) {
          <div style="display:flex;">
            <div style="font-weight:bold;">Latitude:</div>
            <div
              style="flex: 1 1 auto;text-align:right;"
              [innerText]="
                pos[1] | coords: app.config.units.positionFormat : true
              "
            ></div>
          </div>
          <div style="display:flex;">
            <div style="font-weight:bold;">Longitude:</div>
            <div
              style="flex: 1 1 auto;text-align:right;"
              [innerText]="pos[0] | coords: app.config.units.positionFormat"
            ></div>
          </div>
        }
        <div style="display:flex;">
          <div style="font-weight:bold;">Last Update:</div>
          <div style="flex: 1 1 auto;text-align:right;">
            {{ timeLastUpdate }} {{ timeAgo }}
          </div>
        </div>
        @if (isTarget && a.sog !== undefined) {
          <div style="display:flex;">
            <div style="font-weight:bold;">SOG:</div>
            <div style="flex: 1 1 auto;text-align:right;">
              {{
                app.formatValueForDisplay(a.sog, 'm/s', {
                  path: 'navigation.speedOverGround'
                })
              }}
            </div>
          </div>
        }
        @if (isTarget && a.cog !== undefined) {
          <div style="display:flex;">
            <div style="font-weight:bold;">COG:</div>
            <div style="flex: 1 1 auto;text-align:right;">
              {{
                app.formatValueForDisplay(a.cog, 'rad', {
                  path: 'navigation.courseOverGroundTrue'
                })
              }}
            </div>
          </div>
        }
        @if (isMeteo && a.temperature !== undefined) {
          <div style="display:flex;">
            <div style="font-weight:bold;">Temperature:</div>
            <div style="flex: 1 1 auto;text-align:right;">
              {{ this.app.formatValueForDisplay(a.temperature, 'K') }}
            </div>
          </div>
        }
        @if (isMeteo && a.tws !== undefined && a.twd !== undefined) {
          <div style="display:flex;flex-wrap:no-wrap;">
            <div style="font-weight:bold;">Wind:</div>
            <div style="width:150px;">
              <ap-compass-northup
                [heading]="convert.radiansToDegrees(a.twd)"
                [speed]="app.formatSpeed(a.tws)"
                [label]="app.formattedSpeedUnits"
                [windtrue]="true"
              >
              </ap-compass-northup>
            </div>
          </div>
        }
        <div style="display:flex;">
          <div style="flex:1 1 auto;">&nbsp;</div>
          @if (isRadarTarget) {
            <div class="popover-action-button">
              <button
                mat-button
                (click)="untrack.emit()"
                matTooltip="Stop the radar tracking this target"
              >
                <mat-icon>cancel</mat-icon>
                STOP TRACKING
              </button>
            </div>
          }
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
        <!-- extension actions for this feature (plotterext actions) -->
        <ng-content></ng-content>
      </ap-popover>
    }
  `,
  styleUrls: []
})
export class AtoNPopoverComponent {
  title = input<string>();
  /**
   * An AtoN; a meteo station, which adds wind and temperature; or a radar or
   * camera target, which adds speed and course. All reach the map keyed by
   * their id, so one shown here always has an id.
   */
  aton = input<
    SKAtoN &
      Partial<Pick<SKMeteo, 'twd' | 'tws' | 'temperature'>> &
      Partial<Pick<SKSensorTarget, 'sog' | 'cog'>>
  >();
  canClose = input<boolean>();
  info = output<string>();
  /** The user asked the radar to stop tracking this radar target. */
  untrack = output<void>();
  closed = output<void>();
  _title?: string;
  _icon?: AppIconDef;
  timeLastUpdate?: string;
  timeAgo?: string; // last update in minutes ago
  protected convert = Convert;
  isMeteo?: boolean;
  isTarget?: boolean;
  isRadarTarget?: boolean;

  protected app = inject(AppFacade);

  constructor() {
    effect(() => {
      const aton = this.aton();
      if (!aton) {
        this.handleClose();
        return;
      }
      this._title = this.title() || aton.name || aton.mmsi || 'AtoN:';
      this.setKind(aton.id!);
      this.timeLastUpdate = `${aton.lastUpdated.getHours()}:${(
        '00' + aton.lastUpdated.getMinutes()
      ).slice(-2)}`;
      const td = (new Date().valueOf() - aton.lastUpdated.valueOf()) / 1000;
      this.timeAgo = td < 60 ? '' : `(${Math.floor(td / 60)} min ago)`;
    });
  }

  ngOnInit() {
    const aton = this.aton();
    if (!aton) {
      this.handleClose();
    } else {
      this.setKind(aton.id!);
    }
  }

  private setKind(id: string) {
    this.isMeteo = id.includes('meteo');
    this.isTarget = id.startsWith('targets.');
    this.isRadarTarget = radarTargetRef(id) !== null;
    this._icon = {
      name: this.isMeteo ? 'air' : this.isTarget ? 'radar' : 'beenhere',
      svgIcon: undefined
    };
  }

  handleInfo() {
    const aton = this.aton();
    if (!aton) {
      return;
    }
    this.info.emit(aton.id!);
  }
  handleClose() {
    this.closed.emit();
  }
}
