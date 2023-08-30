import { Component, OnInit, Inject } from '@angular/core';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { GeoJSONLoadFacade } from './geojson-dialog.facade';
import { AppInfo } from 'src/app/app.info';

//** GeoJSON import dialog **
@Component({
  standalone: true,
  selector: 'geojson-dialog',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatExpansionModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatToolbarModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './geojson-dialog.html',
  styleUrls: ['./geojson-dialog.css']
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
