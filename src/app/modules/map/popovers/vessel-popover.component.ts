import {
  Component,
  ChangeDetectionStrategy,
  inject,
  output,
  input,
  effect,
  DestroyRef
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDivider } from '@angular/material/divider';
import { CoordsPipe } from 'src/app/lib/pipes';
import { PopoverComponent } from './popover.component';
import { CompassComponent } from './compass.component';

import { AppFacade } from 'src/app/app.facade';
import { Buddies, SKVessel } from 'src/app/modules';
import { Convert } from 'src/app/lib/convert';
import { GeoUtils } from 'src/app/lib/geoutils';
import { Position } from 'src/app/types';
import { AppIconDef, getAisIcon } from '../../icons';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TrackHistoryService } from 'src/app/modules/skstream/track-history.service';
import { AIS_TRACK_MIN_ZOOM } from 'src/app/modules/skstream/track-source';
import { GPXExportService } from 'src/app/modules/gpx/gpx-export.service';
import {
  aisTrackDisplayed,
  TrackExportChoice,
  vesselExportOffer
} from 'src/app/modules/gpx/track-export';

@Component({
  selector: 'vessel-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    MatDivider,
    CoordsPipe,
    PopoverComponent,
    CompassComponent
  ],
  template: `
    @if (vessel(); as v) {
      <ap-popover
        [title]="_title"
        [mmsi]="v.mmsi"
        [icon]="_icon"
        [canClose]="canClose()"
        (closed)="handleClose()"
      >
        <div style="display:flex;">
          <div style="flex:1 1 auto;">
            @if (isActive()) {
              <button
                mat-icon-button
                (click)="handleMarkPosition()"
                matTooltip="Add Waypoint at vessel location"
              >
                <mat-icon>add_location</mat-icon>
              </button>
            } @else {
              <button
                mat-icon-button
                (click)="toggleFlag()"
                [matTooltip]="isFlagged ? 'Un-flag vessel' : 'Flag vessel'"
              >
                <mat-icon>{{ isFlagged ? 'clear_all' : 'flag' }}</mat-icon>
              </button>

              @if (!isSelf() && app.featureFlags().buddyList) {
                <button
                  mat-icon-button
                  (click)="toggleBuddy()"
                  matTooltip="Is Buddy"
                >
                  <mat-icon>{{
                    v.buddy ? 'group_remove' : 'group_add'
                  }}</mat-icon>
                </button>
              }
              <button
                mat-icon-button
                (click)="focusVessel(true)"
                matTooltip="Focus vessel"
              >
                <mat-icon>center_focus_weak</mat-icon>
              </button>
            }
            @if (isActive() && !isSelf()) {
              <button
                mat-icon-button
                (click)="focusVessel(false)"
                matTooltip="Clear vessel focus"
              >
                <mat-icon>clear_all</mat-icon>
              </button>
            }
            @if (!isSelf()) {
              @let trackShown = app.isVesselTrackShown(vesselId());
              <span
                [matTooltip]="
                  app.config.vessels.aisShowTrack
                    ? 'Turn off &quot;Show all tracks&quot; to enable'
                    : trackShown
                      ? 'Hide vessel track'
                      : 'Show vessel track'
                "
              >
                <button
                  mat-icon-button
                  (click)="toggleTrack()"
                  [disabled]="app.config.vessels.aisShowTrack"
                >
                  <mat-icon>{{
                    trackShown ? 'layers_clear' : 'route'
                  }}</mat-icon>
                </button>
              </span>
            }
            @if (trackHistory.available()) {
              @let historyCtx = historyContext();
              @let historyShown = trackHistory.isShown(historyCtx);
              @let noHistory = trackHistory.hasHistory(historyCtx) === false;
              <span
                [matTooltip]="
                  historyShown
                    ? 'Hide track history'
                    : noHistory
                      ? 'No recorded track history'
                      : 'Show track history'
                "
              >
                <button
                  mat-icon-button
                  (click)="toggleHistory(historyCtx)"
                  [disabled]="noHistory && !historyShown"
                >
                  <mat-icon>{{
                    historyShown ? 'history_toggle_off' : 'history'
                  }}</mat-icon>
                </button>
              </span>
            }
            @let exportOffer = trackExportOffer();
            @if (exportOffer) {
              <button
                mat-icon-button
                (click)="exportTrack(exportOffer)"
                [matTooltip]="
                  isSelf() || !gpxExport.tailOnly(vesselId())
                    ? 'Export track to GPX'
                    : 'Export track to GPX (only the positions gathered while Freeboard was open)'
                "
              >
                <mat-icon>download</mat-icon>
              </button>
            }
          </div>
          <div style="text-align:right;">
            <button
              mat-icon-button
              (click)="handleInfo()"
              matTooltip="Show Properties"
            >
              <mat-icon>info_outline</mat-icon>
            </button>
          </div>
        </div>
        <mat-divider></mat-divider>
        @if (v.callsignVhf) {
          <div style="display:flex;">
            <div style="font-weight:bold;">Callsign (VHF):</div>
            <div
              style="flex: 1 1 auto;text-align:right;"
              [innerText]="v.callsignVhf"
            ></div>
          </div>
        } @else if (v.callsignHf) {
          <div style="display:flex;">
            <div style="font-weight:bold;">Callsign (HF):</div>
            <div
              style="flex: 1 1 auto;text-align:right;"
              [innerText]="v.callsignHf"
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
        @if (!isSelf()) {
          @if (v.distanceToSelf) {
            <div style="display:flex;">
              <div style="font-weight:bold;">Range:</div>
              <div style="flex: 1 1 auto;text-align:right;">
                {{ distToSelf }}
              </div>
            </div>
          }
          @if (v.closestApproach) {
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
          <div style="width:120px;">
            <ap-compass
              [heading]="convert.radiansToDegrees(v.orientation)"
              [windtrue]="
                v.wind.direction !== null
                  ? convert.radiansToDegrees(v.wind.direction)
                  : null
              "
              [windapparent]="
                v.wind.awa !== null
                  ? convert.radiansToDegrees(v.wind.awa)
                  : null
              "
              [speed]="app.formatSpeed(v.sog)"
              [speedunits]="app.formattedSpeedUnits"
            >
            </ap-compass>
          </div>
          <div style="text-align:right; flex:auto;">
            &nbsp;<br />
            <div>
              <div style="border-right:olive 10px solid;padding-left: 5px;">
                <span style="font-weight:bold">
                  Wind ({{ useMagnetic() ? 'M' : 'T' }}):</span
                >
              </div>
              <div style="flex: 1 1 auto;text-align:right;">
                {{ windSpeed(v.wind.tws, app.twsDisplayUnitPath()) }}
              </div>
            </div>
            <div>
              <div
                style="border-right:rgb(16, 75, 16) 10px solid;;padding-left: 5px;"
              >
                <span style="font-weight:bold;"> Wind (A):</span>
              </div>
              <div style="flex: 1 1 auto;text-align:right;">
                {{ windSpeed(v.wind.aws, 'environment.wind.speedApparent') }}
              </div>
            </div>
          </div>
        </div>
        <!-- extension actions for this feature (plotterext actions) -->
        <ng-content></ng-content>
      </ap-popover>
    }
  `,
  styleUrls: []
})
export class VesselPopoverComponent {
  title = input<string>();
  /** The template renders only once a vessel is bound, so the methods it
   * calls may assert it. */
  vessel = input<SKVessel>();
  useMagnetic = input<boolean>();
  isActive = input<boolean>();
  isSelf = input<boolean>();
  canClose = input<boolean>();
  info = output<string>();
  closed = output<void>();
  focused = output<boolean>();
  markPosition = output<Position>();

