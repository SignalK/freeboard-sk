import { Component, OnInit, Inject, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { SignalKClient } from 'signalk-client-angular';

import { GPXSaveFacade } from './gpxsave-dialog.facade';
import { AppFacade } from 'src/app/app.facade';
import { SKResourceService } from '../skresources';
import { FBRoute, FBWaypoint } from 'src/app/types';
import { TrackHistoryService } from 'src/app/modules/skstream/track-history.service';
import {
  HistoryRange,
  parseHistoryTrack,
  PointTime
} from 'src/app/modules/skstream/track-history';
import {
  exportRange,
  GpxTrackData,
  gpxTrack,
  hasExportableTrack,
  trackExportQuery,
  TrackExportChoice,
  TrackExportSource,
  validCustomRange
} from './track-export';

/** What the dialog is opened with. `tracksOnly` offers just the tracks,
 * already selected (exporting one vessel's track from its popover). */
export interface GPXExportData {
  routes: FBRoute[];
  tracks: TrackExportSource[];
  tracksOnly?: boolean;
  /** The track choice to start on (the displayed track when omitted). */
  initialChoice?: TrackExportChoice;
  // filled in by the dialog
  waypoints?: FBWaypoint[];
}

const HOUR = 3600000;

/** A time as a `datetime-local` input value (local time, to the minute). */
export function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/** A `datetime-local` input value as ms, or null when blank or invalid. The
 * value has no offset, so it is read as local time. */
export function fromLocalInput(value: string): number | null {
  const ms = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(ms) ? ms : null;
}

//** GPXSave dialog **
@Component({
  selector: 'gpxsave-dialog',
  imports: [
    MatToolbarModule,
    MatProgressBarModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    MatExpansionModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatSelectModule,
    FormsModule
  ],
  templateUrl: './gpxsave-dialog.html',
  styleUrls: ['./gpxsave-dialog.css']
})
export class GPXExportDialog implements OnInit {
  protected resData = {
    routes: [],
    waypoints: [],
    tracks: [] as TrackExportSource[]
  };

  /** Which track to export: the displayed one, or a range fetched from the
   * Track API (offered only with a v2 provider). */
  protected trackChoice: TrackExportChoice = 'displayed';
  protected customFrom = '';
  protected customTo = '';
  protected fetching = false;

  private signalk = inject(SignalKClient);
  protected trackHistory = inject(TrackHistoryService);

  protected selRoutes = [];
  protected selectedRoute = null;
  protected selWaypoints = [];
  protected selTracks = [];

  protected display = {
    notValid: false,
    allRoutesChecked: false,
    allWaypointsChecked: false,
    allTracksChecked: false,
    someWptChecked: false,
    someRteChecked: false,
    someTrkChecked: false,
    saveRoutesOK: false,
    saveWaypointsOK: false,
    saveTracksOK: false,
    routeViewer: false,
    selCount: { routes: 0, waypoints: 0, tracks: 0 },
    expand: { routes: false, waypoints: false, tracks: false }
  };

  private unsubscribe = [];

  constructor(
    protected app: AppFacade,
    private skres: SKResourceService,
    private facade: GPXSaveFacade,
    protected dialogRef: MatDialogRef<GPXExportDialog>,
    @Inject(MAT_DIALOG_DATA) public data: GPXExportData
  ) {}

  ngOnInit() {
    const now = Date.now();
    this.customFrom = toLocalInput(now - 24 * HOUR);
    this.customTo = toLocalInput(now);
    this.loadResources();
    if (
      this.data.initialChoice &&
      this.rangeAvailable &&
      (this.data.initialChoice !== 'history' || this.historyRange)
    ) {
      this.trackChoice = this.data.initialChoice;
    }
    // ** close dialog returning error count **
    this.unsubscribe.push(
      this.facade.result$.subscribe((errCount) => {
        this.dialogRef.close(errCount);
      })
    );
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((i) => i.unsubscribe());
    this.facade.clear();
  }

  private async loadResources() {
    if (this.data.tracksOnly) {
      this.data.waypoints = [];
      this.parseResourceData();
      return;
    }
    this.data.routes.sort((a: FBRoute, b: FBRoute) =>
      a[1].name.localeCompare(b[1].name)
    );
    try {
      this.app.sIsFetching.set(true);
      const w = await this.skres.listFromServer<FBWaypoint>('waypoints');
      w.sort((a: FBWaypoint, b: FBWaypoint) =>
        a[1].name.localeCompare(b[1].name)
      );
      this.data.waypoints = w;
      this.app.sIsFetching.set(false);
    } catch {
      this.app.sIsFetching.set(false);
      this.resData.waypoints = [];
    }
    this.parseResourceData();
  }

  /** A range can be exported only from a v2 Track API provider. */
  protected get rangeAvailable(): boolean {
    return !!this.app.featureFlags().tracksApi;
  }

  /** The Track history palette's range, while a listed vessel's history is
   * shown there. */
  protected get historyRange(): HistoryRange | undefined {
    return this.resData.tracks.some((t) => this.trackHistory.isShown(t.context))
      ? this.trackHistory.range()
      : undefined;
  }

  /** The range the current choice fetches; null for the displayed track. */
  private chosenRange(): HistoryRange | null {
    return exportRange(this.trackChoice, Date.now(), {
      history: this.historyRange,
      custom: {
        from: fromLocalInput(this.customFrom),
        to: fromLocalInput(this.customTo)
      }
    });
  }

  /** A custom range must have both ends, in order, before it can be saved. */
  protected get customInvalid(): boolean {
    return (
      this.trackChoice === 'custom' &&
      !validCustomRange({
        from: fromLocalInput(this.customFrom),
        to: fromLocalInput(this.customTo)
      })
    );
  }

  /** A range is chosen but can't be resolved: an incomplete custom range, or
   * the Track history range once that history is no longer shown. */
  protected get rangeUnusable(): boolean {
    return (
      this.rangeAvailable &&
      this.trackChoice !== 'displayed' &&
      this.chosenRange() === null
    );
  }

  /** Something is selected, and a selected track has a usable range (an
   * unusable one would otherwise quietly save the displayed track). */
  protected get canSave(): boolean {
    return (
      !this.fetching &&
      !(this.display.saveTracksOK && this.rangeUnusable) &&
      (this.display.saveRoutesOK ||
        this.display.saveWaypointsOK ||
        this.display.saveTracksOK)
    );
  }

  // ** load selected resources **
  async save() {
    let tracks: GpxTrackData[];
    try {
      tracks = await this.selectedTracks();
    } catch {
      this.app.showAlert(
        'GPX Save',
        'Unable to fetch the recorded track from the server.'
      );
      return;
    }
    if (tracks === null) {
      return;
    }
    this.facade.saveToFile(this.resData, {
      rte: { selected: this.selRoutes },
      wpt: { selected: this.selWaypoints },
      trk: { tracks }
    });
  }

  /** The selected tracks as they will be written: as displayed, or fetched
   * over the chosen range with no thinning asked for. Null (after telling the
   * user) when a selected track has nothing to write. */
  private async selectedTracks(): Promise<GpxTrackData[] | null> {
    const selected = this.resData.tracks.filter((_, i) => this.selTracks[i]);
    if (selected.length === 0) {
      return [];
    }
    const range = this.rangeAvailable ? this.chosenRange() : null;
    const now = Date.now();
    const tracks: GpxTrackData[] = [];
    this.fetching = true;
    try {
      for (const src of selected) {
        const track =
          range === null
            ? src.displayed
            : await this.fetchTrack(src.context, range);
        const t = gpxTrack(src.label, track, now);
        if (!t) {
          this.app.showAlert(
            'GPX Save',
            range === null
              ? `There is no track to save for ${src.label}.`
              : `No track is recorded for ${src.label} in the selected range.`
          );
          return null;
        }
        tracks.push(t);
      }
    } finally {
      this.fetching = false;
    }
    return tracks;
  }

  /** One vessel's recorded track over a range, with each point's time. */
  private async fetchTrack(
    context: string,
    range: HistoryRange
  ): Promise<{ lines: GpxTrackData['lines']; times: PointTime[][] }> {
    const provider = this.app.trackSource()?.provider;
    const req = this.signalk.api.get(
      2,
      `/tracks?${trackExportQuery(context, range, provider)}`
    );
    if (!req) {
      throw new Error('Not connected');
    }
    const fc = await firstValueFrom(req);
    const t = parseHistoryTrack(context, fc, provider);
    return {
      lines: t?.lines ?? [],
      times: t?.times ?? (t?.lines ?? []).map((l) => l.map(() => undefined))
    };
  }

  parseResourceData() {
    this.display.allRoutesChecked = false;
    this.display.saveRoutesOK = false;
    this.selRoutes = [];
    this.display.allWaypointsChecked = false;
    this.display.saveWaypointsOK = false;
    this.selWaypoints = [];
    this.display.allTracksChecked = false;
    this.display.saveTracksOK = false;
    this.selTracks = [];
    this.display.selCount = { routes: 0, waypoints: 0, tracks: 0 };
    this.display.expand = { routes: false, waypoints: false, tracks: false };
    this.display.notValid = false;

    this.resData = this.facade.prepData(this.data);
    // a track is offered when there is one to save as displayed, or a range
    // to fetch
    this.resData.tracks = this.resData.tracks.filter(
      (t) => this.rangeAvailable || hasExportableTrack(t.displayed?.lines)
    );

    this.resData.routes.forEach(() => {
      this.selRoutes.push(false);
    });
    if (this.selRoutes.length === 1) {
      this.selRoutes[0] = true;
      this.display.allRoutesChecked = true;
      this.display.expand.routes = true;
      this.display.saveRoutesOK = true;
    }

    this.resData.waypoints.forEach(() => {
      this.selWaypoints.push(false);
    });

    this.resData.tracks.forEach(() => {
      this.selTracks.push(false);
    });
    if (this.data.tracksOnly && this.selTracks.length !== 0) {
      this.checkTrk(true, -1);
      this.display.expand.tracks = true;
    }
  }

  // ** select Route idx=-1 -> check all
  checkRte(checked: boolean, idx = -1) {
    let selcount = 0;
    if (idx !== -1) {
      this.selRoutes[idx] = checked;
      this.display.saveRoutesOK = checked;
      for (const c of this.selRoutes) {
        if (c) {
          selcount++;
        }
      }
      this.display.saveRoutesOK = selcount !== 0 ? true : false;
      this.display.selCount.routes = selcount;
      this.display.allRoutesChecked = selcount === this.selRoutes.length;
    } else {
      for (let i = 0; i < this.selRoutes.length; i++) {
        this.selRoutes[i] = checked;
        this.display.saveRoutesOK = checked;
        this.display.allRoutesChecked = checked;
      }
      this.display.selCount.routes = checked ? this.selRoutes.length : 0;
    }
    this.display.someRteChecked =
      this.display.allRoutesChecked || selcount === 0 ? false : true;
  }

  // ** select Waypoint idx=-1 -> check all
  checkWpt(checked: boolean, idx = -1) {
    let selcount = 0;
    if (idx !== -1) {
      this.selWaypoints[idx] = checked;
      this.display.saveWaypointsOK = checked;
      for (const c of this.selWaypoints) {
        if (c) {
          selcount++;
        }
      }
      this.display.saveWaypointsOK = selcount !== 0 ? true : false;
      this.display.selCount.waypoints = selcount;
      this.display.allWaypointsChecked = selcount === this.selWaypoints.length;
    } else {
      for (let i = 0; i < this.selWaypoints.length; i++) {
        this.selWaypoints[i] = checked;
        this.display.saveWaypointsOK = checked;
        this.display.allWaypointsChecked = checked;
      }
      this.display.selCount.waypoints = checked ? this.selWaypoints.length : 0;
    }
    this.display.someWptChecked =
      this.display.allWaypointsChecked || selcount === 0 ? false : true;
  }

  // ** select Track idx=-1 -> check all
  checkTrk(checked: boolean, idx = -1) {
    let selcount = 0;
    if (idx !== -1) {
      this.selTracks[idx] = checked;
      this.display.saveTracksOK = checked;
      for (const c of this.selTracks) {
        if (c) {
          selcount++;
        }
      }
      this.display.saveTracksOK = selcount !== 0 ? true : false;
      this.display.selCount.tracks = selcount;
      this.display.allTracksChecked = selcount === this.selTracks.length;
    } else {
      for (let i = 0; i < this.selTracks.length; i++) {
        this.selTracks[i] = checked;
        this.display.saveTracksOK = checked;
        this.display.allTracksChecked = checked;
      }
      this.display.selCount.tracks = checked ? this.selTracks.length : 0;
    }
    this.display.someTrkChecked =
      this.display.allTracksChecked || selcount === 0 ? false : true;
  }
}
