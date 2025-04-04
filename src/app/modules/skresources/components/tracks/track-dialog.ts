/** Track Details Dialog Component **
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
import { SKTrack } from '../../resource-classes';

/********* TrackDialog **********
	data: {
    track: SKTrack
  }
***********************************/
@Component({
  selector: 'ap-trackdialog',
  imports: [
    CommonModule,
    FormsModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule
  ],
  template: `
    <div class="_ap-track">
      <div style="display:flex;">
        <div style="padding: 15px 0 0 10px;">
          <mat-icon class="icon-track">show_chart</mat-icon>
        </div>
        <div>
          <h1 mat-dialog-title>Track Details</h1>
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
      ._ap-track {
        min-width: 300px;
      }
    `
  ]
})
export class TrackDialog implements OnInit {
  protected name: string;
  protected description: string;
  protected readOnly = false;

  constructor(
    private dialogRef: MatDialogRef<TrackDialog>,
    @Inject(MAT_DIALOG_DATA)
    protected data: {
      track: SKTrack;
    }
  ) {}

  ngOnInit() {
    this.name = this.data.track.feature?.properties?.name ?? '';
    this.description = this.data.track.feature?.properties?.description ?? '';
    this.readOnly =
      (this.data.track.feature as any)?.properties?.readOnly ?? false;
  }

  handleClose(save: boolean) {
    if (save) {
      this.data.track.feature.properties.name = this.name;
      this.data.track.feature.properties.description = this.description;
    }
    this.dialogRef.close({ save: save, track: this.data.track });
  }
}
