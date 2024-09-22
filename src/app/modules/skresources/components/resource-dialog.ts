/** Resource Dialog Components **
 ********************************/

import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { AppInfo } from 'src/app/app.info';
import { PipesModule } from 'src/app/lib/pipes';

/********* ResourceDialog **********
	data: {
        title: "<string>" title text,
        name: "<string>"resource name,
        comment: "<string>"resource comment,
    }
***********************************/
@Component({
  selector: 'ap-resourcedialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatToolbarModule,
    MatCheckboxModule,
    MatDialogModule,
    PipesModule
  ],
  template: `
    <div class="_ap-resource">
      <div style="display:flex;">
        <div style="padding: 15px 0 0 10px;">
          <mat-icon
            [ngClass]="{
              'icon-waypoint': data.type === 'waypoint',
              'icon-route': data.type === 'route',
              'icon-note': data.type === 'note',
              'icon-region': data.type === 'region'
            }"
            >{{ icon }}</mat-icon
          >
        </div>
        <div>
          <h1 mat-dialog-title>{{ data['title'] }}</h1>
        </div>
      </div>

      <mat-dialog-content>
        <div>
          <div style="padding-left: 10px;">
            <div>
              <mat-form-field floatLabel="always">
                <mat-label>Resource Name</mat-label>
                <input
                  matInput
                  #inpname="ngModel"
                  type="text"
                  required
                  [disabled]="false"
                  [(ngModel)]="data['name']"
                />
                @if(inpname.invalid && (inpname.dirty || inpname.touched)) {
                <mat-error> Please enter a waypoint name </mat-error>
                }
              </mat-form-field>
            </div>
            <div>
              <mat-form-field floatLabel="always">
                <mat-label>Resource Description</mat-label>
                <textarea
                  matInput
                  rows="2"
                  #inpcmt="ngModel"
                  [(ngModel)]="data['comment']"
                >
                </textarea>
              </mat-form-field>
            </div>
            @if(data['type'] === 'waypoint') {
            <div>
              <mat-form-field style="width:100%;" floatLabel="always">
                <mat-label>Waypoint Type</mat-label>
                <mat-select #resourcetype [(value)]="data['skType']">
                  @for(i of resourceTypeList; track i) {
                  <mat-option [value]="i.type">
                    <mat-icon>
                      <img [src]="i.icon" style="width: 21px; height:23px" />
                    </mat-icon>
                    {{ i.name }}
                  </mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
            } @if(data['position'][0]) {
            <div style="font-size: 10pt;">
              <div style="display:flex;">
                <div style="width:45px;font-weight:bold;">Lat:</div>
                <div
                  style="flex: 1 1 auto;"
                  [innerText]="
                    data['position'][1]
                      | coords : app.config.selections.positionFormat : true
                  "
                ></div>
              </div>
              <div style="display:flex;">
                <div style="width:45px;font-weight:bold;">Lon:</div>
                <div
                  style="flex: 1 1 auto;"
                  [innerText]="
                    data['position'][0]
                      | coords : app.config.selections.positionFormat
                  "
                ></div>
              </div>
            </div>
            }
          </div>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions>
        <div style="text-align:center;width:100%;">
          <button
            mat-raised-button
            [disabled]="inpname.invalid"
            (click)="dialogRef.close({ result: true, data: data })"
          >
            SAVE
          </button>
          <button
            mat-raised-button
            (click)="dialogRef.close({ result: false, data: data })"
          >
            CANCEL
          </button>
        </div>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      ._ap-resource {
        font-family: arial;
        min-width: 300px;
      }
      .ap-confirm-icon {
        min-width: 35px;
        max-width: 35px;
        color: darkorange;
        text-align: left;
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
export class ResourceDialog implements OnInit {
  public icon: string;

  public resourceTypeList = [
    {
      type: '',
      name: 'Waypoint',
      icon: './assets/img/waypoints/marker-yellow.png'
    },
    {
      type: 'pseudoaton',
      name: 'Pseudo AtoN',
      icon: './assets/img/waypoints/marker-red.png'
    },
    {
      type: 'whale',
      name: 'Whale Sighting',
      icon: './assets/img/waypoints/whale.svg'
    }
  ];

  constructor(
    public app: AppInfo,
    public dialogRef: MatDialogRef<ResourceDialog>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      title: string;
      name: string;
      comment: string;
      type?: string;
    }
  ) {}

  //** lifecycle: events **
  ngOnInit() {
    this.data['name'] = this.data['name'] || '';
    this.data['comment'] = this.data['comment'] || '';
    this.data['title'] = this.data['title'] || '';
    this.data['position'] = this.data['position'] || [null, null];
    this.data['addMode'] = this.data['addMode'] || false;
    this.data['type'] = this.data['type'] || 'waypoint';
    this.data['skType'] = this.data['skType'] || '';

    this.icon =
      this.data['type'] === 'route'
        ? 'directions'
        : this.data['type'] === 'region'
        ? '360'
        : this.data['type'] === 'note'
        ? 'local_offer'
        : this.data['addMode']
        ? 'add_location'
        : 'edit_location';
  }
}
