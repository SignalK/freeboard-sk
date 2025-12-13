import { Component, Inject } from '@angular/core';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AppFacade } from 'src/app/app.facade';
import { SKChart } from 'src/app/modules/skresources/resource-classes';
import { CoordsPipe } from 'src/app/lib/pipes';
import { Position } from 'src/app/types';

/********* ChartSeedJobDialog **********
	data: { chart: SKChart, bbox: {} }
***********************************/
@Component({
  selector: 'ap-chartproperties',
  imports: [
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatToolbarModule,
    MatDialogModule,
    MatSelectModule,
    FormsModule,
    CoordsPipe
  ],
  template: `
    <div class="_ap-chartjob">
      <mat-toolbar style="background-color: transparent">
        <span class="dialog-icon"><mat-icon>download</mat-icon></span>
        <span style="flex: 1 1 auto; text-align: center">Chart Seed job</span>
        <span style="text-align: right">
          <button mat-icon-button (click)="dialogRef.close(-1)">
            <mat-icon>close</mat-icon>
          </button>
        </span>
      </mat-toolbar>
      <mat-dialog-content>
        <div>
          <div style="flex: 1 1 auto;">{{ data.chart[1].name }}</div>
          @if (data.bbox) {
            <div
              style="flex: 1 1 auto; border: gray 1px solid;font-size: 10pt;"
            >
              <div style="text-align:right;">
                <span
                  style="flex: 1 1 auto;"
                  [innerText]="data.bbox[1][1] | coords: 'HDd' : true"
                >
                </span
                ><br />
                <span
                  style="flex: 1 1 auto;"
                  [innerText]="data.bbox[1][0] | coords: 'HDd'"
                >
                </span>
              </div>
              <div>
                <span
                  style="flex: 1 1 auto;"
                  [innerText]="data.bbox[0][1] | coords: 'HDd' : true"
                >
                </span
                ><br />
                <span
                  style="flex: 1 1 auto;"
                  [innerText]="data.bbox[0][0] | coords: 'HDd'"
                >
                </span>
              </div>
            </div>
          }
          <div style="flex: 1 1 auto;">
            <mat-form-field style="width: 100%;">
              <mat-label>Max. Zoom Level</mat-label>
              <mat-select [(ngModel)]="selZoom">
                @for (zoom of zoomRange; track zoom) {
                  <mat-option [value]="zoom">{{ zoom }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions>
        <button mat-raised-button (click)="dialogRef.close(selZoom)">
          Submit
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      ._ap-chartjob {
        font-family: arial;
        min-width: 300px;
      }
      .ap-confirm-icon {
        min-width: 35px;
        max-width: 35px;
        color: darkorange;
        text-align: left;
      }

      ._ap-chartjob .key-label {
        width: 150px;
        font-weight: 500;
      }

      @media only screen and (min-device-width: 768px) and (max-device-width: 1024px),
        only screen and (min-width: 800px) {
        .ap-confirm-icon {
          min-width: 25%;
          max-width: 25%;
        }
      }
    `
  ]
})
export class ChartSeedJobDialog {
  protected icon: string;
  protected zoomRange: number[] = [];
  protected selZoom: number;

  constructor(
    public app: AppFacade,
    public dialogRef: MatDialogRef<ChartSeedJobDialog>,
    @Inject(MAT_DIALOG_DATA)
    public data: { chart: SKChart; bbox: [Position, Position] }
  ) {}

  ngOnInit() {
    const minZoom = this.data.chart[1].minZoom ?? 1;
    const maxZoom = this.data.chart[1].maxZoom ?? 15;
    this.selZoom = maxZoom;
    for (let i = minZoom; i <= maxZoom; i++) {
      this.zoomRange.push(i);
    }
  }
}
