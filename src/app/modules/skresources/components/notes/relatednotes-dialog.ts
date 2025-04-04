/** Related Notes Dialog Component **
 ********************************/

import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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

import { AddTargetPipe } from './safe.pipe';

import { AppFacade } from 'src/app/app.facade';

/********* RelatedNotesDialog **********
	data: {
        notes: [<SKNote>]
    }
***********************************/
@Component({
  selector: 'ap-relatednotesdialog',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatToolbarModule,
    AddTargetPipe
  ],
  templateUrl: `relatednotes-dialog.html`,
  styleUrls: ['notes.css']
})
export class RelatedNotesDialog implements OnInit {
  relatedBy: string;

  constructor(
    public app: AppFacade,
    public dialogRef: MatDialogRef<RelatedNotesDialog>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

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
