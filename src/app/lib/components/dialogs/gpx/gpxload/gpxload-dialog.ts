import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { GPXLoadFacade } from './gpxload-dialog.facade';
import { AppInfo } from 'src/app/app.info';

//** GPXLoad dialog **
@Component({
  selector: 'gpxload-dialog',
  templateUrl: './gpxload-dialog.html',
  styleUrls: ['./gpxload-dialog.css']
})
export class GPXImportDialog implements OnInit {
  public gpxData = {
    name: '',
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
    loadRoutesOK: false,
    loadWaypointsOK: false,
    loadTracksOK: false,
    routeViewer: false,
    selCount: { routes: 0, waypoints: 0, tracks: 0 },
    expand: { routes: false, waypoints: false, tracks: false }
  };

  private unsubscribe = [];

  constructor(
    public app: AppInfo,
    public facade: GPXLoadFacade,
    public dialogRef: MatDialogRef<GPXImportDialog>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit() {
    this.data.fileData = this.data.fileData || null;
    this.parseGPXData(this.data.fileData);

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
  load() {
    this.facade.uploadToServer({
      rte: { selected: this.selRoutes },
      wpt: { selected: this.selWaypoints },
      trk: { selected: this.selTracks }
    });
  }

  async parseGPXData(data) {
    this.display.allRoutesChecked = false;
    this.display.loadRoutesOK = false;
    this.selRoutes = [];
    this.display.allWaypointsChecked = false;
    this.display.loadWaypointsOK = false;
    this.selWaypoints = [];
    this.display.allTracksChecked = false;
    this.display.loadTracksOK = false;
    this.selTracks = [];
    this.display.selCount = { routes: 0, waypoints: 0, tracks: 0 };
    this.display.expand = { routes: false, waypoints: false, tracks: false };
    this.display.notValid = false;

    this.gpxData = await this.facade.parseFileData(data);
    if (!this.gpxData) {
      console.warn(
        'Selected file does not contain GPX data or\ndoes not correctly implement namespaced <extensions> attributes',
        'Invalid GPX Data:'
      );
      this.display.notValid = true;
      return;
    }

    this.gpxData.routes.forEach(() => {
      this.selRoutes.push(false);
    });
    if (this.selRoutes.length === 1) {
      this.selRoutes[0] = true;
      this.display.allRoutesChecked = true;
      this.display.expand.routes = true;
      this.display.loadRoutesOK = true;
    }

    this.gpxData.waypoints.forEach(() => {
      this.selWaypoints.push(false);
    });
    this.gpxData.tracks.forEach(() => {
      this.selTracks.push(false);
    });
  }

  // ** select Route idx=-1 -> check all
  checkRte(checked: boolean, idx = -1) {
    let selcount = 0;
    if (idx !== -1) {
      this.selRoutes[idx] = checked;
      this.display.loadRoutesOK = checked;
      for (const c of this.selRoutes) {
        if (c) {
          selcount++;
        }
      }
      this.display.loadRoutesOK = selcount !== 0 ? true : false;
      this.display.selCount.routes = selcount;
      this.display.allRoutesChecked = selcount === this.selRoutes.length;
    } else {
      for (let i = 0; i < this.selRoutes.length; i++) {
        this.selRoutes[i] = checked;
        this.display.loadRoutesOK = checked;
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
      this.display.loadWaypointsOK = checked;
      for (const c of this.selWaypoints) {
        if (c) {
          selcount++;
        }
      }
      this.display.loadWaypointsOK = selcount !== 0 ? true : false;
      this.display.selCount.waypoints = selcount;
      this.display.allWaypointsChecked = selcount === this.selWaypoints.length;
    } else {
      for (let i = 0; i < this.selWaypoints.length; i++) {
        this.selWaypoints[i] = checked;
        this.display.loadWaypointsOK = checked;
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
      this.display.loadTracksOK = checked;
      for (const c of this.selTracks) {
        if (c) {
          selcount++;
        }
      }
      this.display.loadTracksOK = selcount !== 0 ? true : false;
      this.display.selCount.tracks = selcount;
      this.display.allTracksChecked = selcount === this.selTracks.length;
    } else {
      for (let i = 0; i < this.selTracks.length; i++) {
        this.selTracks[i] = checked;
        this.display.loadTracksOK = checked;
        this.display.allTracksChecked = checked;
      }
      this.display.selCount.tracks = checked ? this.selTracks.length : 0;
    }
    this.display.someTrkChecked =
      this.display.allTracksChecked || selcount === 0 ? false : true;
  }
}
