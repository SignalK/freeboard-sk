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
import { AppFacade } from 'src/app/app.facade';
import { SKChart } from 'src/app/modules/skresources/resource-classes';
import { PipesModule } from 'src/app/lib/pipes';

/********* ChartPropertiesDialog **********
	data: <SKChart>
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
    PipesModule
  ],
  template: `
    <div class="_ap-chartinfo">
      <mat-toolbar style="background-color: transparent">
        <span class="dialog-icon"
          ><mat-icon>{{ isLocal(data['url']) }}</mat-icon></span
        >
        <span style="flex: 1 1 auto; text-align: center">Chart Properties</span>
        <span style="text-align: right">
          <button mat-icon-button (click)="dialogRef.close()">
            <mat-icon>close</mat-icon>
          </button>
        </span>
      </mat-toolbar>
      <mat-dialog-content>
        <div style="display:flex;flex-direction: column;">
          <div style="display:flex;">
            <div class="key-label">Name:</div>
            <div style="flex: 1 1 auto;">{{ data['name'] }}</div>
          </div>
          <div style="display:flex;">
            <div class="key-label">Description:</div>
            <div style="flex: 1 1 auto;">{{ data['description'] }}</div>
          </div>
          <div style="display:flex;">
            <div class="key-label">Scale:</div>
            <div style="flex: 1 1 auto;">{{ data['scale'] }}</div>
          </div>
          <div style="display:flex;">
            <div class="key-label">Zoom:</div>
            <div style="flex: 1 1 auto;">
              <div style="flex: 1 1 auto;">
                <u><i>Min: </i></u>
                {{ data['minZoom'] }},
                <u><i>Max: </i></u>
                {{ data['maxZoom'] }}
              </div>
            </div>
          </div>
          @if(data['bounds']) {
          <div style="display:flex;">
            <div class="key-label">Bounds:</div>
            <div
              style="flex: 1 1 auto; border: gray 1px solid;
                                  max-width: 220px;font-size: 10pt;"
            >
              <div style="text-align:right;">
                <span
                  style="flex: 1 1 auto;"
                  [innerText]="data['bounds'][3] | coords : 'HDd' : true"
                >
                </span
                ><br />
                <span
                  style="flex: 1 1 auto;"
                  [innerText]="data['bounds'][2] | coords : 'HDd'"
                >
                </span>
              </div>
              <div>
                <span
                  style="flex: 1 1 auto;"
                  [innerText]="data['bounds'][1] | coords : 'HDd' : true"
                >
                </span
                ><br />
                <span
                  style="flex: 1 1 auto;"
                  [innerText]="data['bounds'][0] | coords : 'HDd'"
                >
                </span>
              </div>
            </div>
          </div>
          }
          <div style="display:flex;">
            <div class="key-label">Format:</div>
            <div style="flex: 1 1 auto;">{{ data['format'] }}</div>
          </div>
          <div style="display:flex;">
            <div class="key-label">Type:</div>
            <div style="flex: 1 1 auto;">
              {{ data['type'] }}
            </div>
          </div>
          <div style="display:flex;">
            <div class="key-label">Layers:</div>
            <div style="flex: 1 1 auto;">{{ data['layers'] }}</div>
          </div>
          <div style="display:flex;">
            <div class="key-label">URL:</div>
            <div style="flex: 1 1 auto;overflow-x: auto;">
              {{ data['url'] }}
            </div>
          </div>
        </div>
      </mat-dialog-content>
    </div>
  `,
  styles: [
    `
      ._ap-chartinfo {
        font-family: arial;
        min-width: 300px;
      }
      .ap-confirm-icon {
        min-width: 35px;
        max-width: 35px;
        color: darkorange;
        text-align: left;
      }

      ._ap-chartinfo .key-label {
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
export class ChartPropertiesDialog {
  public icon: string;

  constructor(
    public app: AppFacade,
    public dialogRef: MatDialogRef<ChartPropertiesDialog>,
    @Inject(MAT_DIALOG_DATA) public data: SKChart
  ) {}

  isLocal(url: string) {
    return url && url.indexOf('signalk') !== -1 ? 'map' : 'language';
  }
}
