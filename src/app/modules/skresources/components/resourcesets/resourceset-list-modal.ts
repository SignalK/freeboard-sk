/** Resource Dialog Components **
 ********************************/

import { Component, OnInit, Inject, signal } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA
} from '@angular/material/bottom-sheet';
import { AppFacade } from 'src/app/app.facade';
import { FBCustomResourceService } from '../../custom-resources-service';
import { FBResourceSet, FBResourceSets } from 'src/app/types';

/********* ResourceSetModal **********
 * Fetches ResouorceSets from server for selection
	data: {
        path: "<string>" resource path
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
    MatCheckboxModule,
    MatProgressBarModule
  ],
  template: `
    <div class="_ap-resource-set">
      <mat-toolbar style="background-color: transparent">
        <span>
          <button
            mat-icon-button
            [disabled]="
              app.config.selections.resourceSets[data.path].length === 0
            "
            matTooltip="Clear selections"
            matTooltipPosition="below"
            (click)="clearSelections()"
          >
            <mat-icon>clear_all</mat-icon>
          </button>

          <button
            mat-icon-button
            matTooltip="Refresh list entries"
            matTooltipPosition="below"
            (click)="getItems(true)"
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
            matTooltipPosition="below"
          >
            <mat-icon>keyboard_arrow_down</mat-icon>
          </button>
        </span>
      </mat-toolbar>
      @if (app.sIsFetching()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      } @else {
        @for (res of resList(); track res[0]; let idx = $index) {
          <mat-card>
            <mat-card-content>
              <div style="display:flex;flex-wrap:no-wrap;">
                <div style="width:45px;">
                  <mat-checkbox
                    [checked]="res[2]"
                    (change)="handleCheck($event.checked, res[0], idx)"
                  ></mat-checkbox>
                </div>
                <div style="flex:1 1 auto;">
                  <div class="key-label">
                    {{ res[1].name }}
                  </div>
                  <div class="key-desc">
                    {{ res[1].description }}
                  </div>
                </div>
                <div style="width:45px;"></div>
              </div>
            </mat-card-content>
          </mat-card>
        }
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
  protected resList = signal<FBResourceSets>([]);
  protected title = 'Resources: ';

  constructor(
    public app: AppFacade,
    private skresOther: FBCustomResourceService,
    protected modalRef: MatBottomSheetRef<ResourceSetModal>,
    @Inject(MAT_BOTTOM_SHEET_DATA)
    public data: {
      path: string;
    }
  ) {}

  ngOnInit() {
    if (this.data.path !== 'undefined') {
      this.title += this.data.path;
    }
    this.getItems();
  }

  protected closeModal() {
    this.modalRef.dismiss();
  }

  protected async getItems(silent?: boolean) {
    try {
      if (!silent) {
        this.app.sIsFetching.set(true);
      }
      const list = await this.skresOther.customListFromServer<FBResourceSet>(
        this.data.path,
        'ResourceSet'
      );
      this.app.sIsFetching.set(false);
      this.resList.set(list);
    } catch (err) {
      this.app.sIsFetching.set(false);
      this.resList.set([]);
    }
  }

  protected handleCheck(checked: boolean, id: string, idx: number) {
    this.resList.update((current) => {
      current[idx][2] = checked;
      if (checked) {
        this.app.config.selections.resourceSets[this.data.path].push(id);
      } else {
        const i =
          this.app.config.selections.resourceSets[this.data.path].indexOf(id);
        if (i !== -1) {
          this.app.config.selections.resourceSets[this.data.path].splice(i, 1);
        }
      }
      return [].concat(current);
    });
    this.app.saveConfig();
    this.skresOther.refreshResourceSetsInBounds(this.data.path);
  }

  protected clearSelections() {
    this.resList.update((current) => {
      current.forEach((i) => (i[2] = false));
      return current;
    });
    this.app.config.selections.resourceSets[this.data.path] = [];
    this.app.saveConfig();
    this.skresOther.refreshResourceSetsInBounds(this.data.path);
  }
}
