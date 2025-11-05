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
import { SKInfoLayer } from '../../custom-resource-classes';
import { formatDimensionValue } from '../../dimension-utils';

/********* InfoLayerPropertiesDialog **********
	data: <SKInfoLayer>
***********************************/
@Component({
  selector: 'ap-infolayerproperties',
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
    <div class="_ap-infolayer">
      <mat-toolbar style="background-color: transparent">
        <span class="dialog-icon"><mat-icon>layers</mat-icon></span>
        <span style="flex: 1 1 auto; text-align: center"
          >Overlay Properties</span
        >
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
            <div style="flex: 1 1 auto;">{{ data.name }}</div>
          </div>
          <div style="display:flex;">
            <div class="key-label">Description:</div>
            <div style="flex: 1 1 auto;">{{ data.description }}</div>
          </div>
          <div style="display:flex;">
            <div class="key-label">Type:</div>
            <div style="flex: 1 1 auto;">
              {{ data.values.sourceType }}
            </div>
          </div>
          <div style="display:flex;">
            <div class="key-label">Zoom:</div>
            <div style="flex: 1 1 auto;">
              <div style="flex: 1 1 auto;">
                <u><i>Min: </i></u>
                {{ data.values.minZoom }},
                <u><i>Max: </i></u>
                {{ data.values.maxZoom }}
              </div>
            </div>
          </div>
          <div style="display:flex;">
            <div class="key-label">Layers:</div>
            <div style="flex: 1 1 auto;">{{ data.values.layers }}</div>
          </div>
          <div style="display:flex;">
            <div class="key-label">URL:</div>
            <div style="flex: 1 1 auto;overflow-x: auto;">
              {{ data.values.url }}
            </div>
          </div>
          @if(data.values.time) {
          <div style="display:flex; margin-top: 8px;">
            <div class="key-label">Time Dimension:</div>
            <div style="flex: 1 1 auto;">
              <small>Values: {{ data.values.time.values?.length || 0 }}</small><br/>
              <small>Span: {{ getTimeSpanHours() }} hours</small><br/>
              <small>Current: {{ formatDimensionValue(getCurrentTime()) }}</small><br/>
              @if(getTimeOffset() !== undefined) {
              <small>Offset: {{ getTimeOffset() }}h</small>
              }
            </div>
          </div>
          }
        </div>
      </mat-dialog-content>
    </div>
  `,
  styles: [
    `
      ._ap-infolayer {
        font-family: arial;
        min-width: 300px;
      }
      .ap-confirm-icon {
        min-width: 35px;
        max-width: 35px;
        color: darkorange;
        text-align: left;
      }

      ._ap-infolayer .key-label {
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
export class InfoLayerPropertiesDialog {
  public icon: string;

  constructor(
    public app: AppFacade,
    public dialogRef: MatDialogRef<InfoLayerPropertiesDialog>,
    @Inject(MAT_DIALOG_DATA) public data: SKInfoLayer
  ) {}

  getCurrentTime(): string {
    const time = this.data.values.time;
    if (!time || !time.values || time.values.length === 0) {
      return '';
    }
    
    // Calculate from offset
    const offset = time.timeOffset ?? 0;
    if (offset === 0) {
      return time.values[time.values.length - 1];
    }
    
    // Calculate target time based on offset
    const mostRecentTime = new Date(time.values[time.values.length - 1]).getTime();
    const targetTime = mostRecentTime + (offset * 60 * 60 * 1000);
    
    // Find closest time value
    let closestIndex = time.values.length - 1;
    let closestDiff = Infinity;
    
    for (let i = 0; i < time.values.length; i++) {
      const timeVal = new Date(time.values[i]).getTime();
      const diff = Math.abs(timeVal - targetTime);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }
    
    return time.values[closestIndex];
  }

  getTimeSpanHours(): number {
    const time = this.data.values.time;
    if (!time || !time.values || time.values.length < 2) {
      return 0;
    }
    const oldest = new Date(time.values[0]).getTime();
    const newest = new Date(time.values[time.values.length - 1]).getTime();
    return Math.round((newest - oldest) / (1000 * 60 * 60));
  }

  getTimeOffset(): number | undefined {
    const time = this.data.values.time;
    if (!time) return undefined;
    return (time as any).timeOffset;
  }

  formatDimensionValue(value: string): string {
    return formatDimensionValue(value);
  }
}
