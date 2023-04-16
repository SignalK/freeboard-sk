import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { GeoJSONLoadFacade } from './geojson.facade';
import { AppInfo } from 'src/app/app.info';

//** GeoJSON import dialog **
@Component({
  selector: 'geojson-dialog',
  templateUrl: './geojson-dialog.html',
  styleUrls: ['./geojson.css']
})
export class GeoJSONImportDialog implements OnInit {
  public geoData = {
    name: '',
    routes: [],
    waypoints: [],
    tracks: [],
    regions: [],
    value: null
  };

  public display = {
    notValid: false
  };

  private unsubscribe = [];

  constructor(
    public app: AppInfo,
    public facade: GeoJSONLoadFacade,
    public dialogRef: MatDialogRef<GeoJSONImportDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit() {
    this.data.fileData = this.data.fileData || null;
    this.parseFileData(this.data.fileData);

    // ** close dialog returning error count **
    this.unsubscribe.push(
      this.facade.uploaded$.subscribe((errCount) => {
        this.dialogRef.close(errCount);
      })
    );
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((i) => i.unsubscribe());
  }

  // ** upload features to server **
  load() {
    this.facade.uploadToServer(this.geoData.value);
  }

  parseFileData(fileData: any) {
    this.geoData.value = this.facade.validate(fileData);
    if (!this.geoData.value) {
      console.warn('Error:', 'Invalid GeoJSON file!');
      this.display.notValid = true;
      return;
    }
    this.geoData.value.features.forEach((f: any) => {
      if (f.type && f.type === 'Feature' && f.geometry && f.geometry.type) {
        switch (f.geometry.type) {
          case 'LineString': // route
            this.geoData.routes.push(f);
            break;
          case 'Point': // waypoint
            this.geoData.waypoints.push(f);
            break;
          case 'MultiLineString': // track
            this.geoData.tracks.push(f);
            break;
          case 'Polygon': // region
          case 'MultiPolygon':
            this.geoData.regions.push(f);
            break;
        }
      }
    });
  }
}
