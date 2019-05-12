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
	templateUrl: `note-dialog.html`,
    styleUrls: ['notes.css']
})
export class NoteDialog implements OnInit {

    constructor(
        public dialogRef: MatDialogRef<NoteDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any) {
	}
	
    ngOnInit() { 
        if(!this.data.note.properties) { this.data.note.properties= {} }
        if(this.data.note.properties.readOnly) { this.data.editable=false }
    }
    
    openNoteUrl() { window.open(this.data.note.url, '_notes')}
}
