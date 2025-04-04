/** Resource Dialog Components **
 ********************************/

import { Component, OnInit, Inject, ChangeDetectorRef } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA
} from '@angular/material/bottom-sheet';
import { AppFacade } from 'src/app/app.facade';
import { SignalKClient } from 'signalk-client-angular';
import { SKResourceSet } from '../../resourceset-class';

/********* ResourceSetModal **********
 * Fetches ResouorceSets from server for selection
	data: {
        path: "<string>" resource path
        skres: SKResource
    }
***********************************/
@Component({
  selector: 'ap-resourceset-modal',
  imports: [
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatToolbarModule,
    MatCheckboxModule
  ],
  template: `
    <div class="_ap-resource-set">
      <mat-toolbar style="background-color: transparent">
        <span>
          <button
            mat-icon-button
            [disabled]="
              !isResourceSet ||
              app.config.selections.resourceSets[data.path].length === 0
            "
            matTooltip="Clear selections"
            matTooltipPosition="right"
            (click)="clearSelections()"
          >
            <mat-icon>clear_all</mat-icon>
          </button>

          <button
            mat-icon-button
            matTooltip="Fetch resource entries"
            matTooltipPosition="right"
            (click)="getItems()"
          >
            <mat-icon>refresh</mat-icon>
          </button>
        </span>
        <span style="flex: 1 1 auto; padding-left:20px;text-align:center;">
          {{ title }}
        </span>
        <span>
          <button
            mat-icon-button
            (click)="closeModal()"
            matTooltip="Close"
            matTooltipPosition="left"
          >
            <mat-icon>keyboard_arrow_down</mat-icon>
          </button>
        </span>
      </mat-toolbar>
      @for(res of resList; track res; let idx = $index) {
      <mat-card>
        <mat-card-content>
          <div style="display:flex;flex-wrap:no-wrap;">
            <div style="width:45px;">
              <mat-checkbox
                [disabled]="!isResourceSet"
                [checked]="selRes[idx]"
                (change)="handleCheck($event.checked, res.id, idx)"
              ></mat-checkbox>
            </div>
            <div style="flex:1 1 auto;">
              <div class="key-label">
                {{ res.name }}
              </div>
              <div class="key-desc">
                {{ res.description }}
              </div>
            </div>
            <div style="width:45px;"></div>
          </div>
        </mat-card-content>
      </mat-card>
      }
    </div>
  `,
  styles: [
    `
      ._ap-resource-set {
        font-family: arial;
        min-width: 300px;
      }
      ._ap-resource-set .key-label {
        font-weight: 500;
      }
      ._ap-resource-set .key-desc {
        font-style: italic;
      }
    `
  ]
})
export class ResourceSetModal implements OnInit {
  public resList: Array<SKResourceSet>;
  public selRes = [];
  public title = 'Resources: ';
  public isResourceSet = false;

  constructor(
    public app: AppFacade,
    private cdr: ChangeDetectorRef,
    private sk: SignalKClient,
    public modalRef: MatBottomSheetRef<ResourceSetModal>,
    @Inject(MAT_BOTTOM_SHEET_DATA)
    public data: {
      path: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      skres: any;
    }
  ) {}

  ngOnInit() {
    if (this.data.path !== 'undefined') {
      this.title += this.data.path;
    }
    this.getItems();
  }

  closeModal() {
    this.modalRef.dismiss();
  }

  getItems() {
    this.sk.api
      .get(this.app.skApiVersion, `resources/${this.data.path}`)
      .subscribe(
        (resSet) => {
          this.resList = this.data.skres.processItems(resSet);
          this.selRes = [];
          if (
            this.resList.length !== 0 &&
            this.resList[0].type === 'ResourceSet'
          ) {
            this.isResourceSet = true;
            for (let i = 0; i < this.resList.length; i++) {
              this.selRes.push(
                this.app.config.selections.resourceSets[
                  this.data.path
                ].includes(this.resList[i].id)
                  ? true
                  : false
              );
            }
          }
          this.cdr.detectChanges();
        },
        () => {
          this.resList = [];
          this.selRes = [];
          this.cdr.detectChanges();
        }
      );
  }

  handleCheck(checked: boolean, id: string, idx: number) {
    if (!this.isResourceSet) {
      return;
    }
    this.selRes[idx] = checked;
    if (checked) {
      this.app.config.selections.resourceSets[this.data.path].push(id);
    } else {
      const i =
        this.app.config.selections.resourceSets[this.data.path].indexOf(id);
      if (i !== -1) {
        this.app.config.selections.resourceSets[this.data.path].splice(i, 1);
      }
    }
    this.app.saveConfig();
    this.updateItems();
    this.data.skres.resourceSelected();
  }

  clearSelections() {
    if (!this.isResourceSet) {
      return;
    }
    this.selRes = [];
    for (let i = 0; i < this.resList.length; i++) {
      this.selRes[i] = false;
    }
    this.app.config.selections.resourceSets[this.data.path] = [];
    this.app.saveConfig();
    this.updateItems();
    this.data.skres.resourceSelected();
  }

  updateItems() {
    this.app.data.resourceSets[this.data.path] = this.resList.filter((t) => {
      return this.app.config.selections.resourceSets[this.data.path].includes(
        t.id
      )
        ? true
        : false;
    });
  }
}
