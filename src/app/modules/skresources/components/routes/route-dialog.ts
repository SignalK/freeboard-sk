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
import { SKRoute } from '../../resource-classes';
import { MatToolbarModule } from '@angular/material/toolbar';

interface DialogData {
  route: SKRoute;
}

@Component({
  selector: 'ap-routedialog',
  imports: [
    FormsModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatToolbarModule
  ],
  template: `
    <div class="_ap-route">
      <mat-toolbar style="background-color: transparent">
        <div>
          <mat-icon class="icon-route" svgIcon="route"></mat-icon>
        </div>
        <span style="flex: 1 1 auto; text-align: center;">Route Details</span>
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
              <mat-form-field floatLabel="always" style="width: 100%">
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
              <mat-form-field floatLabel="always" style="width: 100%">
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
      ._ap-route {
        min-width: 300px;
      }
    `
  ]
})
export class RouteDialog implements OnInit {
  protected name: string;
  protected description: string;
  protected readOnly = false;

  private dialogRef = inject(MatDialogRef<RouteDialog>);
  protected data = inject<DialogData>(MAT_DIALOG_DATA);

  constructor() {}

  ngOnInit() {
    this.name = this.data.route.name ?? '';
    this.description = this.data.route.description ?? '';
    this.readOnly =
      (this.data.route.feature as any)?.properties?.readOnly ?? false;
  }

  handleClose(save: boolean) {
    if (save) {
      this.data.route.name = this.name;
      this.data.route.description = this.description;
    }
    this.dialogRef.close({ save: save, route: this.data.route });
  }
}
