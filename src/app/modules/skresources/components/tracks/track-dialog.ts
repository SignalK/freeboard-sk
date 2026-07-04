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
import { SKTrack } from '../../resource-classes';
import { MatToolbarModule } from '@angular/material/toolbar';

interface DialogData {
  track: SKTrack;
}

@Component({
  selector: 'ap-trackdialog',
  imports: [
    FormsModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatToolbarModule
  ],
  template: `
    <div class="_ap-track">
      <mat-toolbar style="background-color: transparent">
        <span class="dialog-icon"
          ><mat-icon class="icon-track">show_chart</mat-icon></span
        >
        <span style="flex: 1 1 auto; text-align: center">Track Details</span>
        <span style="text-align: right">
          <button mat-icon-button (click)="handleClose(false)">
            <mat-icon>close</mat-icon>
          </button>
        </span>
      </mat-toolbar>

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
                @if (inpname.invalid && (inpname.dirty || inpname.touched)) {
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

      @if (!readOnly) {
        <mat-dialog-actions align="right">
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

  protected data = inject<DialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<TrackDialog>);

  constructor() {}

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
      this.data.track.name = this.name;
      this.data.track.description = this.description;
    }
    this.dialogRef.close({ save: save, track: this.data.track });
  }
}
