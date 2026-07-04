import { Component, OnInit, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RemarkModule } from 'ngx-remark';
import { AddTargetPipe } from './safe.pipe';

import { AppFacade } from 'src/app/app.facade';
import { SKNote } from '../../resource-classes';
import { ResolveSkIconPipe } from 'src/app/modules/icons';

interface DialogData {
  notes: SKNote[];
  relatedBy: string;
  readOnly: boolean;
}

@Component({
  selector: 'ap-relatednotesdialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatToolbarModule,
    AddTargetPipe,
    RemarkModule,
    ResolveSkIconPipe
  ],
  templateUrl: `relatednotes-dialog.html`,
  styleUrls: ['notes.css']
})
export class RelatedNotesDialog implements OnInit {
  protected relatedBy: string;

  protected data = inject<DialogData>(MAT_DIALOG_DATA);
  protected app = inject(AppFacade);
  protected dialogRef = inject(MatDialogRef<RelatedNotesDialog>);

  constructor() {}

  ngOnInit() {
    this.relatedBy =
      this.data.relatedBy[0].toUpperCase() + this.data.relatedBy.slice(1);
  }

  openNoteUrl(url: string) {
    window.open(url, '_notes');
  }

  addNote() {
    this.dialogRef.close({ result: true, data: 'add' });
  }

  editNote(noteId: string) {
    this.dialogRef.close({ result: true, data: 'edit', id: noteId });
  }

  deleteNote(noteId: string) {
    this.dialogRef.close({ result: true, data: 'delete', id: noteId });
  }
}
