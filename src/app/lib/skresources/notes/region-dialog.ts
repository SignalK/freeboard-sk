/** Regions Dialog Component **
********************************/

import {Component, OnInit, Inject} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

/********* RegionDialog **********
	data: {
        notes: [<SKNote>]
    }
***********************************/
@Component({
	selector: 'ap-regiondialog',
	templateUrl: `region-dialog.html`
})
export class RegionDialog implements OnInit {

    constructor(
        public dialogRef: MatDialogRef<RegionDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any) {
	}
	
    ngOnInit() { }
    
    openNoteUrl(url:string) { window.open(url, 'note')}

    addNote() { this.dialogRef.close({result: true, data: 'add'}) }

    editNote(noteId:string) {
        this.dialogRef.close({result: true, data: 'edit', id: noteId});        
    }

    deleteNote(noteId:string) {
        this.dialogRef.close({result: true, data: 'delete', id: noteId});     
    }    

}