  protected _title?: string;
  protected _icon?: AppIconDef;
  protected convert = Convert;
  protected timeLastUpdate?: string;
  protected timeAgo?: string; // last update in minutes ago
  protected speedUnits?: string;
  protected distToSelf?: string;
  protected cpa?: string;
  protected tcpa?: string;

  protected position: Position = [0, 0];
  protected positionTimestamp = '';
  protected isFlagged = false;

  protected app = inject(AppFacade);
  protected buddies = inject(Buddies);
  protected trackHistory = inject(TrackHistoryService);
  protected gpxExport = inject(GPXExportService);
  private destroyRef = inject(DestroyRef);

  /** Vessels reach the map keyed by their id, so one shown here has an id. */
  protected vesselId(): string {
    return this.vessel()!.id!;
  }

  /** The Track API context: the own vessel is asked for as `self`. */
  protected historyContext(): string {
    return this.isSelf() ? 'self' : this.vesselId();
  }

  /**
   * Format a wind speed (m/s) for display, honoring the per-path unit override
   * for `path` so wind speed can use a different unit than boat speed (#304).
   * Returns '--' when the value is unavailable.
   */
  protected windSpeed(value: number | null, path: string): string {
    return value !== null && Number.isFinite(value)
      ? this.app.formatValueForDisplay(value, 'm/s', { path })
      : '--';
  }

