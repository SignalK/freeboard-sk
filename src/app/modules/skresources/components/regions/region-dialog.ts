import { Component, OnInit, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatToolbarModule } from '@angular/material/toolbar';
import { SKRegion } from '../../resource-classes';

interface DialogData {
  region: SKRegion;
}

@Component({
  selector: 'ap-regiondialog',
  imports: [
    FormsModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatToolbarModule,
    MatCheckbox
  ],
  template: `
    <div class="_ap-region">
      <mat-toolbar style="background-color: transparent">
        <div>
          <mat-icon class="icon-region">tab_unselected</mat-icon>
        </div>
        <span style="flex: 1 1 auto; text-align: center;">Region Details</span>
        <div style="width: 50px;text-align:right;">
          <button mat-icon-button (click)="handleClose(false)">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </mat-toolbar>

      <mat-dialog-content>
        <div style="display: flex">
          <div style="flex: 1 1 auto">
            <div>
              <mat-form-field floatLabel="always" style="width:100%">
                <mat-label>Name</mat-label>
                <input
                  matInput
                  #inpname="ngModel"
                  type="text"
                  required
                  [readonly]="readOnly"
                  [(ngModel)]="name"
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
                  [readonly]="readOnly"
                  [(ngModel)]="description"
                >
                </textarea>
              </mat-form-field>
            </div>
            <div>
              <mat-checkbox
                [checked]="isHazard"
                (change)="doHazard($event.checked)"
                >Hazardous Area (Alarm)
              </mat-checkbox>
            </div>
          </div>
        </div>
      </mat-dialog-content>
      @if (!readOnly) {
        <mat-dialog-actions align="end">
          <button
            mat-flat-button
            [disabled]="inpname.invalid || readOnly"
            (click)="handleClose(true)"
          >
            SAVE
          </button>
        </mat-dialog-actions>
      }
    </div>
  `,
  styles: [
    `
      ._ap-region {
        min-width: 300px;
      }
    `
  ]
})
export class RegionDialog implements OnInit {
  protected name: string;
  protected description: string;
  protected isHazard: boolean;
  protected readOnly = false;

  private dialogRef = inject(MatDialogRef<RegionDialog>);
  protected data = inject<DialogData>(MAT_DIALOG_DATA);

  constructor() {}

  ngOnInit() {
    this.name = this.data.region.name ?? '';
    this.description = this.data.region.description ?? '';
    this.isHazard =
      (this.data.region.feature as any).properties?.skIcon === 'hazard';
    this.readOnly =
      (this.data.region.feature as any)?.properties?.readOnly ?? false;
  }

  protected doHazard(checked: boolean) {
    this.isHazard = checked;
  }

  protected handleClose(save: boolean) {
    if (save) {
      this.data.region.name = this.name;
      this.data.region.description = this.description;
      if (this.isHazard) {
        (this.data.region.feature as any).properties.skIcon = 'hazard';
      } else {
        delete (this.data.region.feature as any).properties.skIcon;
      }
    }
    this.dialogRef.close({ save: save, region: this.data.region });
  }
}
