import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/** Asks for a layout name; closes with the trimmed name, or nothing. */
@Component({
  selector: 'layout-name-dialog',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule
  ],
  template: `
    <h1 mat-dialog-title>{{ data.title }}</h1>
    <mat-dialog-content>
      <mat-form-field style="width: 100%">
        <mat-label>Layout name</mat-label>
        <input
          matInput
          cdkFocusInitial
          [(ngModel)]="name"
          (keyup.enter)="ok()"
        />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-raised-button [disabled]="!name.trim()" (click)="ok()">
        Save
      </button>
    </mat-dialog-actions>
  `
})
export class LayoutNameDialog {
  protected dialogRef = inject(MatDialogRef<LayoutNameDialog>);
  protected data = inject<{ title: string; name?: string }>(MAT_DIALOG_DATA);
  protected name = this.data.name ?? '';

  protected ok() {
    if (this.name.trim()) {
      this.dialogRef.close(this.name.trim());
    }
  }
}

export type LayoutConflictChoice = 'overwrite' | 'saveAs' | 'discard';

/**
 * Another screen saved the layout after this one loaded it. Closes with what
 * to do with this screen's changes, or nothing to leave them unsaved.
 */
@Component({
  selector: 'layout-conflict-dialog',
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h1 mat-dialog-title>Layout changed on another screen</h1>
    <mat-dialog-content>
      "{{ data.name }}" was saved on another screen after this screen loaded it.
      Saving now would replace those changes with this screen's.
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-button (click)="dialogRef.close('discard')">
        Discard my changes
      </button>
      <button mat-button (click)="dialogRef.close('saveAs')">
        Save as new
      </button>
      <button mat-raised-button (click)="dialogRef.close('overwrite')">
        Replace
      </button>
    </mat-dialog-actions>
  `
})
export class LayoutConflictDialog {
  protected dialogRef = inject(MatDialogRef<LayoutConflictDialog>);
  protected data = inject<{ name: string }>(MAT_DIALOG_DATA);
}
