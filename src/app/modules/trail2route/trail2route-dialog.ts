/** Trail2Route Dialog Component **
 ********************************/

import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SimplifyAP } from 'simplify-ts';
import { SKRoute } from 'src/app/modules/skresources/resource-classes';
import { SKResources } from 'src/app/modules/skresources//resources.service';
import { SKStreamFacade } from '../skstream/skstream.facade';
import { AppInfo } from 'src/app/app.info';

/********* Trail2RouteDialog **********
	data: {
    }
***********************************/
@Component({
  selector: 'ap-trail2routedialog',
  templateUrl: `./trail2route.html`,
  styles: [
    `
      ._ap-trail2route {
        font-family: arial;
        min-width: 300px;
      }
    `
  ]
})
export class Trail2RouteDialog implements OnInit {
  rteFromTrail: any[];
  mapCenter = [0, 0];
  pointCount = 0;
  incServer = false;

  tolerance = 0.000001;
  highQuality = true;

  mapControls = [{ name: 'zoom' }];

  private obsList: Array<any> = [];
  private fetching = false;
  private serverCoords: Array<any> = [];

  constructor(
    private skres: SKResources,
    protected app: AppInfo,
    private stream: SKStreamFacade,
    public dialogRef: MatDialogRef<Trail2RouteDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  //** lifecycle: events **
  ngOnInit() {
    this.parseTrail(false, true);
    this.obsList.push(
      this.stream.trail$().subscribe((value) => this.onServerResource(value))
    );
    this.getServerTrail(this.app.config.selections.trailFromServer);
  }

  ngOnDestroy() {
    this.obsList.forEach((i) => i.unsubscribe());
  }

  changeTolerance(val: number) {
    this.tolerance = val;
    this.parseTrail();
  }

  parseTrail(incServer?: boolean, center?: boolean) {
    let trail = [].concat(this.data.trail ?? []);
    if (incServer) {
      trail = [].concat(this.serverCoords, trail);
    }
    const rteCoords = SimplifyAP(trail, this.tolerance, this.highQuality);
    this.pointCount = rteCoords.length;
    if (center) {
      this.mapCenter = rteCoords[Math.floor(rteCoords.length / 2)];
    }
    const rte = new SKRoute();
    rte.feature.geometry.coordinates = rteCoords;
    this.rteFromTrail = [['rtefromtrail', rte, true]];
  }

  doClose(save: boolean) {
    let coords = [];
    if (save) {
      coords = this.rteFromTrail[0][1].feature.geometry.coordinates;
    }
    this.dialogRef.close({ result: save, data: coords });
  }

  // retrieve trail from server
  getServerTrail(checked: boolean) {
    if (checked) {
      if (
        !this.app.config.selections.trailFromServer ||
        this.serverCoords.length === 0
      ) {
        this.fetching = true;
        this.skres.getVesselTrail();
      } else {
        this.parseTrail(true);
      }
    } else {
      this.parseTrail();
    }
  }

  // get server trail event handler
  onServerResource(value: any) {
    let serverTrail: Array<any> = [];
    if (this.fetching && value.action == 'get' && value.mode == 'trail') {
      this.fetching = false;
      serverTrail = value.data;
      this.serverCoords = [];
      serverTrail.forEach((line) => {
        this.serverCoords = this.serverCoords.concat(line);
      });
      this.parseTrail();
    }
  }
}
