/** Region Details Dialog Component **
 ********************************/

import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { SKRegion } from '../../resource-classes';

/********* RegionDialog **********
	data: {
    region: SKRegion
  }
***********************************/
@Component({
  selector: 'ap-regiondialog',
  imports: [
    CommonModule,
    FormsModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule
  ],
  template: `
    <div class="_ap-region">
      <div style="display:flex;">
        <div style="padding: 15px 0 0 10px;">
          <mat-icon class="icon-region">tab_unselected</mat-icon>
        </div>
        <div>
          <h1 mat-dialog-title>Region Details</h1>
        </div>
      </div>

      <mat-dialog-content>
        <div>
          <div style="padding-left: 10px;">
            <div>
              <mat-form-field floatLabel="always">
                <mat-label>Name</mat-label>
                <input
                  matInput
                  #inpname="ngModel"
                  type="text"
                  required
                  [readonly]="readOnly"
                  [(ngModel)]="name"
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
                  [readonly]="readOnly"
                  [(ngModel)]="description"
                >
                </textarea>
              </mat-form-field>
            </div>
          </div>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions>
        <div style="text-align:center;width:100%;">
          @if(!readOnly) {
          <button
            mat-raised-button
            [disabled]="inpname.invalid || readOnly"
            (click)="handleClose(true)"
          >
            SAVE
          </button>
          }
          <button mat-raised-button (click)="handleClose(false)">CANCEL</button>
        </div>
      </mat-dialog-actions>
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
  protected readOnly = false;

  constructor(
    private dialogRef: MatDialogRef<RegionDialog>,
    @Inject(MAT_DIALOG_DATA)
    protected data: {
      region: SKRegion;
    }
  ) {}

  ngOnInit() {
    this.name = this.data.region.name ?? '';
    this.description = this.data.region.description ?? '';
    this.readOnly =
      (this.data.region.feature as any)?.properties?.readOnly ?? false;
  }

  handleClose(save: boolean) {
    if (save) {
      this.data.region.name = this.name;
      this.data.region.description = this.description;
    }
    this.dialogRef.close({ save: save, region: this.data.region });
  }
}
