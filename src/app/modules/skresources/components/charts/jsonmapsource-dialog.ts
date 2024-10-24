import { Component, Inject } from '@angular/core';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatInputModule } from '@angular/material/input';
import { AppInfo } from 'src/app/app.info';
import { SKChart } from 'src/app/modules/skresources/resource-classes';
import { ChartProvider } from 'src/app/types';
import { PipesModule } from 'src/app/lib/pipes';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

interface MapboxStyle {
  version: string;
  name?: string;
  sources: Array<{
    [index: string]: {
      type: string;
      url: string;
    };
  }>;
  layers: Array<{
    id: string;
    source: string;
    'source-layer': string;
  }>;
}

interface TileJson {
  tilejson: string;
  name: string;
  description: string;
  vector_layers?: Array<{
    id: string;
    description: string;
  }>;
}

/********* JsonMapSourceDialog **********
	data: 
***********************************/
@Component({
  selector: 'json-mapsource-dialog',
  standalone: true,
  imports: [
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatToolbarModule,
    MatDialogModule,
    MatProgressBarModule,
    MatInputModule,
    PipesModule
  ],
  template: `
    <div class="_ap-mapbox">
      <mat-toolbar style="background-color: transparent">
        <span class="dialog-icon"><mat-icon>public</mat-icon></span>
        <span style="flex: 1 1 auto; text-align: center"
          >Add JSON Map Source</span
        >
        <span style="text-align: right">
          <button mat-icon-button (click)="dialogRef.close()">
            <mat-icon>close</mat-icon>
          </button>
        </span>
      </mat-toolbar>
      <mat-dialog-content>
        <mat-form-field floatLabel="always" style="width:100%">
          <mat-label> Map Server host. </mat-label>
          <input matInput #txturl type="url" required [(value)]="hostUrl" />
          @if (txturl) {
          <button
            matSuffix
            mat-icon-button
            [disabled]="txturl.value.length === 0"
            (click)="getJsonFile(txturl.value)"
          >
            <mat-icon>arrow_forward</mat-icon>
          </button>
          }
          <mat-hint> Enter url of the Map Server. </mat-hint>
          @if (txturl.invalid) {
          <mat-error>Map server host url is required!</mat-error>
          }
        </mat-form-field>
        @if (isFetching) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        } @else { @if (errorMsg) {
        <mat-error>Error retrieving data from server!</mat-error>
        } @else {
        <div>
          @if (provider) {
          <br />
          <div style="height: 200px;overflow-x: hidden;overflow-y: auto;">
            <div class="row">
              <div class="label">Source:</div>
              <div class="value">{{ details.type }}</div>
            </div>
            <div class="row">
              <div class="label">Name:</div>
              <div class="value">{{ details.name }}</div>
            </div>
            <div class="row">
              <div class="label">Version:</div>
              <div class="value">{{ details.version }}</div>
            </div>
            <div class="row">
              <div class="label">Layers:</div>
              <div class="value">
                @for (l of details.layers; track l) {
                <div>{{ l }}</div>
                }
              </div>
            </div>
          </div>
          }
        </div>
        } }
      </mat-dialog-content>
      <mat-dialog-actions>
        <button mat-raised-button [disabled]="!provider" (click)="handleSave()">
          Save
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      ._ap-mapbox {
      }
      ._ap-mapbox .row {
        display: flex;
      }
      ._ap-mapbox .label {
        width: 70px;
        font-weight: 500;
      }
      ._ap-mapbox .value {
        flex: 1 1 auto;
      }
    `
  ]
})
export class JsonMapSourceDialog {
  protected isFetching = false;
  protected fetchError = false;
  protected errorMsg = '';
  protected hostUrl = '';
  protected provider!: ChartProvider;
  protected details: {
    type: string;
    name: string;
    version: string;
    layers: string[];
  };

  constructor(
    public app: AppInfo,
    public dialogRef: MatDialogRef<JsonMapSourceDialog>,
    private http: HttpClient,
    @Inject(MAT_DIALOG_DATA) public data: SKChart
  ) {}

  handleSave() {
    this.dialogRef.close([this.provider]);
  }

  /** Fetch the mapbox JSON file contents */
  getJsonFile(uri: string) {
    this.errorMsg = '';
    this.fetchError = false;
    this.isFetching = true;
    this.provider = undefined;
    this.http.get(uri).subscribe(
      (res: TileJson | MapboxStyle) => {
        this.isFetching = false;
        if (!res.name) {
          this.errorMsg = 'Invalid response received!';
        } else {
          const c = this.parseFileContents(res, uri);
          if (c) {
            this.provider = c as ChartProvider;
            this.details = {
              type: (res as TileJson).tilejson ? 'TileJSON' : 'Mapbox Style',
              name: res.name,
              version: (res as MapboxStyle).version
                ? (res as MapboxStyle).version
                : (res as TileJson).tilejson,
              layers: (res as MapboxStyle).layers
                ? (res as MapboxStyle).layers.map((l) => l.id)
                : (res as TileJson).vector_layers
                ? (res as TileJson).vector_layers.map((l) => l.id)
                : []
            };
          } else {
            this.fetchError = true;
            this.errorMsg = 'Invalid file contents!';
          }
        }
      },
      (err: HttpErrorResponse) => {
        this.isFetching = false;
        this.fetchError = true;
        this.errorMsg = err.message;
      }
    );
  }

  parseFileContents(json: TileJson | MapboxStyle, uri: string) {
    if ('tilejson' in json) {
      return {
        name: json.name ?? '',
        description: json.description ?? '',
        type: 'tilejson',
        url: uri
      };
    } else if ('version' in json && 'sources' in json && 'layers' in json) {
      return {
        name: json.name ?? '',
        description: '',
        type: 'mapboxstyle',
        url: uri
      };
    } else {
      return undefined;
    }
  }
}
