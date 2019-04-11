/** Notes Dialog Component **
********************************/

import {Component, OnInit, Inject} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

/********* NoteDialog **********
	data: {
        note: <SKNote>
    }
***********************************/
@Component({
	selector: 'ap-notedialog',
	templateUrl: `note-dialog.html`
})
export class NoteDialog implements OnInit {

    constructor(
        public dialogRef: MatDialogRef<NoteDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any) {
	}
	
    ngOnInit() { }
    
    openNoteUrl() { window.open(this.data.note.url, 'note')}
}
