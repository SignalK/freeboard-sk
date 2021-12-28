/** Related Notes Dialog Component **
********************************/

import {Component, OnInit, Inject} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AppInfo } from 'src/app/app.info';

/********* RelatedNotesDialog **********
	data: {
        notes: [<SKNote>]
    }
***********************************/
@Component({
	selector: 'ap-relatednotesdialog',
    templateUrl: `relatednotes-dialog.html`,
    styleUrls: ['notes.css']
})
export class RelatedNotesDialog implements OnInit {

    relatedBy:string;

    constructor(
        public app: AppInfo,
        public dialogRef: MatDialogRef<RelatedNotesDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any) {
	}
	
    ngOnInit() { 
        this.relatedBy= this.data.relatedBy[0].toUpperCase() + this.data.relatedBy.slice(1);
    }
    
    openNoteUrl(url:string) { window.open(url, '_notes')}

    addNote() { this.dialogRef.close({result: true, data: 'add'}) }

    editNote(noteId:string) {
        this.dialogRef.close({result: true, data: 'edit', id: noteId});        
    }

    deleteNote(noteId:string) {
        this.dialogRef.close({result: true, data: 'delete', id: noteId});     
    }    

}