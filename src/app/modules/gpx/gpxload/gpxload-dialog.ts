import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { AppFacade } from 'src/app/app.facade';
import { SignalKClient } from 'signalk-client-angular';
import { SKResources } from 'src/app/modules';
import {
  GPX,
  GPXRoute,
  GPXWaypoint,
  GPXTrack,
  GPXTrackSegment
} from '../gpxlib';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorList } from 'src/app/types';

//** GPXLoad dialog **
@Component({
  selector: 'gpxload-dialog',
  templateUrl: './gpxload-dialog.html',
  styleUrls: ['./gpxload-dialog.css'],
  standalone: false
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

  private errorCount = 0;
  private subCount = 0;
  private gpx: GPX;

  constructor(
    public app: AppFacade,
    private skres: SKResources,
    private signalk: SignalKClient,
    protected dialogRef: MatDialogRef<GPXImportDialog>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit() {
    this.data.fileData = this.data.fileData || null;
    this.parseGPXData(this.data.fileData);
  }

  ngOnDestroy() {
    this.clear();
  }

  // ** load selected resources **
  load() {
    this.uploadToServer({
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

    this.gpxData = await this.parseFileData(data);
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
      this.display.selCount.routes = 1;
    }

    this.gpxData.waypoints.forEach(() => {
      this.selWaypoints.push(false);
    });
    if (this.selWaypoints.length === 1) {
      this.selWaypoints[0] = true;
      this.display.allWaypointsChecked = true;
      this.display.expand.waypoints = true;
      this.display.loadWaypointsOK = true;
      this.display.selCount.waypoints = 1;
    }

    this.gpxData.tracks.forEach(() => {
      this.selTracks.push(false);
    });
    if (this.selTracks.length === 1) {
      this.selTracks[0] = true;
      this.display.allTracksChecked = true;
      this.display.expand.tracks = true;
      this.display.loadTracksOK = true;
      this.display.selCount.tracks = 1;
    }
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

  // ** delete GPX object data **
  public clear() {
    this.gpx = null;
  }

  // ** parse GPX file
  public async parseFileData(data: string) {
    const gpxData = {
      name: '',
      routes: [],
      waypoints: [],
      tracks: []
    };
    this.gpx = new GPX();

    if (!(await this.gpx.parse(data))) {
      return null;
    }

    let idx = 1;
    this.gpx.rte.forEach((r) => {
      gpxData.routes.push({
        name: r['name'] !== '' ? r['name'] : `Rte: ${idx}`,
        description: r['desc'] ? r['desc'] : r['cmt'] ? r['cmt'] : '',
        wptcount: r['rtept'].length
      });
      idx++;
    });
    idx = 1;
    this.gpx.wpt.forEach((w) => {
      gpxData.waypoints.push({
        name: w['name'] ? w['name'] : `Wpt: ${idx}`,
        description: w['desc'] ? w['desc'] : w['cmt'] ? w['cmt'] : ''
      });
      idx++;
    });
    idx = 1;
    this.gpx.trk.forEach((t) => {
      gpxData.tracks.push({
        name: t['name'] ? t['name'] : `Trk: ${idx}`,
        description: t['desc'] ? t['desc'] : t['cmt'] ? t['cmt'] : ''
      });
      idx++;
    });
    return gpxData;
  }

  // ** upload selected resources to Signal K server **
  public async uploadToServer(res) {
    this.app.sIsFetching.set(true);
    this.errorCount = 0;
    this.subCount = 0;

    for (let i = 0; i < res.rte.selected.length; i++) {
      if (res.rte.selected[i]) {
        this.transformRoute(this.gpx.rte[i]);
      }
    }

    for (let i = 0; i < res.wpt.selected.length; i++) {
      if (res.wpt.selected[i]) {
        this.transformWaypoint(this.gpx.wpt[i]);
      }
    }

    const trkIds = [];
    for (let i = 0; i < res.trk.selected.length; i++) {
      if (res.trk.selected[i]) {
        const trk = this.transformTrack(this.gpx.trk[i]);
        this.subCount++;
        try {
          const res = await this.skres.postToServer('tracks', trk);
          this.subCount--;
          if (Math.floor(res['statusCode'] / 100) === 2) {
            trkIds.push(res.id);
            this.app.debug('SUCCESS: Track added.');
          } else {
            this.errorCount++;
          }
          this.checkComplete();
        } catch (err) {
          this.errorCount++;
          this.subCount--;
          this.logError(err);
          this.checkComplete();
        }
      }
    }
    if (trkIds.length !== 0) {
      this.skres.trackCacheFetchIds(trkIds);
    }
  }

  private errorList: ErrorList = [];

  private logError(err: HttpErrorResponse) {
    const msg = err.error ? err.error.message : err.message;
    this.errorList.push({ status: err.status, message: msg });
  }

  // ** check all submissions are resolved and emit result$
  private checkComplete() {
    if (this.subCount === 0) {
      this.app.sIsFetching.set(false);
      this.app.saveConfig();
      this.dialogRef.close({
        errCount: this.errorCount,
        errList: this.errorList
      });
      this.app.debug(`GPXLoad: complete: ${this.errorCount}`);
    }
  }

  // ** transform and upload route
  private transformRoute(r: GPXRoute) {
    const skObj = this.skres.buildRoute(
      r.rtept.map((pt) => {
        return [pt.lon, pt.lat];
      })
    );
    const rte = skObj[1];

    rte.name = r.name ?? '';
    rte.description = r.desc ?? '';
    // ** route properties **
    if (r.cmt) {
      rte.feature.properties['cmt'] = r.cmt;
    }
    if (r.src) {
      rte.feature.properties['src'] = r.src;
    }
    if (r.number) {
      rte.feature.properties['number'] = r.number;
    }
    if (r.type) {
      rte.feature.properties['type'] = r.type;
    }
    rte.feature.properties['coordinatesMeta'] = [];
    rte.feature.properties['coordinatesMeta'] = r.rtept.map((pt) => {
      const ptMeta = { name: pt.name ?? '' };
      if (pt.cmt) {
        ptMeta['description'] = pt.cmt;
      }
      return ptMeta;
    });

    this.subCount++;
    this.signalk.api
      .put(this.app.skApiVersion, `/resources/routes/${skObj[0]}`, skObj[1])
      .subscribe(
        (r) => {
          this.subCount--;
          if (Math.floor(r['statusCode'] / 100) === 2) {
            this.app.debug('SUCCESS: Route added.');
            this.app.config.selections.routes.push(skObj[0]);
          } else {
            this.errorCount++;
          }
          this.checkComplete();
        },
        (err: HttpErrorResponse) => {
          this.errorCount++;
          this.subCount--;
          this.logError(err);
          this.checkComplete();
        }
      );
  }

  // ** transform and upload waypoint
  private transformWaypoint(pt: GPXWaypoint) {
    const wptObj = this.skres.buildWaypoint([pt.lon, pt.lat]);
    const wpt = wptObj[1];
    if (pt.ele) {
      wpt.feature.geometry.coordinates.push(pt.ele);
    }
    if (pt.name && pt.name.length !== 0) {
      wpt.name = pt.name;
    }
    if (pt.desc && pt.desc.length !== 0) {
      wpt.description = pt.desc;
    }
    if (pt.type) {
      wpt.type = pt.type;
    }
    if (pt.cmt) {
      wpt.feature.properties['cmt'] = pt.cmt;
    }
    if (pt.src) {
      wpt.feature.properties['src'] = pt.src;
    }
    if (pt.sym) {
      wpt.feature.properties['sym'] = pt.sym;
    }

    this.subCount++;
    this.signalk.api
      .put(
        this.app.skApiVersion,
        `/resources/waypoints/${wptObj[0]}`,
        wptObj[1]
      )
      .subscribe(
        (r) => {
          this.subCount--;
          if (Math.floor(r['statusCode'] / 100) === 2) {
            this.app.debug('SUCCESS: Waypoint added.');
            this.app.config.selections.waypoints.push(wptObj[0]);
          } else {
            this.errorCount++;
          }
          this.checkComplete();
        },
        (err: HttpErrorResponse) => {
          this.errorCount++;
          this.subCount--;
          this.logError(err);
          this.checkComplete();
        }
      );
  }

  // ** transform and upload track
  private transformTrack(gpxtrk: GPXTrack) {
    const trk = {
      feature: {
        type: 'Feature',
        geometry: { type: 'MultiLineString', coordinates: [] },
        properties: {},
        id: ''
      }
    };
    if (gpxtrk.trkseg) {
      gpxtrk.trkseg.forEach((tseg: GPXTrackSegment) => {
        const line = [];
        tseg.trkpt.forEach((pt: GPXWaypoint) => {
          line.push([pt.lon, pt.lat]);
        });
        trk.feature.geometry.coordinates.push(line);
      });
    }
    if (gpxtrk.name && gpxtrk.name.length !== 0) {
      trk.feature.properties['name'] = gpxtrk.name;
    } else {
      trk.feature.properties['name'] = `gpxtrk #${Math.random()
        .toString()
        .slice(-5)}`;
    }
    if (gpxtrk.desc && gpxtrk.desc.length !== 0) {
      trk.feature.properties['description'] = gpxtrk.desc;
    }
    if (gpxtrk.cmt) {
      trk.feature.properties['cmt'] = gpxtrk.cmt;
    }
    if (gpxtrk.src) {
      trk.feature.properties['src'] = gpxtrk.src;
    }
    if (gpxtrk.type) {
      trk.feature.properties['type'] = gpxtrk.type;
    }
    return trk;
  }
}