  constructor() {
    this.trackHistory.refreshRecorded();
    effect(() => {
      const vessel = this.vessel();
      if (!vessel) {
        this.handleClose();
        return;
      }
      this.isFlagged = this.app.data.vessels.flagged.includes(this.vesselId());
      this._title =
        this.title() ??
        vessel.name ??
        vessel.mmsi ??
        vessel.callsignVhf ??
        vessel.callsignHf ??
        'Vessel:';
      this._icon = vessel.type?.id
        ? getAisIcon(vessel.type?.id)
        : {
            name: 'directions_boat',
            svgIcon: undefined
          };
      if (vessel.position) {
        this.position = [vessel.position[0], vessel.position[1]];
        this.position = GeoUtils.normaliseCoords(this.position);
      }
      if (vessel.positionTimestamp) {
        const pts = new Date(vessel.positionTimestamp);
        this.positionTimestamp = `${pts.getHours()}:${(
          '00' + pts.getMinutes()
        ).slice(-2)}`;
      }

      this.timeLastUpdate = `${vessel.lastUpdated.getHours()}:${(
        '00' + vessel.lastUpdated.getMinutes()
      ).slice(-2)}`;
      const td = (new Date().valueOf() - vessel.lastUpdated.valueOf()) / 1000;
      this.timeAgo = td < 60 ? '' : `(${Math.floor(td / 60)} min ago)`;
      this.distToSelf = this.app.formatValueForDisplay(
        // formatValueForDisplay() renders a missing value itself
        vessel.distanceToSelf as number,
        'm'
      );
      // The popover stays open as its vessel updates or changes, so a value
      // that is no longer reported must not keep showing the last one.
      this.cpa = undefined;
      this.tcpa = undefined;
      const closestApproach = vessel.closestApproach;
      if (closestApproach) {
        if (typeof closestApproach.distance === 'number') {
          this.cpa = this.app.formatValueForDisplay(
            closestApproach.distance,
            'm'
          );
        }
        if (typeof closestApproach.timeTo === 'number') {
          this.tcpa = this.app.formatValueForDisplay(
            closestApproach.timeTo,
            's'
          );
        }
      }
    });
  }

  ngOnInit() {
    const vessel = this.vessel();
    if (!vessel) {
      this.handleClose();
      return;
    }
    this.isFlagged = this.app.data.vessels.flagged.includes(this.vesselId());
  }

  handleMarkPosition() {
    const position = this.vessel()!.position;
    if (!position) {
      return;
    }
    this.markPosition.emit(position);
  }

  handleInfo() {
    this.info.emit(this.vesselId());
  }

  focusVessel(setFocus: boolean) {
    this.removeFlag();
    this.focused.emit(setFocus);
  }

  toggleBuddy() {
    const urn = this.vesselId().split('.').slice(1).join('.');
    if (this.vessel()!.buddy) {
      this.buddies
        .remove(urn)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(
          () => {
            //console.log('buddy revedmo:', urn);
            this.app.showMessage(`Buddy successfully removed.`, false, 3000);
          },
          () => {
            this.app.showMessage(`Error removing buddy!`, false, 3000);
          }
        );
    } else {
      const name =
        this.vessel()!.name ??
        this.vessel()!.mmsi ??
        this.vessel()!.callsignVhf ??
        urn.slice(-5);
      this.buddies
        .add(urn, name)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(
          () => {
            this.app.showMessage(`Buddy added (${name})`, false, 3000);
          },
          () => {
            this.app.showMessage(`Error adding buddy!(${name})`, false, 5000);
          }
        );
    }
  }

  toggleTrack() {
    this.app.toggleVesselTrack(this.vesselId());
  }

  /** A vessel's track can be exported while it is displayed, as its track
   * (the own vessel's trail) or as its Track history; null when neither is
   * shown. */
  protected trackExportOffer(): TrackExportChoice | null {
    if (this.isSelf()) {
      // the trail as exported: the server trail and the local trail joined
      return vesselExportOffer({
        trackDisplayed: this.app.config.vessels.trail,
        lines: this.gpxExport.ownTrail().displayed.lines,
        historyShown:
          this.trackHistory.available() && this.trackHistory.isShown('self')
      });
    }
    const id = this.vesselId();
    return vesselExportOffer({
      trackDisplayed: aisTrackDisplayed({
        showAll: this.app.config.vessels.aisShowTrack,
        picked: this.app.isVesselTrackShown(id),
        zoom: this.app.mapZoom(),
        minZoom: AIS_TRACK_MIN_ZOOM
      }),
      lines: this.app.data.vessels.aisTracks.get(id),
      historyShown:
        this.trackHistory.available() && this.trackHistory.isShown(id)
    });
  }

  exportTrack(choice: TrackExportChoice) {
    if (this.isSelf()) {
      this.gpxExport.exportOwnTrail(choice);
    } else {
      this.gpxExport.exportVesselTrack(this.vesselId(), choice);
    }
  }

  /** Showing history opens the Track history palette, which the popover
   * could otherwise hide, so the popover gets out of the way first. */
  toggleHistory(context: string) {
    const showing = !this.trackHistory.isShown(context);
    this.trackHistory.toggle(context);
    if (showing) {
      this.handleClose();
    }
  }

  toggleFlag() {
    if (this.isFlagged) {
      this.removeFlag();
    } else {
      if (!this.app.data.vessels.flagged.includes(this.vesselId())) {
        this.app.data.vessels.flagged = [this.vesselId()].concat(
          this.app.data.vessels.flagged
        );
      }
    }
    this.isFlagged = !this.isFlagged;
    this.closed.emit();
  }

  private removeFlag() {
    if (this.app.data.vessels.flagged.includes(this.vesselId())) {
      this.app.data.vessels.flagged.splice(
        this.app.data.vessels.flagged.indexOf(this.vesselId()),
        1
      );
      this.app.data.vessels.flagged = ([] as string[]).concat(
        this.app.data.vessels.flagged
      );
    }
  }

  handleClose() {
    this.closed.emit();
  }
}
