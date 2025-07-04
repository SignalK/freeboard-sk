/** Resource Group Details Dialog Component **
 ********************************/

import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { SKResourceGroup } from './groups.service';
import { SKResourceService } from '../../resources.service';
import { FBChart, FBRoute, FBWaypoint } from 'src/app/types';

/********* ResourceGroupDialog **********
	data: {
    group: SKResourceGroup
  }
***********************************/
@Component({
  selector: 'ap-resourcegroupdialog',
  imports: [
    CommonModule,
    FormsModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatTabsModule,
    MatListModule,
    MatTooltipModule
  ],
  template: `
    <div class="_ap-group">
      <div style="display:flex;">
        <div style="padding: 15px 0 0 10px;">
          <mat-icon>category</mat-icon>
        </div>
        <div>
          <h1 mat-dialog-title>Group Information</h1>
        </div>
      </div>

      <mat-dialog-content>
        <mat-tab-group dynamicHeight="false">
          <mat-tab label="Details">
            <div style="padding-top: 10px;">
              <div>
                <mat-form-field floatLabel="always">
                  <mat-label>Name</mat-label>
                  <input
                    matInput
                    #inpname="ngModel"
                    type="text"
                    required
                    [(ngModel)]="gItem.name"
                  />
                  @if(inpname.invalid && (inpname.dirty || inpname.touched)) {
                  <mat-error> Please enter a name.</mat-error>
                  }
                </mat-form-field>
              </div>
              <div>
                <mat-form-field floatLabel="always">
                  <mat-label>Description</mat-label>
                  <textarea
                    matInput
                    rows="3"
                    #inpcmt="ngModel"
                    [(ngModel)]="gItem.description"
                  >
                  </textarea>
                </mat-form-field>
              </div>
            </div>
          </mat-tab>

          <mat-tab label="Routes">
            <mat-list>
              @for(i of gItem.routes; track i.id) {
              <mat-list-item>
                <div style="display:flex;">
                  <div
                    style="flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis;whitespace: pre;"
                  >
                    {{ i.name }}
                  </div>
                  <div>
                    <button
                      mat-icon-button
                      matTooltip="Remove"
                      (click)="removeItem('route', i.id)"
                    >
                      <mat-icon class="icon-warn">delete</mat-icon>
                    </button>
                  </div>
                </div>
              </mat-list-item>
              }
            </mat-list>
          </mat-tab>

          <mat-tab label="Waypoints">
            <mat-list>
              @for(i of gItem.waypoints; track i.id) {
              <mat-list-item>
                <div style="display:flex;">
                  <div
                    style="flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis;whitespace: pre;"
                  >
                    {{ i.name }}
                  </div>
                  <div>
                    <button
                      mat-icon-button
                      matTooltip="Remove"
                      (click)="removeItem('waypoint', i.id)"
                    >
                      <mat-icon class="icon-warn">delete</mat-icon>
                    </button>
                  </div>
                </div>
              </mat-list-item>
              }
            </mat-list>
          </mat-tab>

          <!--<mat-tab label="Charts">
            <mat-list>
              @for(i of gItem.charts; track i.id) {
              <mat-list-item>
                <div style="display:flex;">
                  <div
                    style="flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis;whitespace: pre;"
                  >
                    {{ i.name }}
                  </div>
                  <div>
                    <button
                      mat-icon-button
                      matTooltip="Remove"
                      (click)="removeItem('chart', i.id)"
                    >
                      <mat-icon class="icon-warn">delete</mat-icon>
                    </button>
                  </div>
                </div>
              </mat-list-item>
              }
            </mat-list>
          </mat-tab>-->
        </mat-tab-group>
      </mat-dialog-content>
      <mat-dialog-actions>
        <div style="text-align:center;width:100%;">
          <button
            mat-raised-button
            [disabled]="inpname.invalid"
            (click)="handleClose(true)"
          >
            SAVE
          </button>
          <button mat-raised-button (click)="handleClose(false)">CANCEL</button>
        </div>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      ._ap-group {
        min-width: 300px;
      }
    `
  ]
})
export class ResourceGroupDialog implements OnInit {
  protected gItem: any;

  constructor(
    private dialogRef: MatDialogRef<ResourceGroupDialog>,
    private skres: SKResourceService,
    @Inject(MAT_DIALOG_DATA)
    protected data: {
      group: SKResourceGroup;
    }
  ) {}

  ngOnInit() {
    this.gItem = {
      name: this.data.group.name ?? '',
      description: this.data.group.description ?? '',
      routes: [],
      waypoints: [],
      charts: []
    };
  }

  ngAfterViewInit() {
    this.skres.listFromServer<FBRoute>('routes').then((r) => {
      if (this.data.group.routes) {
        r.forEach((rte) => {
          if (this.data.group.routes.includes(rte[0])) {
            this.gItem.routes.push({ id: rte[0], name: rte[1].name });
          }
        });
      }
    });
    this.skres.listFromServer<FBWaypoint>('waypoints').then((w) => {
      if (this.data.group.waypoints) {
        w.forEach((wpt) => {
          if (this.data.group.waypoints.includes(wpt[0])) {
            this.gItem.waypoints.push({ id: wpt[0], name: wpt[1].name });
          }
        });
      }
    });
    this.skres.listFromServer<FBChart>('charts').then((c) => {
      if (this.data.group.charts) {
        c.forEach((cht) => {
          if (this.data.group.charts.includes(cht[0])) {
            this.gItem.charts.push({ id: cht[0], name: cht[1].name });
          }
        });
      }
    });
  }

  removeItem(itemType: string, id: string) {
    const items =
      itemType === 'route'
        ? this.gItem.routes
        : itemType === 'waypoint'
        ? this.gItem.waypoints
        : itemType === 'chart'
        ? this.gItem.charts
        : [];

    const idx = items.findIndex((i) => i.id === id);
    if (idx !== -1) {
      items.splice(idx, 1);
    }
  }

  handleClose(save: boolean) {
    if (save) {
      this.data.group.name = this.gItem.name;
      this.data.group.description = this.gItem.description;
      if (this.gItem.routes.length !== 0) {
        this.data.group.routes = this.gItem.routes.map((r) => r.id);
      } else {
        delete this.data.group.routes;
      }
      if (this.gItem.waypoints.length !== 0) {
        this.data.group.waypoints = this.gItem.waypoints.map((w) => w.id);
      } else {
        delete this.data.group.waypoints;
      }
      if (this.gItem.charts.length !== 0) {
        this.data.group.charts = this.gItem.charts.map((c) => c.id);
      } else {
        delete this.data.group.charts;
      }
    }
    this.dialogRef.close({ save: save, group: this.data.group });
  }
}
