/** Select Group Dialog Component **
 ********************************/

import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FBResourceGroups, SKResourceGroupService } from './groups.service';

/********* SelectGroupDialog **********/
@Component({
  selector: 'ap-selectgroupdialog',
  imports: [
    CommonModule,
    FormsModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatListModule,
    MatTooltipModule
  ],
  template: `
    <div class="_ap-selgroup">
      <div style="display:flex;">
        <div style="padding: 15px 0 0 10px;">
          <mat-icon>category</mat-icon>
        </div>
        <div>
          <h1 mat-dialog-title>Select Group</h1>
        </div>
      </div>

      <mat-dialog-content>
        <mat-action-list>
          @for(i of this.groups; track i[0]) {
          <button mat-list-item (click)="handleClose(i[0])">
            {{ i[1].name }}
          </button>
          }
        </mat-action-list>
      </mat-dialog-content>
      <mat-dialog-actions>
        <div style="text-align:center;width:100%;">
          <button #btncancel mat-raised-button (click)="handleClose()">
            CANCEL
          </button>
        </div>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      ._ap-selgroup {
        min-width: 300px;
      }
    `
  ]
})
export class SelectGroupDialog implements OnInit {
  protected groups: FBResourceGroups;
  @ViewChild('btncancel', { static: false }) btncancel;

  constructor(
    private dialogRef: MatDialogRef<SelectGroupDialog>,
    private skgroup: SKResourceGroupService
  ) {}

  ngOnInit() {}

  ngAfterContentInit() {
    this.skgroup.listFromServer().then((grps) => {
      this.groups = grps;
    });
    setTimeout(() => this.btncancel.focus(), 400);
  }

  handleClose(groupId?: string) {
    this.dialogRef.close(groupId);
  }
}
