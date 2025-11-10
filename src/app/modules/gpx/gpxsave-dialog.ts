import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
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

import { GPXSaveFacade } from './gpxsave-dialog.facade';
import { AppFacade } from 'src/app/app.facade';
import { SKResourceService } from '../skresources';
import { FBRoute, FBWaypoint } from 'src/app/types';

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
    FormsModule,
    CommonModule
  ],
  templateUrl: './gpxsave-dialog.html',
  styleUrls: ['./gpxsave-dialog.css']
})
export class GPXExportDialog implements OnInit {
  protected resData = {
    routes: [],
    waypoints: [],
    tracks: []
  };

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit() {
    this.loadResources();
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
    } catch (err) {
      this.app.sIsFetching.set(false);
      this.resData.waypoints = [];
    }
    this.parseResourceData();
  }

  // ** load selected resources **
  save() {
    this.facade.saveToFile(this.resData, {
      rte: { selected: this.selRoutes },
      wpt: { selected: this.selWaypoints },
      trk: { selected: this.selTracks }
    });
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

    this.selTracks.push(false);
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
