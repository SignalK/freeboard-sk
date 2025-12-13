/** Resource Group Details Dialog Component **
 ********************************/

import { Component, OnInit, Inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialog
} from '@angular/material/dialog';
import { SKResourceGroup } from './groups.service';
import { SKResourceService, SKResourceType } from '../../resources.service';
import { FBChart, FBRegion, FBRoute, FBWaypoint } from 'src/app/types';
import { MultiSelectListDialog } from 'src/app/lib/components';
import { AppIconDef } from 'src/app/modules/icons';

/********* ResourceGroupDialog **********
	data: {
    addMode: true= new group, false edit group
    group: SKResourceGroup
  }
***********************************/

interface RListEntry {
  id: string;
  name: string;
}

@Component({
  selector: 'ap-resourcegroupdialog',
  imports: [
    FormsModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatTabsModule,
    MatListModule,
    MatTooltipModule,
    MatCheckboxModule
  ],
  template: `
    <div class="_ap-group">
      <div style="display:flex;widht:100%;">
        <div style="padding: 15px 0 0 10px;">
          <mat-icon>category</mat-icon>
        </div>
        <div style="flex: 1 1 auto;">
          <h1 mat-dialog-title>
            {{ this.data.addMode ? 'New Group' : 'Group Information' }}
          </h1>
        </div>
        <div style="padding: 15px 0 0 0;width:90px;">
          <button
            mat-raised-button
            [disabled]="selTab === 0"
            (click)="addResources()"
            matTooltip="Add Resource"
          >
            ADD
          </button>
        </div>
      </div>

      <mat-dialog-content>
        <mat-tab-group
          dynamicHeight="false"
          (selectedTabChange)="tabSelected($event.index)"
        >
          <mat-tab label="Details">
            <div style="padding-top: 10px;">
              <div>
                <mat-form-field floatLabel="always" style="width:100%">
                  <mat-label>Name</mat-label>
                  <input
                    matInput
                    #inpname="ngModel"
                    type="text"
                    required
                    [(ngModel)]="gItem.name"
                  />
                  @if (inpname.invalid && (inpname.dirty || inpname.touched)) {
                    <mat-error> Please enter a name.</mat-error>
                  }
                </mat-form-field>
              </div>
              <div>
                <mat-form-field floatLabel="always" style="width:100%">
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
          @if (!this.data.addMode) {
            <mat-tab label="Routes">
              @if (!gItem.routes.length) {
                <mat-checkbox
                  [checked]="mask.routes"
                  (change)="mask.routes = $event.checked"
                  >Hide routes.</mat-checkbox
                >
              }
              <mat-list>
                @for (i of gItem.routes; track i.id) {
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
              @if (!gItem.waypoints.length) {
                <mat-checkbox
                  [checked]="mask.waypoints"
                  (change)="mask.waypoints = $event.checked"
                  >Hide waypoints.</mat-checkbox
                >
              }
              <mat-list>
                @for (i of gItem.waypoints; track i.id) {
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

            <mat-tab label="Regions">
              @if (!gItem.regions.length) {
                <mat-checkbox
                  [checked]="mask.regions"
                  (change)="mask.regions = $event.checked"
                  >Hide regions.</mat-checkbox
                >
              }
              <mat-list>
                @for (i of gItem.regions; track i.id) {
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
                          (click)="removeItem('region', i.id)"
                        >
                          <mat-icon class="icon-warn">delete</mat-icon>
                        </button>
                      </div>
                    </div>
                  </mat-list-item>
                }
              </mat-list>
            </mat-tab>

            <mat-tab label="Charts">
              <mat-list>
                @for (i of gItem.charts; track i.id) {
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
            </mat-tab>
          }
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
  protected selTab = 0;
  protected wpts: RListEntry[] = [];
  protected rtes: RListEntry[] = [];
  protected regions: RListEntry[] = [];
  protected charts: RListEntry[] = [];
  protected mask = {
    routes: false,
    waypoints: false,
    regions: false,
    charts: false
  };

  constructor(
    private dialogRef: MatDialogRef<ResourceGroupDialog>,
    private skres: SKResourceService,
    protected dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA)
    protected data: {
      addMode: boolean;
      group: SKResourceGroup;
    }
  ) {}

  ngOnInit() {
    this.gItem = {
      name: this.data.group.name ?? '',
      description: this.data.group.description ?? '',
      routes: [],
      waypoints: [],
      regions: [],
      charts: []
    };
  }

  ngAfterViewInit() {
    this.mask.routes = this.data.group.routes ? true : false;
    this.skres.listFromServer<FBRoute>('routes').then((r) => {
      if (this.data.group.routes) {
        r.forEach((rte) => {
          if (this.data.group.routes.includes(rte[0])) {
            this.gItem.routes.push({ id: rte[0], name: rte[1].name });
          }
        });
        this.sortIt(this.gItem.routes);
      }
    });
    this.mask.waypoints = this.data.group.waypoints ? true : false;
    this.skres.listFromServer<FBWaypoint>('waypoints').then((w) => {
      if (this.data.group.waypoints) {
        w.forEach((wpt) => {
          if (this.data.group.waypoints.includes(wpt[0])) {
            this.gItem.waypoints.push({ id: wpt[0], name: wpt[1].name });
          }
        });
        this.sortIt(this.gItem.waypoints);
      }
    });
    this.mask.regions = this.data.group.regions ? true : false;
    this.skres.listFromServer<FBRegion>('regions').then((c) => {
      if (this.data.group.regions) {
        c.forEach((region) => {
          if (this.data.group.regions.includes(region[0])) {
            this.gItem.regions.push({ id: region[0], name: region[1].name });
          }
        });
        this.sortIt(this.gItem.regions);
      }
    });
    this.skres.listFromServer<FBChart>('charts').then((c) => {
      if (this.data.group.charts) {
        c.forEach((cht) => {
          if (this.data.group.charts.includes(cht[0])) {
            this.gItem.charts.push({ id: cht[0], name: cht[1].name });
          }
        });
        this.sortIt(this.gItem.charts);
      }
    });

    this.bgLoadResources();
  }

  removeItem(itemType: string, id: string) {
    const items =
      itemType === 'route'
        ? this.gItem.routes
        : itemType === 'waypoint'
          ? this.gItem.waypoints
          : itemType === 'region'
            ? this.gItem.regions
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
        if (this.mask.routes) {
          this.data.group.routes = [];
        } else {
          delete this.data.group.routes;
        }
      }
      if (this.gItem.waypoints.length !== 0) {
        this.data.group.waypoints = this.gItem.waypoints.map((w) => w.id);
      } else {
        if (this.mask.waypoints) {
          this.data.group.waypoints = [];
        } else {
          delete this.data.group.waypoints;
        }
      }
      if (this.gItem.regions.length !== 0) {
        this.data.group.regions = this.gItem.regions.map((r) => r.id);
      } else {
        if (this.mask.regions) {
          this.data.group.regions = [];
        } else {
          delete this.data.group.regions;
        }
      }
      if (this.gItem.charts.length !== 0) {
        this.data.group.charts = this.gItem.charts.map((c) => c.id);
      } else {
        delete this.data.group.charts;
      }
    }
    this.dialogRef.close({ save: save, group: this.data.group });
  }

  /**
   * Handle tab selection change
   * @param index Selected tab index
   */
  tabSelected(index: number) {
    this.selTab = index;
  }

  /**
   * Sort the resource list
   * @param l Resource list
   * @returns Reference to sorted list
   */
  sortIt(l: RListEntry[]) {
    return l.sort((a, b) => {
      const x = a.name?.toLowerCase();
      const y = b.name?.toLowerCase();
      return x > y ? 1 : -1;
    });
  }

  /**
   * Display list of resources for selection to add
   */
  addResources() {
    let lTitle: string;
    let icon: AppIconDef;
    let rList: RListEntry[];

    if (this.selTab === 1) {
      lTitle = 'Routes';
      icon = { svgIcon: 'route', class: 'ob' };
      const rteIds = this.gItem.routes.map((i) => i.id);
      rList = this.rtes.filter((i) => !rteIds.includes(i.id));
    }
    if (this.selTab === 2) {
      lTitle = 'Waypoints';
      icon = { name: 'location_on' };
      const wptIds = this.gItem.waypoints.map((i) => i.id);
      rList = this.wpts.filter((i) => !wptIds.includes(i.id));
    }
    if (this.selTab === 3) {
      lTitle = 'Regions';
      icon = { name: 'tab_unselected' };
      const regIds = this.gItem.regions.map((i) => i.id);
      rList = this.regions.filter((i) => !regIds.includes(i.id));
    }
    if (this.selTab === 4) {
      lTitle = 'Charts';
      icon = { name: 'map' };
      const chtIds = this.gItem.charts.map((i) => i.id);
      rList = this.charts.filter((i) => !chtIds.includes(i.id));
    }

    this.dialog
      .open(MultiSelectListDialog, {
        data: {
          title: `Select ${lTitle}`,
          icon: icon,
          items: this.sortIt(rList)
        }
      })
      .afterClosed()
      .subscribe((items: RListEntry[]) => {
        if (items) {
          // routes
          if (this.selTab === 1) {
            this.gItem.routes = [].concat(this.gItem.routes, items);
            this.sortIt(this.gItem.routes);
          }
          // waypoints
          if (this.selTab === 2) {
            this.gItem.waypoints = [].concat(this.gItem.waypoints, items);
            this.sortIt(this.gItem.waypoints);
          }
          // regions
          if (this.selTab === 3) {
            this.gItem.regions = [].concat(this.gItem.regions, items);
            this.sortIt(this.gItem.regions);
          }
          // charts
          if (this.selTab === 4) {
            this.gItem.charts = [].concat(this.gItem.charts, items);
            this.sortIt(this.gItem.charts);
          }
        }
      });
  }

  /**
   * Background load resource lists
   */
  bgLoadResources() {
    ['routes', 'waypoints', 'regions', 'charts'].forEach((g) => {
      this.skres.listFromServer(g as SKResourceType).then((entries) => {
        const l = entries.map((i) => {
          return { id: i[0], name: i[1].name };
        });
        if (g === 'routes') this.rtes = l;
        else if (g === 'waypoints') this.wpts = l;
        else if (g === 'regions') this.regions = l;
        else if (g === 'charts') this.charts = l;
      });
    });
  }
}
