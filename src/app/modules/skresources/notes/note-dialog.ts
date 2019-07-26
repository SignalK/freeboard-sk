/** Notes Dialog Component **
********************************/

import {Component, OnInit, Inject} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { AppInfo } from '../../../app.info';

import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';

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

    public Editor = ClassicEditor;

    constructor(
        public app: AppInfo,
        public dialogRef: MatDialogRef<NoteDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any) {
	}
	
    ngOnInit() { 
        if(!this.data.note.properties) { this.data.note.properties= {} }
        if(typeof this.data.note.description ==='undefined') { this.data.note.description= '' }
        if(this.data.note.properties.readOnly) { this.data.editable=false }
    }
    
    openNoteUrl() { window.open(this.data.note.url, '_notes')}
}
