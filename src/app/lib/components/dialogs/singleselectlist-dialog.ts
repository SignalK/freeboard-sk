/** Single Select List Dialog Component **
 ********************************/

import { Component, OnInit, ViewChild, Inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { AppIconDef } from 'src/app/modules/icons';

/********* SingleSelectListDialog *********
 * data: {
    title: string,
    items: [{id: string, name: string}],
    icon: AppIconDef
 * }
 */
@Component({
  selector: 'ap-singleselectlistdialog',
  imports: [
    FormsModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatListModule,
    MatTooltipModule
  ],
  template: `
    <div class="_ap-singlesellist">
      <div style="display:flex;">
        <div style="padding: 15px 0 0 10px;">
          @if (this.data.icon) {
            <mat-icon
              [svgIcon]="this.data.icon.svgIcon"
              [class]="this.data.icon.class"
              >{{ this.data.icon.name }}</mat-icon
            >
          }
        </div>
        <div style="flex: 1 1 auto;">
          <h1 mat-dialog-title>{{ data.title ?? 'Select Item' }}</h1>
        </div>
        <div style="width:50px;padding: 15px 0 0 10px;">
          <button #btncancel mat-icon-button (click)="handleClose()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>

      <mat-dialog-content style="padding-top: 5px;">
        <mat-action-list>
          @for (i of this.data.items; track i.id) {
            <button mat-list-item (click)="handleClose(i)">
              {{ i.name }}
            </button>
          }
        </mat-action-list>
      </mat-dialog-content>
    </div>
  `,
  styles: [
    `
      ._ap-singlesellist {
        min-width: 300px;
      }
    `
  ]
})
export class SingleSelectListDialog implements OnInit {
  @ViewChild('btncancel', { static: false }) btncancel;

  constructor(
    private dialogRef: MatDialogRef<SingleSelectListDialog>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      title: string;
      items: [{ id: string; name: string }];
      icon: AppIconDef;
    }
  ) {}

  ngOnInit() {}

  handleClose(sel?: { id: string; name: string }) {
    this.dialogRef.close(sel);
  }
}
