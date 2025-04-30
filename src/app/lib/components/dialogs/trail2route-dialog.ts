/** Trail2Route Dialog Component **
 ********************************/

import { Component, OnInit, Inject } from '@angular/core';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatToolbarModule } from '@angular/material/toolbar';

import { CommonDialogs } from 'src/app/lib/components/dialogs';
import { FreeboardOpenlayersModule } from 'src/app/modules/map/ol';
import { SimplifyAP } from 'simplify-ts';
import { SKRoute, SKResourceService, SKStreamFacade } from 'src/app/modules';
import { AppFacade } from 'src/app/app.facade';

/********* Trail2RouteDialog **********
	data: {
    }
***********************************/
@Component({
  selector: 'ap-trail2routedialog',
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatTooltipModule,
    MatSliderModule,
    MatCheckboxModule,
    MatToolbarModule,
    CommonDialogs,
    FreeboardOpenlayersModule
  ],
  templateUrl: `./trail2route-dialog.html`,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rteFromTrail: any[];
  mapCenter = [0, 0];
  pointCount = 0;
  incServer = false;

  tolerance = 0.000001;
  highQuality = true;

  mapControls = [{ name: 'zoom' }];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private obsList: Array<any> = [];
  private fetching = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private serverCoords: Array<any> = [];

  constructor(
    private skres: SKResourceService,
    protected app: AppFacade,
    private stream: SKStreamFacade,
    public dialogRef: MatDialogRef<Trail2RouteDialog>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        this.app.fetchTrailFromServer();
      } else {
        this.parseTrail(true);
      }
    } else {
      this.parseTrail();
    }
  }

  // get server trail event handler
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onServerResource(value: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let serverTrail: Array<any> = [];
    if (this.fetching && value.action === 'get' && value.mode === 'trail') {
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
