import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { GPXSaveFacade } from './gpxsave-dialog.facade';
import { AppFacade } from 'src/app/app.facade';

//** GPXSave dialog **
@Component({
  selector: 'gpxsave-dialog',
  templateUrl: './gpxsave-dialog.html',
  styleUrls: ['./gpxsave-dialog.css'],
  standalone: false
})
export class GPXExportDialog implements OnInit {
  public resData = {
    routes: [],
    waypoints: [],
    tracks: []
  };

  public selRoutes = [];
  public selectedRoute = null;
  public selWaypoints = [];
  public selTracks = [];

  public display = {
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
    public app: AppFacade,
    public facade: GPXSaveFacade,
    public dialogRef: MatDialogRef<GPXExportDialog>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit() {
    this.parseResourceData();

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
